"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { requirePermission } from "@/lib/server/permissions"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { Meeting } from "@/lib/l10-store"

function revalidateL10(slug: string, id?: string) {
  revalidatePath(`/${slug}/l10`)
  if (id) revalidatePath(`/${slug}/l10/${id}`)
}

function isUuid(v: string | null | undefined): v is string {
  if (!v) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

export async function createL10Meeting(
  workspaceSlug: string,
  scheduledAt: number,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()
    const date = new Date(scheduledAt)
    const title = `L10 LEADERSHIP · ${date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase()}`

    const { data, error } = await sb
      .from("meetings")
      .insert({
        tenant_id: user.workspaceId,
        type: "L10",
        title,
        scheduled_at: date.toISOString(),
        agenda: {
          durationMin: 90,
          agenda: [],
          participants: [],
          ids: [],
          captures: [],
        },
        created_by: user.id,
      })
      .select("id")
      .single()

    if (error || !data) {
      console.error("[v0] createL10Meeting error", error?.message)
      return { ok: false, error: error?.message ?? "Insert failed" }
    }

    return { ok: true, id: (data as { id: string }).id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function saveMeetingState(
  workspaceSlug: string,
  meeting: Meeting,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()

    const { error } = await sb
      .from("meetings")
      .update({
        title: meeting.name,
        scheduled_at: new Date(meeting.scheduledAt).toISOString(),
        started_at: meeting.startedAt ? new Date(meeting.startedAt).toISOString() : null,
        ended_at: meeting.concludedAt ? new Date(meeting.concludedAt).toISOString() : null,
        summary_text: meeting.cascadingMessage ?? null,
        agenda: {
          durationMin: meeting.durationMin,
          agenda: meeting.agenda,
          participants: meeting.participants,
          ids: meeting.ids,
          captures: meeting.captures,
          attendedCount: meeting.attendedCount,
          notesPosted: meeting.notesPosted,
        },
      })
      .eq("id", meeting.id)
      .eq("tenant_id", user.workspaceId)

    if (error) return { ok: false, error: error.message }
    revalidateL10(workspaceSlug, meeting.id)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function renameMeeting(
  workspaceSlug: string,
  id: string,
  title: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "l10:write")
    if (!isUuid(id)) return { ok: false, error: "Invalid meeting id" }
    const trimmed = title.trim()
    if (!trimmed) return { ok: false, error: "Title cannot be empty" }
    const sb = supabaseAdmin()
    const { error } = await sb
      .from("meetings")
      .update({ title: trimmed })
      .eq("id", id)
      .eq("tenant_id", user.workspaceId)
    if (error) return { ok: false, error: error.message }
    revalidateL10(workspaceSlug, id)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function rescheduleMeeting(
  workspaceSlug: string,
  id: string,
  scheduledAt: number,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "l10:write")
    if (!isUuid(id)) return { ok: false, error: "Invalid meeting id" }
    const date = new Date(scheduledAt)
    if (Number.isNaN(date.getTime())) return { ok: false, error: "Invalid date" }
    const sb = supabaseAdmin()
    const { error } = await sb
      .from("meetings")
      .update({ scheduled_at: date.toISOString() })
      .eq("id", id)
      .eq("tenant_id", user.workspaceId)
    if (error) return { ok: false, error: error.message }
    revalidateL10(workspaceSlug, id)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function cancelMeeting(
  workspaceSlug: string,
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "l10:write")
    if (!isUuid(id)) return { ok: false, error: "Invalid meeting id" }
    const sb = supabaseAdmin()
    // Soft cancel: tag the title with [CANCELLED] and stamp ended_at so
    // it stops appearing as "upcoming". Preserves agenda + notes.
    const { data: row, error: readErr } = await sb
      .from("meetings")
      .select("title")
      .eq("id", id)
      .eq("tenant_id", user.workspaceId)
      .single()
    if (readErr || !row) return { ok: false, error: readErr?.message ?? "Not found" }
    const title = (row as { title: string }).title
    const newTitle = title.startsWith("[CANCELLED] ") ? title : `[CANCELLED] ${title}`
    const { error } = await sb
      .from("meetings")
      .update({
        title: newTitle,
        ended_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("tenant_id", user.workspaceId)
    if (error) return { ok: false, error: error.message }
    revalidateL10(workspaceSlug, id)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function deleteMeeting(
  workspaceSlug: string,
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "l10:delete")
    if (!isUuid(id)) return { ok: false, error: "Invalid meeting id" }
    const sb = supabaseAdmin()
    const { error } = await sb
      .from("meetings")
      .delete()
      .eq("id", id)
      .eq("tenant_id", user.workspaceId)
    if (error) return { ok: false, error: error.message }
    revalidateL10(workspaceSlug)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}
