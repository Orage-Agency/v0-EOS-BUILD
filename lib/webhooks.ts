/**
 * Webhook dispatcher (WEBHOOKS-SPEC).
 *
 * Day 1 no-op stub: collects events, logs them, and returns. Day 4
 * replaces the body of dispatch() with real outbound delivery
 * (HMAC signing + retry with exponential backoff).
 */
import "server-only"

export type WebhookEvent =
  | "rock.created"
  | "rock.updated"
  | "rock.completed"
  | "task.created"
  | "task.updated"
  | "task.completed"
  | "task.handoff"
  | "issue.created"
  | "issue.solved"
  | "scorecard.entry.recorded"
  | "scorecard.metric.red_streak"
  | "note.created"
  | "note.mentioned"
  | "meeting.summary.ready"
  | "ai.nudge.generated"
  | "calendar.event.synced"
  | "vto.published"
  | "accountability.role.assigned"

export interface WebhookPayload {
  event: WebhookEvent
  tenantId: string
  actorId: string | null
  occurredAt: string
  data: Record<string, unknown>
}

export async function dispatchWebhook(
  payload: Omit<WebhookPayload, "occurredAt"> & { occurredAt?: string },
): Promise<void> {
  const enriched: WebhookPayload = {
    occurredAt: payload.occurredAt ?? new Date().toISOString(),
    ...payload,
  }
  // TODO Day 4: HMAC-sign + POST to subscribed endpoints with retry.
  console.log("[webhook] queued", enriched.event, {
    tenantId: enriched.tenantId,
    actorId: enriched.actorId,
  })
}
