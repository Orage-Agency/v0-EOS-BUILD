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
    // Only select columns we know exist across environments. created_at
    // has been observed as missing on the deployed workspace_memberships
    // table — including it 400s the whole query.
    const { data: memberships, error: mErr } = await sb
      .from("workspace_memberships")
      .select("user_id, role")
      .eq("workspace_id", user.workspaceId)
      .eq("status", "active")
    if (mErr) {
      console.error("[v0] listWorkspaceMembers memberships error", mErr.message)
      return []
    }

    const rows = (memberships ?? []) as Array<{
      user_id: string
      role: string
    }>
    if (rows.length === 0) return []

    const ids = rows.map((r) => r.user_id).filter(Boolean)
    // Only select columns we know exist across environments. avatar_url
    // and is_master have been observed missing on the deployed `profiles`
    // table — including them caused the whole select to 400 and the page
    // fell back to the USERS mock. Resolve those fields per-row below.
    const { data: profiles, error: pErr } = await sb
      .from("profiles")
      .select("id, full_name, email")
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
      }>).map((p) => [p.id, p]),
    )

    // Best-effort enrichment: try to pull avatar_url + is_master in
    // separate queries; if the column is missing the request 400s and
    // we just skip — the row still renders with defaults.
    let avatarById = new Map<string, string | null>()
    let masterById = new Map<string, boolean>()
    try {
      const { data: avatars } = await sb
        .from("profiles")
        .select("id, avatar_url")
        .in("id", ids)
      avatarById = new Map(
        ((avatars ?? []) as Array<{ id: string; avatar_url: string | null }>).map(
          (r) => [r.id, r.avatar_url],
        ),
      )
    } catch {
      /* ignore — column missing */
    }
    try {
      const { data: masters } = await sb
        .from("profiles")
        .select("id, is_master")
        .in("id", ids)
      masterById = new Map(
        ((masters ?? []) as Array<{ id: string; is_master: boolean }>).map((r) => [
          r.id,
          !!r.is_master,
        ]),
      )
    } catch {
      /* ignore — column missing */
    }

    return rows.flatMap((m) => {
      const p = byId.get(m.user_id)
      if (!p) return []
      return [
        {
          id: p.id,
          name: p.full_name ?? p.email,
          email: p.email,
          role: m.role,
          avatarUrl: avatarById.get(p.id) ?? null,
          isMaster: masterById.get(p.id) ?? false,
          joinedAt: null,
        },
      ]
    })
  } catch (err) {
    console.error("[v0] listWorkspaceMembers exception", err)
    return []
  }
}
