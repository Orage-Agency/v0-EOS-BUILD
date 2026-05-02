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
    description: row.description ?? undefined,
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

export type RockMilestone = {
  id: string
  rockId: string
  title: string
  due: string
  done: boolean
}

export type RockLinkedTask = {
  id: string
  rockId: string
  title: string
  ownerId: string
  due: string
  done: boolean
}

export async function listMilestonesForWorkspace(
  workspaceSlug: string,
): Promise<RockMilestone[]> {
  try {
    const user = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()
    const { data: rocks } = await sb
      .from("rocks")
      .select("id")
      .eq("tenant_id", user.workspaceId)
    const ids = ((rocks ?? []) as Array<{ id: string }>).map((r) => r.id)
    if (ids.length === 0) return []
    const { data } = await sb
      .from("rock_milestones")
      .select("id, rock_id, title, due_date, completed_at, order_idx")
      .in("rock_id", ids)
      .order("order_idx", { ascending: true })
    return ((data ?? []) as Array<{
      id: string
      rock_id: string
      title: string
      due_date: string | null
      completed_at: string | null
    }>).map((m) => ({
      id: m.id,
      rockId: m.rock_id,
      title: m.title,
      due: m.due_date ? m.due_date.slice(0, 10) : "",
      done: Boolean(m.completed_at),
    }))
  } catch {
    return []
  }
}

export async function listLinkedTasksForWorkspace(
  workspaceSlug: string,
): Promise<RockLinkedTask[]> {
  try {
    const user = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()
    const { data } = await sb
      .from("tasks")
      .select("id, parent_rock_id, title, owner_id, due_date, status, completed_at")
      .eq("tenant_id", user.workspaceId)
      .not("parent_rock_id", "is", null)
    return ((data ?? []) as Array<{
      id: string
      parent_rock_id: string | null
      title: string
      owner_id: string | null
      due_date: string | null
      status: string
      completed_at: string | null
    }>)
      .filter((t) => t.parent_rock_id)
      .map((t) => ({
        id: t.id,
        rockId: t.parent_rock_id as string,
        title: t.title,
        ownerId: t.owner_id ?? UNASSIGNED_OWNER_ID,
        due: t.due_date ? t.due_date.slice(0, 10) : "",
        done: t.status === "done",
      }))
  } catch {
    return []
  }
}
