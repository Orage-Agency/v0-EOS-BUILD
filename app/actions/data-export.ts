"use server"

import { requireUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { logAudit } from "@/lib/audit"
import { logError } from "@/lib/log"

/**
 * GDPR-style data export — produces a single JSON payload containing
 * every workspace row tagged with the caller's user_id. The user can
 * download it or request a copy by email.
 *
 * Scope: per-user, not per-workspace. We export
 *   • the user's profile,
 *   • every active workspace_membership,
 *   • for each workspace they're in: rocks, tasks, issues, notes,
 *     scorecard cells, audit log entries, AI request log, AI chat
 *     threads + messages they own,
 *   • all of their notifications,
 *   • all of their trusted devices.
 *
 * Not included: cross-workspace company data they didn't author (other
 * people's tasks, etc.) — we treat those as someone else's right-to-
 * portability claim, not the requester's.
 */

export type DataExport = {
  generated_at: string
  user: Record<string, unknown> | null
  memberships: Array<Record<string, unknown>>
  workspaces: Record<
    string,
    {
      info: Record<string, unknown>
      rocks: Array<Record<string, unknown>>
      tasks: Array<Record<string, unknown>>
      issues: Array<Record<string, unknown>>
      notes: Array<Record<string, unknown>>
      scorecard_metrics: Array<Record<string, unknown>>
      audit_log: Array<Record<string, unknown>>
    }
  >
  notifications: Array<Record<string, unknown>>
  ai_chat: {
    threads: Array<Record<string, unknown>>
    messages: Array<Record<string, unknown>>
  }
  trusted_devices: Array<Record<string, unknown>>
}

export async function exportMyData(workspaceSlug: string): Promise<
  | { ok: true; data: DataExport }
  | { ok: false; error: string }
> {
  try {
    const me = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()

    const [profileRes, membershipsRes, notificationsRes, threadsRes, messagesRes, devicesRes] =
      await Promise.all([
        sb.from("profiles").select("*").eq("id", me.id).maybeSingle(),
        sb
          .from("workspace_memberships")
          .select("*")
          .eq("user_id", me.id)
          .eq("status", "active"),
        sb.from("notifications").select("*").eq("recipient_id", me.id),
        sb.from("ai_chat_threads").select("*").eq("user_id", me.id),
        sb.from("ai_chat_messages").select("*").eq("user_id", me.id),
        sb.from("mfa_trusted_devices").select("*").eq("user_id", me.id),
      ])

    const memberships = (membershipsRes.data ?? []) as Array<{
      workspace_id: string
    }>
    const workspaces: DataExport["workspaces"] = {}

    for (const m of memberships) {
      const wsId = m.workspace_id
      const [
        wsRes,
        rocksRes,
        tasksRes,
        issuesRes,
        notesRes,
        metricsRes,
        auditRes,
      ] = await Promise.all([
        sb.from("workspaces").select("*").eq("id", wsId).maybeSingle(),
        sb
          .from("rocks")
          .select("*")
          .eq("tenant_id", wsId)
          .or(`owner_id.eq.${me.id},created_by.eq.${me.id}`),
        sb
          .from("tasks")
          .select("*")
          .eq("tenant_id", wsId)
          .or(`owner_id.eq.${me.id},created_by.eq.${me.id}`),
        sb
          .from("issues")
          .select("*")
          .eq("tenant_id", wsId)
          .or(`owner_id.eq.${me.id},created_by.eq.${me.id}`),
        sb
          .from("notes")
          .select("*")
          .eq("tenant_id", wsId)
          .eq("created_by", me.id),
        sb.from("metrics").select("*").eq("tenant_id", wsId).eq("owner_id", me.id),
        sb
          .from("activity_log")
          .select("*")
          .eq("tenant_id", wsId)
          .eq("actor_id", me.id),
      ])
      const wsRow = wsRes.data
      if (!wsRow) continue
      workspaces[wsId] = {
        info: wsRow as Record<string, unknown>,
        rocks: (rocksRes.data ?? []) as Array<Record<string, unknown>>,
        tasks: (tasksRes.data ?? []) as Array<Record<string, unknown>>,
        issues: (issuesRes.data ?? []) as Array<Record<string, unknown>>,
        notes: (notesRes.data ?? []) as Array<Record<string, unknown>>,
        scorecard_metrics: (metricsRes.data ?? []) as Array<
          Record<string, unknown>
        >,
        audit_log: (auditRes.data ?? []) as Array<Record<string, unknown>>,
      }
    }

    const data: DataExport = {
      generated_at: new Date().toISOString(),
      user: profileRes.data as Record<string, unknown> | null,
      memberships: (membershipsRes.data ?? []) as Array<
        Record<string, unknown>
      >,
      workspaces,
      notifications: (notificationsRes.data ?? []) as Array<
        Record<string, unknown>
      >,
      ai_chat: {
        threads: (threadsRes.data ?? []) as Array<Record<string, unknown>>,
        messages: (messagesRes.data ?? []) as Array<Record<string, unknown>>,
      },
      trusted_devices: (devicesRes.data ?? []) as Array<
        Record<string, unknown>
      >,
    }

    await logAudit({
      user: me,
      action: "create",
      entityType: "tenant",
      entityId: me.workspaceId,
      metadata: { kind: "data_export_self" },
    })

    return { ok: true, data }
  } catch (err) {
    logError("exportMyData failed", err)
    return { ok: false, error: err instanceof Error ? err.message : "Unknown" }
  }
}
