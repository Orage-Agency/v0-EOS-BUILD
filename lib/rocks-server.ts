/**
 * Orage Core · Rocks server-side data helpers
 * Server-only; never imported by client components.
 */
import "server-only"

import { requireUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { UNASSIGNED_OWNER_ID, type MockRock } from "@/lib/mock-data"
import type { DbRock } from "@/lib/db-types"

function dbToMockRock(row: DbRock): MockRock {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    progress: row.progress,
    owner: row.owner_id ?? UNASSIGNED_OWNER_ID,
    due: row.due_date ? row.due_date.slice(0, 10) : "",
    tag: row.tag ?? "",
  }
}

export async function listRocksForWorkspace(workspaceSlug: string): Promise<MockRock[]> {
  const user = await requireUser(workspaceSlug)
  try {
    const sb = supabaseAdmin()
    const { data, error } = await sb
      .from("rocks")
      .select("*")
      .eq("tenant_id", user.workspaceId)
      .order("created_at", { ascending: false })
    if (error) {
      console.error("[v0] listRocksForWorkspace error", error.message)
      return []
    }
    return ((data as DbRock[] | null) ?? []).map(dbToMockRock)
  } catch (err) {
    console.error("[v0] listRocksForWorkspace exception", err)
    return []
  }
}
