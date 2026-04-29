/**
 * Orage Core · VTO server-side data helpers
 * Server-only. Reads and writes the VTO document stored as JSONB on workspaces.
 */
import "server-only"

import { requireUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

export type VTOSnapshot = Record<string, unknown>

export async function getVTOData(workspaceSlug: string): Promise<VTOSnapshot | null> {
  try {
    const user = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()
    const { data } = await sb
      .from("workspaces")
      .select("vto_data")
      .eq("id", user.workspaceId)
      .single()
    return (data as { vto_data: VTOSnapshot | null } | null)?.vto_data ?? null
  } catch {
    return null
  }
}
