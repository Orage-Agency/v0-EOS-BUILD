"use server"

/**
 * Orage Core · Tasks server actions
 *
 * Real Supabase persistence. Every action authenticates via
 * requireUser(workspaceSlug), gates with requirePermission, then writes
 * through the admin client (RLS gate is satisfied by the auth check
 * upstream so we don't need a per-request anon client here).
 *
 * Returns shape:
 *   { ok: true, ... }                          on success
 *   { ok: false, error: string }               on failure (UI surfaces toast)
 */

import { revalidatePath } from "next/cache"

import { requireUser } from "@/lib/auth"
import { requirePermission } from "@/lib/server/permissions"
import { supabaseAdmin } from "@/lib/supabase/admin"
import {
  UNASSIGNED_OWNER_ID,
  type MockTask,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/mock-data"
import type { DbTask } from "@/lib/db-types"

// ---------------------------------------------------------- helpers

function isUuid(value: string | null | undefined): value is string {
  if (!value) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  )
}

function toIsoOrNull(date: string | null | undefined): string | null {
  if (!date) return null
  // Accept YYYY-MM-DD or full ISO; coerce to a midnight ISO at UTC.
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return `${date}T00:00:00.000Z`
  const parsed = new Date(date)
  return isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function dbToMockTask(row: DbTask): MockTask {
  return {
    id: row.id,
    title: row.title,
    owner: row.owner_id ?? UNASSIGNED_OWNER_ID,
    createdBy: row.created_by ?? undefined,
    status: row.status,
    priority: row.priority,
    due: row.due_date ? row.due_date.slice(0, 10) : "",
    rockId: row.parent_rock_id ?? undefined,
    completed: row.completed_at ? row.completed_at.slice(0, 10) : undefined,
    description: row.description ?? undefined,
  }
}

function revalidateTaskRoutes(workspaceSlug: string) {
  revalidatePath(`/${workspaceSlug}/tasks`)
  revalidatePath(`/${workspaceSlug}`)
}

// ---------------------------------------------------------- create

export type CreateTaskInput = {
  title: string
  description?: string
  priority?: TaskPriority
  due?: string
  rockId?: string
  ownerId?: string
}

export async function createTask(
  workspaceSlug: string,
  input: CreateTaskInput,
): Promise<{ ok: true; id: string; task: MockTask } | { ok: false; error: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "tasks:write")

    const title = input.title.trim()
    if (!title) return { ok: false, error: "Title is required." }

    const sb = supabaseAdmin()
    const ownerId = isUuid(input.ownerId) ? input.ownerId : user.id
    const rockId = isUuid(input.rockId) ? input.rockId : null

    const { data, error } = await sb
      .from("tasks")
      .insert({
        tenant_id: user.workspaceId,
        title,
        description: input.description?.trim() || null,
        owner_id: ownerId,
        parent_rock_id: rockId,
        status: "open" as TaskStatus,
        priority: (input.priority ?? "med") as TaskPriority,
        due_date: toIsoOrNull(input.due),
        created_by: user.id,
      })
      .select("*")
      .single()

    if (error || !data) {
      console.error("[v0] createTask insert error", error?.message)
      return { ok: false, error: error?.message ?? "Insert failed" }
    }

    revalidateTaskRoutes(workspaceSlug)
    return { ok: true, id: data.id as string, task: dbToMockTask(data as DbTask) }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] createTask exception", msg)
    return { ok: false, error: msg }
  }
}

// ---------------------------------------------------------- update status

export async function updateTaskStatus(
  workspaceSlug: string,
  id: string,
  status: TaskStatus,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "tasks:write")
    const sb = supabaseAdmin()
    const completedAt =
      status === "done" ? new Date().toISOString() : null
    const { error } = await sb
      .from("tasks")
      .update({ status, completed_at: completedAt })
      .eq("id", id)
      .eq("tenant_id", user.workspaceId)
    if (error) return { ok: false, error: error.message }
    revalidateTaskRoutes(workspaceSlug)
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return { ok: false, error: msg }
  }
}

// ---------------------------------------------------------- update due date

export async function updateTaskDueDate(
  workspaceSlug: string,
  id: string,
  due: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "tasks:write")
    const sb = supabaseAdmin()
    const { error } = await sb
      .from("tasks")
      .update({ due_date: toIsoOrNull(due) })
      .eq("id", id)
      .eq("tenant_id", user.workspaceId)
    if (error) return { ok: false, error: error.message }
    revalidateTaskRoutes(workspaceSlug)
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return { ok: false, error: msg }
  }
}

// ---------------------------------------------------------- update title

export async function updateTaskTitle(
  workspaceSlug: string,
  id: string,
  title: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "tasks:write")
    const trimmed = title.trim()
    if (!trimmed) return { ok: false, error: "Title cannot be empty." }
    const sb = supabaseAdmin()
    const { error } = await sb
      .from("tasks")
      .update({ title: trimmed })
      .eq("id", id)
      .eq("tenant_id", user.workspaceId)
    if (error) return { ok: false, error: error.message }
    revalidateTaskRoutes(workspaceSlug)
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return { ok: false, error: msg }
  }
}

// ---------------------------------------------------------- update description

export async function updateTaskDescription(
  workspaceSlug: string,
  id: string,
  description: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "tasks:write")
    const sb = supabaseAdmin()
    const { error } = await sb
      .from("tasks")
      .update({ description: description.trim() || null })
      .eq("id", id)
      .eq("tenant_id", user.workspaceId)
    if (error) return { ok: false, error: error.message }
    revalidateTaskRoutes(workspaceSlug)
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return { ok: false, error: msg }
  }
}

// ---------------------------------------------------------- update priority

export async function updateTaskPriority(
  workspaceSlug: string,
  id: string,
  priority: TaskPriority,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "tasks:write")
    const sb = supabaseAdmin()
    const { error } = await sb
      .from("tasks")
      .update({ priority })
      .eq("id", id)
      .eq("tenant_id", user.workspaceId)
    if (error) return { ok: false, error: error.message }
    revalidateTaskRoutes(workspaceSlug)
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return { ok: false, error: msg }
  }
}

// ---------------------------------------------------------- update parent rock

export async function updateTaskRock(
  workspaceSlug: string,
  id: string,
  rockId: string | null,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "tasks:write")
    const sb = supabaseAdmin()
    const parentRockId = isUuid(rockId) ? rockId : null
    const { error } = await sb
      .from("tasks")
      .update({ parent_rock_id: parentRockId })
      .eq("id", id)
      .eq("tenant_id", user.workspaceId)
    if (error) return { ok: false, error: error.message }
    revalidateTaskRoutes(workspaceSlug)
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return { ok: false, error: msg }
  }
}

// ---------------------------------------------------------- delete single

export async function deleteTask(
  workspaceSlug: string,
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "tasks:delete")
    const sb = supabaseAdmin()
    const { error } = await sb
      .from("tasks")
      .delete()
      .eq("id", id)
      .eq("tenant_id", user.workspaceId)
    if (error) return { ok: false, error: error.message }
    revalidateTaskRoutes(workspaceSlug)
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return { ok: false, error: msg }
  }
}

// ---------------------------------------------------------- handoff

export type HandoffInput = {
  taskId: string
  fromUserId: string
  toUserId: string
  context: string
  attachedNoteIds?: string[]
}

export async function reassignTaskWithHandoff(
  workspaceSlug: string,
  input: HandoffInput,
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!input.context.trim()) {
      return { ok: false, error: "Context required" }
    }
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "tasks:write")
    if (!isUuid(input.toUserId)) {
      return { ok: false, error: "Invalid target owner" }
    }
    const sb = supabaseAdmin()
    const { error } = await sb
      .from("tasks")
      .update({ owner_id: input.toUserId })
      .eq("id", input.taskId)
      .eq("tenant_id", user.workspaceId)
    if (error) return { ok: false, error: error.message }
    revalidateTaskRoutes(workspaceSlug)
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return { ok: false, error: msg }
  }
}

// ---------------------------------------------------------- bulk update

export async function bulkUpdateTasks(
  workspaceSlug: string,
  ids: string[],
  patch: Partial<MockTask>,
): Promise<{ ok: boolean; count: number; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "tasks:write")
    if (ids.length === 0) return { ok: true, count: 0 }

    const dbPatch: Record<string, unknown> = {}
    if (patch.status !== undefined) {
      dbPatch.status = patch.status
      dbPatch.completed_at =
        patch.status === "done" ? new Date().toISOString() : null
    }
    if (patch.priority !== undefined) dbPatch.priority = patch.priority
    if (patch.due !== undefined) dbPatch.due_date = toIsoOrNull(patch.due)
    if (patch.rockId !== undefined) {
      dbPatch.parent_rock_id = isUuid(patch.rockId) ? patch.rockId : null
    }

    const sb = supabaseAdmin()
    const { error } = await sb
      .from("tasks")
      .update(dbPatch)
      .in("id", ids)
      .eq("tenant_id", user.workspaceId)
    if (error) return { ok: false, count: 0, error: error.message }
    revalidateTaskRoutes(workspaceSlug)
    return { ok: true, count: ids.length }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return { ok: false, count: 0, error: msg }
  }
}

// ---------------------------------------------------------- bulk delete

export async function bulkDeleteTasks(
  workspaceSlug: string,
  ids: string[],
): Promise<{ ok: boolean; count: number; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "tasks:delete")
    if (ids.length === 0) return { ok: true, count: 0 }
    const sb = supabaseAdmin()
    const { error } = await sb
      .from("tasks")
      .delete()
      .in("id", ids)
      .eq("tenant_id", user.workspaceId)
    if (error) return { ok: false, count: 0, error: error.message }
    revalidateTaskRoutes(workspaceSlug)
    return { ok: true, count: ids.length }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return { ok: false, count: 0, error: msg }
  }
}
