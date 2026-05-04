/**
 * Cross-workspace client tags.
 *
 * Surfaces the set of *other* workspaces the current user is a member of —
 * the agency owner sees their client workspaces (Quintessa, Boomer, OKC,
 * Bobby Schneider) and can tag tasks/rocks inside their primary workspace
 * with one of those clients. Tags are private to the parent workspace;
 * setting a tag does NOT make the row visible to the client workspace.
 *
 * Single-workspace users get an empty list — the picker hides itself for
 * them, which is the right UX for an end client whose dashboard should
 * never look like an agency console.
 */

import "server-only"
import { requireUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

export type ClientTagOption = {
  id: string
  slug: string
  name: string
  brandColor: string | null
}

export async function listClientTagOptions(
  workspaceSlug: string,
): Promise<ClientTagOption[]> {
  try {
    const me = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()
    const { data: memberships } = await sb
      .from("workspace_memberships")
      .select("workspace_id")
      .eq("user_id", me.id)
      .eq("status", "active")
    const ids = ((memberships ?? []) as Array<{ workspace_id: string }>)
      .map((m) => m.workspace_id)
      .filter((id) => id !== me.workspaceId)
    if (ids.length === 0) return []
    const { data: ws } = await sb
      .from("workspaces")
      .select("id, slug, name, brand_color")
      .in("id", ids)
    return ((ws ?? []) as Array<{
      id: string
      slug: string
      name: string
      brand_color: string | null
    }>)
      .map((w) => ({
        id: w.id,
        slug: w.slug,
        name: w.name,
        brandColor: w.brand_color,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch {
    return []
  }
}
