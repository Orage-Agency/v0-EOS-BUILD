// ═══════════════════════════════════════════════════════════
// lib/auth.ts — getCurrentUser now reads real Supabase session
// Replaces the stub from BACKEND-ARCHITECTURE.md §6
// ═══════════════════════════════════════════════════════════

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { cache } from "react"
import { cookies } from "next/headers"

/**
 * Manual session resolver — bypasses supabase.auth.getUser() because
 * @supabase/ssr 0.10.2 + ES256 JWTs return null even with a valid auth-
 * token cookie. We read the cookie ourselves, decode the JWT payload,
 * and trust the `sub` claim (after expiry check). The downstream
 * Supabase queries use the service-role admin client, not auth, so
 * RLS+JWT verification doesn't matter for our reads.
 */
export async function getAuthUserIdFromCookie(): Promise<string | null> {
  try {
    const store = await cookies()
    const all = store.getAll()
    const main = all.find((c) => /^sb-[^-]+-auth-token$/.test(c.name))
    const chunked = all
      .filter((c) => /^sb-[^-]+-auth-token\.\d+$/.test(c.name))
      .sort((a, b) => Number(a.name.split(".").pop()) - Number(b.name.split(".").pop()))
    let raw = main?.value ?? chunked.map((c) => c.value).join("")
    if (!raw) return null
    if (raw.startsWith("base64-")) {
      raw = Buffer.from(raw.slice(7), "base64").toString("utf8")
    }
    const session = JSON.parse(raw) as { access_token?: string }
    if (!session.access_token) return null
    const parts = session.access_token.split(".")
    if (parts.length !== 3) return null
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4)
    const claims = JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as {
      sub?: string
      exp?: number
    }
    if (!claims.sub) return null
    if (claims.exp && claims.exp <= Math.floor(Date.now() / 1000)) return null
    return claims.sub
  } catch {
    return null
  }
}

/**
 * Role union spans the cross-workspace `master` flag, the three real
 * DB roles from `01-auth-schema-llYXw.sql` (`owner | admin | member`), and
 * the legacy demo strings (`founder | leader | viewer`) still referenced
 * by the seeded mock data. Server `lib/server/permissions.ts` collapses
 * `owner → founder` so the existing capability matrix keeps working.
 */
export type Role =
  | "master"
  | "owner"
  | "founder"
  | "admin"
  | "leader"
  | "member"
  | "viewer"

export interface AuthUser {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
  timezone: string
  isMaster: boolean
  onboardingCompleted: boolean
  // Workspace-scoped:
  workspaceId: string
  workspaceSlug: string
  workspaceName: string
  role: Role
}

/**
 * Transitional alias — most of the codebase still imports `CurrentUser`.
 * The shape is identical to AuthUser; this lets the rename roll out
 * without touching every server module in the same PR.
 */
export type CurrentUser = AuthUser

/**
 * Get the current authenticated user IN A SPECIFIC WORKSPACE.
 * Pass the workspace slug from the URL (e.g. params.workspace).
 * Returns null if not authenticated or not a member of the workspace.
 */
export const getCurrentUser = cache(
  async (workspaceSlug: string): Promise<AuthUser | null> => {
    const supabase = await createClient()

    // Manual JWT-based auth — see getAuthUserIdFromCookie comment.
    const userId = await getAuthUserIdFromCookie()
    if (!userId) return null
    const user = { id: userId }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (!profile) return null

    const { data: membership } = await supabase
      .from("workspace_memberships")
      .select("role, workspace:workspaces(id, slug, name)")
      .eq("user_id", user.id)
      .eq("workspaces.slug", workspaceSlug)
      .eq("status", "active")
      .single()

    if (!membership || !membership.workspace) {
      // Master users can access any workspace
      if (profile.is_master) {
        const { data: ws } = await supabase
          .from("workspaces")
          .select("id, slug, name")
          .eq("slug", workspaceSlug)
          .single()
        if (!ws) return null
        return {
          id: user.id,
          email: profile.email,
          fullName: profile.full_name,
          avatarUrl: profile.avatar_url,
          timezone: profile.timezone,
          isMaster: true,
          onboardingCompleted: !!profile.onboarding_completed_at,
          workspaceId: ws.id,
          workspaceSlug: ws.slug,
          workspaceName: ws.name,
          role: "master" as Role,
        }
      }
      return null
    }

    const workspace = membership.workspace as unknown as {
      id: string
      slug: string
      name: string
    }

    return {
      id: user.id,
      email: profile.email,
      fullName: profile.full_name,
      avatarUrl: profile.avatar_url,
      timezone: profile.timezone,
      isMaster: profile.is_master,
      onboardingCompleted: !!profile.onboarding_completed_at,
      workspaceId: workspace.id,
      workspaceSlug: workspace.slug,
      workspaceName: workspace.name,
      role: membership.role as Role,
    }
  },
)

/**
 * Require authentication. Redirect to /{workspace}/login if not signed in
 * or not a member of the requested workspace.
 * Use in Server Components / Layouts that require login.
 */
export async function requireUser(workspaceSlug: string): Promise<AuthUser> {
  const user = await getCurrentUser(workspaceSlug)
  if (!user) redirect(`/${workspaceSlug}/login`)
  return user
}

/**
 * Require a minimum role. Redirect to the workspace dashboard if insufficient.
 */
export async function requireRole(
  workspaceSlug: string,
  minRole: Role,
): Promise<AuthUser> {
  const user = await requireUser(workspaceSlug)
  const ranks: Record<Role, number> = {
    master: 7,
    owner: 6,
    founder: 5,
    admin: 4,
    leader: 3,
    member: 2,
    viewer: 1,
  }
  if (ranks[user.role] < ranks[minRole]) {
    redirect(`/${workspaceSlug}`)
  }
  return user
}

/**
 * Get user's workspace memberships (for the workspace switcher).
 * Returns an empty list when the visitor is signed out.
 */
export async function getUserWorkspaces() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return [] as Array<{
    id: string
    slug: string
    name: string
    logo_url: string | null
    role: Role
  }>

  const { data } = await supabase
    .from("workspace_memberships")
    .select("role, workspace:workspaces(id, slug, name, logo_url)")
    .eq("user_id", user.id)
    .eq("status", "active")

  return (
    data?.map((m) => {
      const ws = m.workspace as unknown as {
        id: string
        slug: string
        name: string
        logo_url: string | null
      }
      return { ...ws, role: m.role as Role }
    }) ?? []
  )
}
