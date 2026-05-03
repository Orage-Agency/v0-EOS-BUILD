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

/**
 * Send the meeting recap to every participant. Wraps the cascading
 * message + IDS resolved + captures + average rating into a single email
 * so the team has a record. Called after the user confirms the conclude
 * dialog.
 */
export async function sendMeetingRecap(
  workspaceSlug: string,
  meeting: Meeting,
): Promise<{ ok: boolean; sent: number; failed?: number; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()

    // Verify the meeting belongs to the caller's workspace before fanning
    // out emails — the client supplies the Meeting object, so trust the
    // server's record over what was passed in.
    if (!isUuid(meeting.id)) return { ok: false, sent: 0, error: "Invalid meeting id" }
    const { data: meetingRow } = await sb
      .from("meetings")
      .select("id")
      .eq("id", meeting.id)
      .eq("tenant_id", user.workspaceId)
      .maybeSingle()
    if (!meetingRow) return { ok: false, sent: 0, error: "Meeting not found in this workspace" }

    // Resolve participants → emails. Client-side IDs may be the demo `u_xxx`
    // strings, so we filter to UUIDs only — those are real members. Then
    // intersect with active workspace memberships so the recap can't be
    // weaponized to email arbitrary user ids.
    const realIds = meeting.participants
      .map((p) => p.userId)
      .filter((id) => isUuid(id))
    if (realIds.length === 0) return { ok: true, sent: 0 }

    const { data: memberRows } = await sb
      .from("workspace_memberships")
      .select("user_id")
      .eq("workspace_id", user.workspaceId)
      .eq("status", "active")
      .in("user_id", realIds)
    const memberIds = new Set(
      ((memberRows ?? []) as Array<{ user_id: string }>).map((m) => m.user_id),
    )
    const scopedIds = realIds.filter((id) => memberIds.has(id))
    if (scopedIds.length === 0) return { ok: true, sent: 0 }

    const { data: profiles } = await sb
      .from("profiles")
      .select("id, email, full_name")
      .in("id", scopedIds)
    const recipients = ((profiles ?? []) as Array<{
      id: string
      email: string
      full_name: string | null
    }>).filter((p) => p.email)

    if (recipients.length === 0) return { ok: true, sent: 0 }

    const { data: ws } = await sb
      .from("workspaces")
      .select("name, slug")
      .eq("id", user.workspaceId)
      .maybeSingle()
    const wsName = (ws?.name as string | undefined) ?? "your workspace"

    const ratings = meeting.participants.flatMap((p) => (p.rating ? [p.rating] : []))
    const avgRating =
      ratings.length > 0
        ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
        : "—"
    const idsResolved = meeting.ids.filter((i) => i.resolved).length
    const idsTotal = meeting.ids.length
    const todos = meeting.captures.filter((c) => c.kind === "todo")
    const headlines = meeting.captures.filter((c) => c.kind === "headline")

    // Lightweight inline HTML — doesn't share the email-templates shell so
    // we keep this file's deps small. Branded enough for an internal recap.
    const dateStr = new Date(meeting.scheduledAt).toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
    const subject = `L10 Recap · ${dateStr} · ${wsName}`
    const todosBlock =
      todos.length > 0
        ? `<p style="margin:12px 0 4px 0;color:#E4AF7A;font-size:13px;"><strong>To-Dos (${todos.length})</strong></p>
           <ul style="margin:0 0 12px 18px;padding:0;color:#FFD69C;font-size:13px;">${todos
             .map((t) => `<li>${escape(t.text)}${t.ownerLabel ? ` <span style="color:#8a7860;">— ${escape(t.ownerLabel)}</span>` : ""}</li>`)
             .join("")}</ul>`
        : ""
    const headlinesBlock =
      headlines.length > 0
        ? `<p style="margin:12px 0 4px 0;color:#E4AF7A;font-size:13px;"><strong>Headlines (${headlines.length})</strong></p>
           <ul style="margin:0 0 12px 18px;padding:0;color:#FFD69C;font-size:13px;">${headlines
             .map((h) => `<li>${escape(h.text)}</li>`)
             .join("")}</ul>`
        : ""

    const html = `<!doctype html><html><body style="margin:0;background:#0a0a0a;color:#FFD69C;font-family:Arial,sans-serif;padding:24px;">
<div style="max-width:600px;margin:0 auto;background:#151515;border:1px solid rgba(182,128,57,0.18);padding:24px;border-radius:4px;">
  <div style="font-family:'Bebas Neue',Impact,sans-serif;letter-spacing:.18em;color:#E4AF7A;font-size:14px;margin-bottom:8px;">L10 RECAP</div>
  <h1 style="margin:0 0 12px 0;color:#E4AF7A;font-size:18px;">${escape(meeting.name)} · ${escape(dateStr)}</h1>
  <p style="margin:0 0 12px 0;font-size:13px;line-height:1.5;color:#FFD69C;"><strong>Attended</strong> ${meeting.participants.filter((p) => p.status !== "away").length}/${meeting.participants.length} · <strong>Avg rating</strong> ${avgRating}/10 · <strong>IDS</strong> ${idsResolved}/${idsTotal} resolved</p>
  ${meeting.cascadingMessage ? `<div style="border-left:3px solid #B68039;padding:10px 14px;margin:14px 0;background:rgba(182,128,57,0.06);"><div style="font-size:11px;color:#8a7860;text-transform:uppercase;letter-spacing:.15em;margin-bottom:4px;">Cascading message</div><div style="font-size:13px;line-height:1.5;color:#FFD69C;">${escape(meeting.cascadingMessage)}</div></div>` : ""}
  ${todosBlock}
  ${headlinesBlock}
  <div style="margin-top:18px;font-size:11px;color:#8a7860;">Sent because you were a participant in this L10.</div>
</div>
</body></html>`

    const { sendEmail, htmlToText } = await import("@/lib/email")

    let sent = 0
    let failed = 0
    let lastError: string | undefined
    for (const r of recipients) {
      const result = await sendEmail({
        to: r.email,
        subject,
        html,
        text: htmlToText(html),
      })
      if (result.ok) {
        sent++
      } else {
        failed++
        lastError = result.error
      }
    }
    // If every send failed, surface that to the UI instead of pretending
    // the recap went out — the caller can show a retry/error state.
    if (sent === 0 && failed > 0) {
      return {
        ok: false,
        sent,
        failed,
        error: lastError ?? "All recap emails failed to send",
      }
    }
    return { ok: true, sent, failed }
  } catch (err) {
    return {
      ok: false,
      sent: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
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
