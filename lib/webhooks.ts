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
    // Find webhooks subscribed to this event in this workspace.
    // Empty event_types array = subscribe to all.
    const { data: webhooks } = await sb
      .from("webhooks")
      .select("id, event_types")
      .eq("workspace_id", workspaceId)
      .eq("active", true)
    const matching = ((webhooks ?? []) as Array<{
      id: string
      event_types: string[]
    }>).filter(
      (w) => w.event_types.length === 0 || w.event_types.includes(eventType),
    )
    if (matching.length === 0) return

    const rows = matching.map((w) => ({
      webhook_id: w.id,
      workspace_id: workspaceId,
      event_type: eventType,
      payload,
    }))
    await sb.from("webhook_deliveries").insert(rows)
  } catch (err) {
    // Best-effort — never let an enqueue failure break the parent write.
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
