import { DirectoryShell } from "@/components/people/directory-shell"
import type { WorkspaceMember } from "@/lib/people-server"
import { requireUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

// Reads the authenticated user via cookies → must run at request time.
export const dynamic = "force-dynamic"

/**
 * Direct copy of the AI tool's read_people pattern (which is verified
 * working in production) so the People page can never silently fall
 * back to USERS mock.
 */
async function loadMembers(workspaceSlug: string): Promise<WorkspaceMember[]> {
  try {
    const me = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()
    const { data: memberships, error: mErr } = await sb
      .from("workspace_memberships")
      .select("user_id, role")
      .eq("workspace_id", me.workspaceId)
      .eq("status", "active")
    if (mErr) {
      console.error("[v0] PeoplePage memberships error", mErr.message)
      return []
    }
    const rows = (memberships ?? []) as Array<{
      user_id: string
      role: string
    }>
    if (rows.length === 0) return []
    const ids = rows.map((r) => r.user_id).filter(Boolean)
    const { data: profiles, error: pErr } = await sb
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids)
    if (pErr) {
      console.error("[v0] PeoplePage profiles error", pErr.message)
      return []
    }
    const byId = new Map(
      ((profiles ?? []) as Array<{ id: string; full_name: string | null; email: string }>).map(
        (p) => [p.id, p],
      ),
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
          avatarUrl: null,
          isMaster: false,
          joinedAt: null,
        } satisfies WorkspaceMember,
      ]
    })
  } catch (err) {
    console.error("[v0] PeoplePage load failed", err)
    return []
  }
}

export default async function PeoplePage({
  params,
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace } = await params
  const members = await loadMembers(workspace)
  return <DirectoryShell initialMembers={members} />
}
