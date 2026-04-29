/**
 * Orage Core · L10 server-side data helpers
 * Server-only. Reads/writes meetings to the 'meetings' table.
 * The full Meeting state is stored as JSONB in the 'agenda' column.
 */
import "server-only"

import { requireUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { Meeting } from "@/lib/l10-store"

type DbMeeting = {
  id: string
  title: string
  type: string
  scheduled_at: string
  started_at: string | null
  ended_at: string | null
  agenda: unknown
  summary_text: string | null
  created_by: string | null
}

function dbToMeeting(row: DbMeeting): Meeting {
  const payload = (row.agenda ?? {}) as Partial<Meeting>
  return {
    id: row.id,
    name: row.title,
    type: "L10",
    scheduledAt: new Date(row.scheduled_at).getTime(),
    durationMin: payload.durationMin ?? 90,
    status: row.ended_at
      ? "concluded"
      : row.started_at
        ? "in_session"
        : "scheduled",
    startedAt: row.started_at ? new Date(row.started_at).getTime() : undefined,
    concludedAt: row.ended_at ? new Date(row.ended_at).getTime() : undefined,
    agenda: payload.agenda ?? [],
    participants: payload.participants ?? [],
    ids: payload.ids ?? [],
    captures: payload.captures ?? [],
    cascadingMessage: row.summary_text ?? payload.cascadingMessage,
    attendedCount: payload.attendedCount,
    notesPosted: payload.notesPosted,
  }
}

export async function listL10Meetings(workspaceSlug: string): Promise<Meeting[]> {
  const user = await requireUser(workspaceSlug)
  try {
    const sb = supabaseAdmin()
    const { data, error } = await sb
      .from("meetings")
      .select("id, title, type, scheduled_at, started_at, ended_at, agenda, summary_text, created_by")
      .eq("tenant_id", user.workspaceId)
      .eq("type", "L10")
      .order("scheduled_at", { ascending: false })

    if (error) {
      console.error("[v0] listL10Meetings error", error.message)
      return []
    }

    return ((data as DbMeeting[] | null) ?? []).map(dbToMeeting)
  } catch (err) {
    console.error("[v0] listL10Meetings exception", err)
    return []
  }
}

export async function getMeeting(workspaceSlug: string, meetingId: string): Promise<Meeting | null> {
  const user = await requireUser(workspaceSlug)
  try {
    const sb = supabaseAdmin()
    const { data, error } = await sb
      .from("meetings")
      .select("id, title, type, scheduled_at, started_at, ended_at, agenda, summary_text, created_by")
      .eq("id", meetingId)
      .eq("tenant_id", user.workspaceId)
      .single()

    if (error || !data) return null
    return dbToMeeting(data as DbMeeting)
  } catch {
    return null
  }
}
