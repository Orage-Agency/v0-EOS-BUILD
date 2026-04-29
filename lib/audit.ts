/**
 * Audit log writer (BACKEND-ARCHITECTURE §5).
 *
 * Every server-action mutation appends a row here so we have a forensic
 * trail and a feed source for the dashboard's "Recent Activity" panel.
 * Failures must never break the parent operation — they only log.
 */
import "server-only"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { AuthUser } from "@/lib/auth"

export type AuditEntityType =
  | "rock"
  | "rock_milestone"
  | "task"
  | "task_handoff"
  | "issue"
  | "scorecard_metric"
  | "scorecard_entry"
  | "note"
  | "meeting"
  | "meeting_capture"
  | "ai_nudge"
  | "accountability_role"
  | "vto_document"
  | "calendar_event"
  | "integration"
  | "tenant"
  | "user"
  | "membership"

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "complete"
  | "reopen"
  | "handoff"
  | "convert"
  | "publish"
  | "archive"
  | "connect"
  | "disconnect"
  | "sync"

export async function logAudit(input: {
  user: AuthUser
  action: AuditAction
  entityType: AuditEntityType
  entityId: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  const sb = supabaseAdmin()
  const { error } = await sb.from("activity_log").insert({
    // Data tables still use the original `tenant_id` column name; the
    // value is the workspace UUID, which is identical to what the
    // legacy "tenant" referred to.
    tenant_id: input.user.workspaceId,
    actor_id: input.user.id,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    metadata: input.metadata ?? null,
  })
  if (error) {
    console.error("[audit] failed to write activity_log row", {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      error: error.message,
    })
  }
}
