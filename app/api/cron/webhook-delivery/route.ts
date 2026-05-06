/**
 * Webhook delivery cron — picks up to N pending deliveries, POSTs each
 * to the consumer's URL with an HMAC signature, and updates state.
 *
 * Failure handling: exponential backoff via `next_attempt_at`, and after
 * 5 failed attempts the row stops being eligible (the partial index in
 * the schema gates on attempts < 5). The webhook row's
 * consecutive_failures counter accumulates so the UI can warn when a
 * subscription has been broken for a while.
 *
 * Schedule:
 *   • Primary driver: Supabase pg_cron job `orage-webhook-delivery`
 *     pokes this endpoint every minute (see migration
 *     20260505000001). Drives the documented backoff ladder
 *     (30s → 2m → 8m → 30m → 2h) at minute granularity.
 *   • Belt-and-suspenders: vercel.json schedules a daily run so any
 *     deliveries that land in the queue while pg_cron is paused (e.g.
 *     during a Supabase maintenance window) still drain within 24h.
 */
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { signPayload } from "@/lib/webhooks"
import { WEBHOOK_PAYLOAD_VERSION } from "@/lib/webhooks-types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === "production") return false
    return true
  }
  const auth = req.headers.get("authorization") ?? ""
  return auth === `Bearer ${secret}`
}

const BATCH_SIZE = 25
const MAX_ATTEMPTS = 5

function backoffSeconds(attemptCount: number): number {
  // 30s, 2m, 8m, 30m, 2h
  const ladder = [30, 120, 480, 1800, 7200]
  return ladder[Math.min(attemptCount, ladder.length - 1)]
}

type Pending = {
  id: string
  webhook_id: string
  workspace_id: string
  event_type: string
  payload: Record<string, unknown>
  attempts: number
}

type Webhook = {
  id: string
  target_url: string
  secret: string
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const sb = supabaseAdmin()
  const nowIso = new Date().toISOString()

  const { data: pending } = await sb
    .from("webhook_deliveries")
    .select("id, webhook_id, workspace_id, event_type, payload, attempts")
    .is("delivered_at", null)
    .lt("attempts", MAX_ATTEMPTS)
    .lte("next_attempt_at", nowIso)
    .order("next_attempt_at", { ascending: true })
    .limit(BATCH_SIZE)

  const rows = (pending ?? []) as Pending[]
  if (rows.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  // Fetch the webhook configs for the rows we're about to deliver.
  const webhookIds = Array.from(new Set(rows.map((r) => r.webhook_id)))
  const { data: hooks } = await sb
    .from("webhooks")
    .select("id, target_url, secret")
    .in("id", webhookIds)
  const hookById = new Map<string, Webhook>(
    ((hooks ?? []) as Webhook[]).map((h) => [h.id, h]),
  )

  let success = 0
  let failure = 0

  for (const r of rows) {
    const hook = hookById.get(r.webhook_id)
    if (!hook) {
      // Webhook deleted between enqueue and delivery — mark consumed.
      await sb
        .from("webhook_deliveries")
        .update({
          delivered_at: nowIso,
          last_attempt_at: nowIso,
          last_error: "webhook deleted",
        })
        .eq("id", r.id)
      failure++
      continue
    }

    const body = JSON.stringify({
      id: r.id,
      event: r.event_type,
      version: WEBHOOK_PAYLOAD_VERSION,
      workspace_id: r.workspace_id,
      created_at: nowIso,
      data: r.payload,
    })
    const signature = signPayload(hook.secret, body)
    let status = 0
    let errorMsg: string | null = null
    try {
      const res = await fetch(hook.target_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Orage-Core-Webhooks/1",
          "X-Orage-Event": r.event_type,
          "X-Orage-Delivery": r.id,
          "X-Orage-Signature": `sha256=${signature}`,
        },
        body,
        // Hard timeout — a slow consumer shouldn't hold the cron loop.
        signal: AbortSignal.timeout(10_000),
      })
      status = res.status
      if (status < 200 || status >= 300) {
        errorMsg = `HTTP ${status}`
      }
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : "fetch failed"
    }

    const attempts = r.attempts + 1
    const ok = status >= 200 && status < 300
    if (ok) {
      success++
      await sb
        .from("webhook_deliveries")
        .update({
          delivered_at: nowIso,
          last_attempt_at: nowIso,
          last_status: status,
          attempts,
        })
        .eq("id", r.id)
      // Reset the webhook's failure counter on a successful delivery.
      await sb
        .from("webhooks")
        .update({
          last_delivered_at: nowIso,
          last_delivery_status: status,
          consecutive_failures: 0,
        })
        .eq("id", hook.id)
    } else {
      failure++
      const next = new Date(Date.now() + backoffSeconds(attempts) * 1000).toISOString()
      await sb
        .from("webhook_deliveries")
        .update({
          last_attempt_at: nowIso,
          last_status: status || null,
          last_error: errorMsg,
          attempts,
          next_attempt_at: next,
        })
        .eq("id", r.id)
      // Bump the webhook's failure streak so the UI can warn.
      const { data: existing } = await sb
        .from("webhooks")
        .select("consecutive_failures")
        .eq("id", hook.id)
        .maybeSingle()
      const streak = ((existing?.consecutive_failures as number) ?? 0) + 1
      await sb
        .from("webhooks")
        .update({
          last_delivered_at: nowIso,
          last_delivery_status: status || null,
          consecutive_failures: streak,
        })
        .eq("id", hook.id)
    }
  }

  return NextResponse.json({
    ok: true,
    processed: rows.length,
    success,
    failure,
  })
}
