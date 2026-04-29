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

    const { data, error } = await sb
      .from("workspace_memberships")
      .select(`
        role,
        created_at,
        user:profiles(id, full_name, email, avatar_url, is_master)
      `)
      .eq("workspace_id", user.workspaceId)
      .eq("status", "active")

    if (error) {
      console.error("[v0] listWorkspaceMembers error", error.message)
      return []
    }

    return ((data ?? []) as unknown as Array<{
      role: string
      created_at: string | null
      user: { id: string; full_name: string | null; email: string; avatar_url: string | null; is_master: boolean } | null
    }>)
      .filter((m) => m.user !== null)
      .map((m) => ({
        id: m.user!.id,
        name: m.user!.full_name ?? m.user!.email,
        email: m.user!.email,
        role: m.role,
        avatarUrl: m.user!.avatar_url,
        isMaster: m.user!.is_master,
        joinedAt: m.created_at,
      }))
  } catch (err) {
    console.error("[v0] listWorkspaceMembers exception", err)
    return []
  }
}
