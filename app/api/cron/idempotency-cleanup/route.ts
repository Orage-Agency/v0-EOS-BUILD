/**
 * Garbage-collect idempotency_keys rows older than 24 hours so the
 * table doesn't balloon. Stripe uses the same 24h TTL — long enough
 * for the longest realistic retry storm, short enough to keep storage
 * bounded.
 *
 * Schedule: daily via vercel.json. The query is fast (indexed on
 * created_at) so a daily run keeps the table within a few thousand
 * rows in steady state.
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
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { error, count } = await sb
    .from("idempotency_keys")
    .delete({ count: "exact" })
    .lt("created_at", cutoff)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, deleted: count ?? 0 })
}
