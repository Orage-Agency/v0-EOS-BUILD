"use server"

import { requireUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { Meeting } from "@/lib/l10-store"

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
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}
