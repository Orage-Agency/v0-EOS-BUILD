import { ProfileShell } from "@/components/people/profile-shell"
import { listWorkspaceMembers } from "@/lib/people-server"
import { USERS, type MockUser } from "@/lib/mock-data"
import type { Role } from "@/types/permissions"
import { requireUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

// Cookie-dependent auth via requireUser → render at request time only.
export const dynamic = "force-dynamic"

const AVATAR_COLORS = ["geo", "bro", "bar", "ivy"] as const

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return "??"
  if (parts.length === 1) return (parts[0].slice(0, 2) || "??").toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function colorForId(id: string): (typeof AVATAR_COLORS)[number] {
  return AVATAR_COLORS[id.charCodeAt(id.length - 1) % AVATAR_COLORS.length]
}

async function resolveRealUser(
  workspaceSlug: string,
  userId: string,
): Promise<MockUser | undefined> {
  // Step 1: try the active workspace member list.
  const members = await listWorkspaceMembers(workspaceSlug)
  const m = members.find((x) => x.id === userId)
  if (m) {
    return {
      id: m.id,
      name: m.name,
      initials: deriveInitials(m.name),
      email: m.email,
      role: m.role as Role,
      isMaster: m.isMaster,
      color: colorForId(m.id),
    }
  }

  // Step 2: if the user is in the workspace memberships table at all
  // (any status), look up their profile directly. Handles suspended /
  // pending members + cases where the workspace_memberships join races.
  try {
    const me = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()
    const { data: ms } = await sb
      .from("workspace_memberships")
      .select("user_id, role")
      .eq("workspace_id", me.workspaceId)
      .eq("user_id", userId)
      .maybeSingle()
    if (!ms) return undefined
    const { data: p } = await sb
      .from("profiles")
      .select("id, full_name, email, is_master")
      .eq("id", (ms as { user_id: string }).user_id)
      .maybeSingle()
    if (!p) return undefined
    const profile = p as {
      id: string
      full_name: string | null
      email: string
      is_master: boolean
    }
    const name = profile.full_name ?? profile.email
    return {
      id: profile.id,
      name,
      initials: deriveInitials(name),
      email: profile.email,
      role: (ms as { role: string }).role as Role,
      isMaster: profile.is_master,
      color: colorForId(profile.id),
    }
  } catch (err) {
    console.error("[v0] PersonPage profile lookup failed", err)
    return undefined
  }
}

export default async function PersonPage({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>
}) {
  const { workspace, id } = await params

  const real = await resolveRealUser(workspace, id)
  const mock = USERS.find((u) => u.id === id)
  const user = real ?? mock

  return <ProfileShell userId={id} initialUser={user} />
}
