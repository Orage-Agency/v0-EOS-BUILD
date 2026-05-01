/**
 * Orage Core · People server-side data helpers
 * Server-only. Reads workspace members from profiles + workspace_memberships.
 */
import "server-only"

import { requireUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

export type WorkspaceMember = {
  id: string
  name: string
  email: string
  role: string
  avatarUrl: string | null
  isMaster: boolean
  joinedAt: string | null
}

export async function listWorkspaceMembers(workspaceSlug: string): Promise<WorkspaceMember[]> {
  const user = await requireUser(workspaceSlug)
  try {
    const sb = supabaseAdmin()

    // Two-step query — Supabase's PostgREST relationship resolution
    // (`user:profiles(...)`) returns 400 when the FK between
    // workspace_memberships.user_id and profiles.id isn't reliably
    // exposed in the schema cache. Fetch memberships, then profiles
    // by id IN (...) so we don't depend on the alias.
    const { data: memberships, error: mErr } = await sb
      .from("workspace_memberships")
      .select("user_id, role, created_at")
      .eq("workspace_id", user.workspaceId)
      .eq("status", "active")
    if (mErr) {
      console.error("[v0] listWorkspaceMembers memberships error", mErr.message)
      return []
    }

    const rows = (memberships ?? []) as Array<{
      user_id: string
      role: string
      created_at: string | null
    }>
    if (rows.length === 0) return []

    const ids = rows.map((r) => r.user_id).filter(Boolean)
    const { data: profiles, error: pErr } = await sb
      .from("profiles")
      .select("id, full_name, email, avatar_url, is_master")
      .in("id", ids)
    if (pErr) {
      console.error("[v0] listWorkspaceMembers profiles error", pErr.message)
      return []
    }
    const byId = new Map(
      ((profiles ?? []) as Array<{
        id: string
        full_name: string | null
        email: string
        avatar_url: string | null
        is_master: boolean
      }>).map((p) => [p.id, p]),
    )

    return rows.flatMap((m) => {
      const p = byId.get(m.user_id)
      if (!p) return []
      return [
        {
          id: p.id,
          name: p.full_name ?? p.email,
          email: p.email,
          role: m.role,
          avatarUrl: p.avatar_url,
          isMaster: p.is_master,
          joinedAt: m.created_at,
        },
      ]
    })
  } catch (err) {
    console.error("[v0] listWorkspaceMembers exception", err)
    return []
  }
}
