/**
 * Client-safe webhook types + constants.
 *
 * Lives separately from lib/webhooks.ts (which is server-only via the
 * "server-only" import) so client components — like the settings UI's
 * event-type checklist — can import the event list without dragging in
 * the supabase admin client and tripping Next.js's server-only guard.
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
  | "l10.concluded"
  | "scorecard.metric.posted"
  | "milestone.toggled"

export const ALL_WEBHOOK_EVENTS: WebhookEventType[] = [
  "task.created", "task.updated", "task.deleted",
  "rock.created", "rock.updated", "rock.deleted",
  "issue.created", "issue.updated", "issue.deleted",
  "note.created", "note.updated", "note.deleted",
  "l10.concluded", "scorecard.metric.posted", "milestone.toggled",
]

/**
 * Wire-format version stamped on every outbound delivery payload.
 * Bump this only when the envelope shape changes — adding new event
 * types is a non-breaking change and does not require a version bump.
 */
export const WEBHOOK_PAYLOAD_VERSION = 1
