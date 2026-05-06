import "server-only"
import crypto from "crypto"
import { supabaseAdmin } from "@/lib/supabase/admin"

/**
 * Stripe-style Idempotency-Key handling for public POST/PATCH endpoints.
 *
 * Contract:
 *   • Caller supplies `Idempotency-Key: <opaque string up to 255 chars>`
 *     scoped to a single API key.
 *   • First request runs normally. We compute SHA-256(body), call the
 *     handler, then cache (status, response_body) keyed by (api_key_id,
 *     key, body_hash). The cached row TTLs out after 24h via a manual
 *     sweep.
 *   • Second request with the SAME key + SAME body_hash → we replay the
 *     cached response without touching the handler. This is what makes
 *     "I got a 502 mid-request, retry the POST" safe.
 *   • Second request with the same key but DIFFERENT body_hash → 422.
 *     This catches a developer mistake (reusing a key by accident) and
 *     prevents silent data corruption.
 *
 * Behavior on missing header: handler runs unconditionally. The header
 * is opt-in so existing integrations don't break.
 */

const KEY_HEADER = "idempotency-key"

export type IdempotencyDecision =
  | { kind: "no-key" }
  | { kind: "replay"; status: number; body: unknown }
  | { kind: "conflict"; message: string }
  | {
      kind: "first-time"
      key: string
      bodyHash: string
      record: (status: number, body: unknown) => Promise<void>
    }

export async function checkIdempotency(
  req: Request,
  apiKeyId: string,
  rawBody: string,
): Promise<IdempotencyDecision> {
  const key = req.headers.get(KEY_HEADER)
  if (!key) return { kind: "no-key" }
  if (key.length > 255) {
    return { kind: "conflict", message: "Idempotency-Key too long (max 255 chars)" }
  }
  const bodyHash = crypto.createHash("sha256").update(rawBody).digest("hex")
  const sb = supabaseAdmin()

  const { data: existing } = await sb
    .from("idempotency_keys")
    .select("body_hash, status_code, response_body")
    .eq("api_key_id", apiKeyId)
    .eq("key", key)
    .maybeSingle()

  if (existing) {
    if ((existing.body_hash as string) !== bodyHash) {
      return {
        kind: "conflict",
        message:
          "This Idempotency-Key was used with a different request body. Use a fresh key for a different request.",
      }
    }
    return {
      kind: "replay",
      status: existing.status_code as number,
      body: existing.response_body,
    }
  }

  return {
    kind: "first-time",
    key,
    bodyHash,
    async record(status, body) {
      // Best-effort cache write. A second concurrent first-time request
      // with the same key will trigger PK violation here; that's fine —
      // the loser just returns the response it already produced.
      await sb
        .from("idempotency_keys")
        .insert({
          api_key_id: apiKeyId,
          key,
          body_hash: bodyHash,
          status_code: status,
          response_body: body,
        })
    },
  }
}

export function idempotencyReplayResponse(
  status: number,
  body: unknown,
  extraHeaders: HeadersInit = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Idempotent-Replay": "true",
      ...extraHeaders,
    },
  })
}
