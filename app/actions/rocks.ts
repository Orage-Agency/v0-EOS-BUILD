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
