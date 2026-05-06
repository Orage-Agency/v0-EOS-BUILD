/**
 * Garbage-collect webhook_deliveries rows that are either successfully
 * delivered AND older than 30 days, OR dead-lettered (5+ failed
 * attempts) AND older than 30 days.
 *
 * Why 30 days: the redeliver UI in /settings/integrations only shows
 * the last 25 deliveries per webhook anyway, and a month is enough
 * lookback for any incident retro that someone wants to do. After 30
 * days the rows are taking up storage for nothing.
 *
 * Schedule: daily at 18:00 UTC (right after the idempotency cleanup).
 */
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === "production") return false
    return true
  }
  const auth = req.headers.get("authorization") ?? ""
  return auth === `Bearer ${secret}`
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const sb = supabaseAdmin()
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Two cleanup buckets:
  //  1. Successful old deliveries (delivered_at NOT NULL, < cutoff).
  //  2. Dead-lettered old deliveries (delivered_at NULL, attempts >=
  //     5, last_attempt_at < cutoff).
  const { error: e1, count: deliveredDeleted } = await sb
    .from("webhook_deliveries")
    .delete({ count: "exact" })
    .not("delivered_at", "is", null)
    .lt("delivered_at", cutoff)
  if (e1) {
    return NextResponse.json({ error: e1.message }, { status: 500 })
  }
  const { error: e2, count: deadDeleted } = await sb
    .from("webhook_deliveries")
    .delete({ count: "exact" })
    .is("delivered_at", null)
    .gte("attempts", 5)
    .lt("last_attempt_at", cutoff)
  if (e2) {
    return NextResponse.json({ error: e2.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    delivered_deleted: deliveredDeleted ?? 0,
    dead_deleted: deadDeleted ?? 0,
  })
}
