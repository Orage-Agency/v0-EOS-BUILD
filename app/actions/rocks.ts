"use server"

/**
 * Orage Core · Rocks server actions
 * Real Supabase persistence. Auth via requireUser, permission-gated,
 * writes through supabaseAdmin (bypasses RLS — auth check happens upstream).
 */

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { requirePermission } from "@/lib/server/permissions"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { UNASSIGNED_OWNER_ID, type MockRock, type RockStatus } from "@/lib/mock-data"
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

function isUuid(v: string | null | undefined): v is string {
  if (!v) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

function revalidateRockRoutes(workspaceSlug: string) {
  revalidatePath(`/${workspaceSlug}/rocks`)
  revalidatePath(`/${workspaceSlug}`)
}

export type CreateRockInput = {
  title: string
  outcome?: string
  ownerId?: string
  due: string
  tag?: string
}

export async function createRock(
  workspaceSlug: string,
  input: CreateRockInput,
): Promise<{ ok: true; id: string; rock: MockRock } | { ok: false; error: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "rocks:write")

    const title = input.title.trim()
    if (!title) return { ok: false, error: "Title is required." }

    const sb = supabaseAdmin()
    const ownerId = isUuid(input.ownerId) ? input.ownerId : user.id

    const { data, error } = await sb
      .from("rocks")
      .insert({
        tenant_id: user.workspaceId,
        title,
        description: input.outcome?.trim() || null,
        owner_id: ownerId,
        quarter: "Q2-2026",
        due_date: input.due || "2026-06-30",
        status: "in_progress" as RockStatus,
        progress: 0,
        tag: input.tag || null,
        created_by: user.id,
      })
      .select("*")
      .single()

    if (error || !data) {
      console.error("[v0] createRock insert error", error?.message)
      return { ok: false, error: error?.message ?? "Insert failed" }
    }

    revalidateRockRoutes(workspaceSlug)
    return { ok: true, id: data.id as string, rock: dbToMockRock(data as DbRock) }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] createRock exception", msg)
    return { ok: false, error: msg }
  }
}

export async function updateRockStatus(
  workspaceSlug: string,
  id: string,
  status: RockStatus,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "rocks:write")
    const sb = supabaseAdmin()
    const completedAt = status === "done" ? new Date().toISOString() : null
    const { error } = await sb
      .from("rocks")
      .update({ status, completed_at: completedAt, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", user.workspaceId)
    if (error) return { ok: false, error: error.message }
    revalidateRockRoutes(workspaceSlug)
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return { ok: false, error: msg }
  }
}

export async function updateRockProgress(
  workspaceSlug: string,
  id: string,
  progress: number,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "rocks:write")
    const clamped = Math.max(0, Math.min(100, Math.round(progress)))
    const sb = supabaseAdmin()
    const { error } = await sb
      .from("rocks")
      .update({ progress: clamped, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", user.workspaceId)
    if (error) return { ok: false, error: error.message }
    revalidateRockRoutes(workspaceSlug)
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return { ok: false, error: msg }
  }
}

export async function updateRockTitle(
  workspaceSlug: string,
  id: string,
  title: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "rocks:write")
    const trimmed = title.trim()
    if (!trimmed) return { ok: false, error: "Title cannot be empty." }
    const sb = supabaseAdmin()
    const { error } = await sb
      .from("rocks")
      .update({ title: trimmed, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", user.workspaceId)
    if (error) return { ok: false, error: error.message }
    revalidateRockRoutes(workspaceSlug)
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return { ok: false, error: msg }
  }
}

export async function updateRockDescription(
  workspaceSlug: string,
  id: string,
  description: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "rocks:write")
    const sb = supabaseAdmin()
    const { error } = await sb
      .from("rocks")
      .update({ description: description.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", user.workspaceId)
    if (error) return { ok: false, error: error.message }
    revalidateRockRoutes(workspaceSlug)
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return { ok: false, error: msg }
  }
}

export async function updateRockOwner(
  workspaceSlug: string,
  id: string,
  ownerId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "rocks:write")
    if (!isUuid(ownerId)) return { ok: false, error: "Invalid owner id" }
    const sb = supabaseAdmin()
    const { error } = await sb
      .from("rocks")
      .update({ owner_id: ownerId, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", user.workspaceId)
    if (error) return { ok: false, error: error.message }
    revalidateRockRoutes(workspaceSlug)
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return { ok: false, error: msg }
  }
}

export async function updateRockDue(
  workspaceSlug: string,
  id: string,
  due: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "rocks:write")
    const sb = supabaseAdmin()
    const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null
    if (!dueDate) return { ok: false, error: "Invalid due date" }
    const { error } = await sb
      .from("rocks")
      .update({ due_date: dueDate, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", user.workspaceId)
    if (error) return { ok: false, error: error.message }
    revalidateRockRoutes(workspaceSlug)
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return { ok: false, error: msg }
  }
}

export async function deleteRock(
  workspaceSlug: string,
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "rocks:delete")
    const sb = supabaseAdmin()
    const { error } = await sb
      .from("rocks")
      .delete()
      .eq("id", id)
      .eq("tenant_id", user.workspaceId)
    if (error) return { ok: false, error: error.message }
    revalidateRockRoutes(workspaceSlug)
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return { ok: false, error: msg }
  }
}

// ───────────────────────────── milestones ──────────────────────────────
//
// rock_milestones is a real table; the rocks-store used to keep them only in
// memory. These actions wire the drawer "Add milestone / toggle / remove"
// flow to the database so changes survive a refresh and other members see
// them immediately.

export type DbMilestone = {
  id: string
  rockId: string
  title: string
  due: string // YYYY-MM-DD or ""
  done: boolean
}

async function rockBelongsToTenant(
  sb: ReturnType<typeof supabaseAdmin>,
  rockId: string,
  tenantId: string,
): Promise<boolean> {
  const { data } = await sb
    .from("rocks")
    .select("id")
    .eq("id", rockId)
    .eq("tenant_id", tenantId)
    .maybeSingle()
  return Boolean(data)
}

export async function listMilestonesForWorkspace(
  workspaceSlug: string,
): Promise<DbMilestone[]> {
  try {
    const user = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()
    const { data: rocks } = await sb
      .from("rocks")
      .select("id")
      .eq("tenant_id", user.workspaceId)
    const rockIds = ((rocks ?? []) as Array<{ id: string }>).map((r) => r.id)
    if (rockIds.length === 0) return []
    const { data, error } = await sb
      .from("rock_milestones")
      .select("id, rock_id, title, due_date, completed_at, order_idx")
      .in("rock_id", rockIds)
      .order("order_idx", { ascending: true })
    if (error || !data) return []
    return (data as Array<{
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

export async function createMilestone(
  workspaceSlug: string,
  rockId: string,
  title: string,
  due: string,
): Promise<{ ok: true; milestone: DbMilestone } | { ok: false; error: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "rocks:write")
    if (!isUuid(rockId)) return { ok: false, error: "Invalid rock id" }
    const trimmed = title.trim()
    if (!trimmed) return { ok: false, error: "Title required" }
    const sb = supabaseAdmin()
    if (!(await rockBelongsToTenant(sb, rockId, user.workspaceId))) {
      return { ok: false, error: "Rock not found in this workspace" }
    }
    const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null
    const { data, error } = await sb
      .from("rock_milestones")
      .insert({
        rock_id: rockId,
        title: trimmed,
        due_date: dueDate,
        order_idx: Math.floor(Date.now() / 1000),
      })
      .select("id, rock_id, title, due_date, completed_at")
      .single()
    if (error || !data) return { ok: false, error: error?.message ?? "Insert failed" }
    revalidateRockRoutes(workspaceSlug)
    return {
      ok: true,
      milestone: {
        id: data.id as string,
        rockId: data.rock_id as string,
        title: data.title as string,
        due: data.due_date ? (data.due_date as string).slice(0, 10) : "",
        done: Boolean(data.completed_at),
      },
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function toggleMilestone(
  workspaceSlug: string,
  milestoneId: string,
  done: boolean,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "rocks:write")
    if (!isUuid(milestoneId)) return { ok: false, error: "Invalid milestone id" }
    const sb = supabaseAdmin()
    // Confirm the milestone belongs to a rock in this tenant before writing.
    const { data: ms } = await sb
      .from("rock_milestones")
      .select("id, rock_id")
      .eq("id", milestoneId)
      .maybeSingle()
    if (!ms) return { ok: false, error: "Milestone not found" }
    if (!(await rockBelongsToTenant(sb, ms.rock_id as string, user.workspaceId))) {
      return { ok: false, error: "Forbidden" }
    }
    const { error } = await sb
      .from("rock_milestones")
      .update({ completed_at: done ? new Date().toISOString() : null })
      .eq("id", milestoneId)
    if (error) return { ok: false, error: error.message }
    revalidateRockRoutes(workspaceSlug)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function updateMilestone(
  workspaceSlug: string,
  milestoneId: string,
  patch: { title?: string; due?: string },
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "rocks:write")
    if (!isUuid(milestoneId)) return { ok: false, error: "Invalid milestone id" }
    const sb = supabaseAdmin()
    const { data: ms } = await sb
      .from("rock_milestones")
      .select("id, rock_id")
      .eq("id", milestoneId)
      .maybeSingle()
    if (!ms) return { ok: false, error: "Milestone not found" }
    if (!(await rockBelongsToTenant(sb, ms.rock_id as string, user.workspaceId))) {
      return { ok: false, error: "Forbidden" }
    }
    const next: Record<string, unknown> = {}
    if (typeof patch.title === "string") {
      const t = patch.title.trim()
      if (!t) return { ok: false, error: "Title required" }
      next.title = t
    }
    if (typeof patch.due === "string") {
      next.due_date = /^\d{4}-\d{2}-\d{2}$/.test(patch.due) ? patch.due : null
    }
    if (Object.keys(next).length === 0) return { ok: true }
    const { error } = await sb.from("rock_milestones").update(next).eq("id", milestoneId)
    if (error) return { ok: false, error: error.message }
    revalidateRockRoutes(workspaceSlug)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function deleteMilestone(
  workspaceSlug: string,
  milestoneId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "rocks:write")
    if (!isUuid(milestoneId)) return { ok: false, error: "Invalid milestone id" }
    const sb = supabaseAdmin()
    const { data: ms } = await sb
      .from("rock_milestones")
      .select("id, rock_id")
      .eq("id", milestoneId)
      .maybeSingle()
    if (!ms) return { ok: false, error: "Milestone not found" }
    if (!(await rockBelongsToTenant(sb, ms.rock_id as string, user.workspaceId))) {
      return { ok: false, error: "Forbidden" }
    }
    const { error } = await sb.from("rock_milestones").delete().eq("id", milestoneId)
    if (error) return { ok: false, error: error.message }
    revalidateRockRoutes(workspaceSlug)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}
