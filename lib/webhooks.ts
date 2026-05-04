import "server-only"
import crypto from "crypto"
import { supabaseAdmin } from "@/lib/supabase/admin"

/**
 * Outbound webhook system.
 *
 * Server actions and API endpoints call `enqueueWebhookEvent` after a
 * successful write. This inserts a row into webhook_deliveries for each
 * subscribed webhook in the workspace. A scheduled cron picks pending
 * rows and POSTs them with an HMAC signature, retrying with backoff on
 * failure.
 *
 * Decoupling the producer from the network call keeps user-facing writes
 * fast — a slow consumer can't slow down the app.
 */

export type WebhookEventType =
  | "task.created"
  | "task.updated"
  | "task.deleted"
  | "rock.created"
  | "rock.updated"
  | "rock.deleted"
  | "issue.created"
  | "issue.updated"
  | "issue.deleted"
  | "note.created"
  | "note.updated"
  | "note.deleted"

export const ALL_WEBHOOK_EVENTS: WebhookEventType[] = [
  "task.created", "task.updated", "task.deleted",
  "rock.created", "rock.updated", "rock.deleted",
  "issue.created", "issue.updated", "issue.deleted",
  "note.created", "note.updated", "note.deleted",
]

export async function enqueueWebhookEvent(
  workspaceId: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const sb = supabaseAdmin()
    // Find webhooks subscribed to this event in this workspace. Empty
    // event_types array = subscribe to all.
    const { data: webhooks } = await sb
      .from("webhooks")
      .select("id, target_url, secret, event_types")
      .eq("workspace_id", workspaceId)
      .eq("active", true)
    const matching = ((webhooks ?? []) as Array<{
      id: string
      target_url: string
      secret: string
      event_types: string[]
    }>).filter(
      (w) => w.event_types.length === 0 || w.event_types.includes(eventType),
    )
    if (matching.length === 0) return

    // Insert delivery rows AND keep their ids so we can mark them
    // delivered if the inline POST below succeeds.
    const { data: inserted } = await sb
      .from("webhook_deliveries")
      .insert(
        matching.map((w) => ({
          webhook_id: w.id,
          workspace_id: workspaceId,
          event_type: eventType,
          payload,
        })),
      )
      .select("id, webhook_id")
    const idByWebhook = new Map<string, string>(
      ((inserted ?? []) as Array<{ id: string; webhook_id: string }>).map(
        (r) => [r.webhook_id, r.id],
      ),
    )

    // Inline best-effort delivery. We tried to schedule an every-2min
    // cron but Vercel's Hobby plan only allows daily crons; rather than
    // delay every webhook by ~24h, we POST inline here with a 5-second
    // timeout so the typical case is sub-second. Failed inline deliveries
    // stay queued for the daily retry cron at /api/cron/webhook-delivery.
    const nowIso = new Date().toISOString()
    await Promise.allSettled(
      matching.map(async (w) => {
        const deliveryId = idByWebhook.get(w.id)
        const body = JSON.stringify({
          id: deliveryId ?? null,
          event: eventType,
          workspace_id: workspaceId,
          created_at: nowIso,
          data: payload,
        })
        const signature = signPayload(w.secret, body)
        try {
          const res = await fetch(w.target_url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "Orage-Core-Webhooks/1",
              "X-Orage-Event": eventType,
              "X-Orage-Delivery": deliveryId ?? "inline",
              "X-Orage-Signature": `sha256=${signature}`,
            },
            body,
            signal: AbortSignal.timeout(5_000),
          })
          if (res.ok && deliveryId) {
            await sb
              .from("webhook_deliveries")
              .update({
                delivered_at: nowIso,
                last_attempt_at: nowIso,
                last_status: res.status,
                attempts: 1,
              })
              .eq("id", deliveryId)
            await sb
              .from("webhooks")
              .update({
                last_delivered_at: nowIso,
                last_delivery_status: res.status,
                consecutive_failures: 0,
              })
              .eq("id", w.id)
          }
        } catch {
          // Inline send failed — queue row stays pending for the cron retry.
        }
      }),
    )
  } catch (err) {
    // Never let webhook plumbing break the parent write.
    console.error("[webhooks] enqueue failed", err)
  }
}

/**
 * HMAC-SHA-256 signature of the JSON body using the webhook's secret.
 * Consumer verifies by computing the same and timing-safe-comparing
 * with the X-Orage-Signature header.
 */
export function signPayload(secret: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex")
}
