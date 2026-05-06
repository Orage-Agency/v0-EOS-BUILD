/**
 * Webhook events catalog — list every event type the platform emits,
 * along with a human-readable summary. Lets external tools (n8n,
 * Zapier templates, custom integrations) auto-populate their event
 * pickers without needing to scrape the OpenAPI spec.
 *
 * Public, no-auth — the event catalog isn't sensitive (event names
 * are documented anyway), and consumers often want to fetch this
 * before they have a workspace API key.
 */
import { NextResponse } from "next/server"
import { ALL_WEBHOOK_EVENTS, WEBHOOK_PAYLOAD_VERSION } from "@/lib/webhooks-types"

export const runtime = "nodejs"
export const dynamic = "force-static"
export const revalidate = 3600

const DESCRIPTIONS: Record<string, string> = {
  "task.created": "A task was created. Includes the full task payload.",
  "task.updated": "A task was modified — title, owner, due date, status, priority, or rock link.",
  "task.deleted": "A task was soft-deleted (moved to trash).",
  "rock.created": "A new quarterly rock was added.",
  "rock.updated": "A rock changed — owner, status, progress, or due date.",
  "rock.deleted": "A rock was soft-deleted.",
  "issue.created": "A new IDS issue was logged.",
  "issue.updated": "An issue moved through the IDS pipeline (open → discussing → solved/dropped).",
  "issue.deleted": "An issue was soft-deleted.",
  "note.created": "A note was created.",
  "note.updated": "A note was edited.",
  "note.deleted": "A note was soft-deleted.",
  "l10.concluded": "An L10 leadership meeting was concluded — payload includes todos, headlines, IDS resolved, and avg rating.",
  "scorecard.metric.posted": "A weekly scorecard cell was posted — includes metric id, week start, and value.",
  "milestone.toggled": "A rock milestone flipped between done and not-done.",
  "webhook.test": "Synthetic test event sent from the integrations UI to verify wiring.",
}

export function GET() {
  return NextResponse.json(
    {
      version: WEBHOOK_PAYLOAD_VERSION,
      events: [...ALL_WEBHOOK_EVENTS, "webhook.test"].map((e) => ({
        event: e,
        description: DESCRIPTIONS[e] ?? "—",
      })),
      envelope: {
        // Documented payload shape so consumers know what to verify.
        id: "string | null — webhook_deliveries row id, null on inline + test sends",
        event: "string — see events[]",
        version: "integer — bumped only on envelope changes",
        workspace_id: "uuid",
        created_at: "ISO 8601",
        data: "object — event-specific payload",
      },
      signature: {
        header: "X-Orage-Signature: sha256=<hex>",
        algorithm: "HMAC-SHA-256 of the raw request body using the webhook secret",
      },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    },
  )
}
