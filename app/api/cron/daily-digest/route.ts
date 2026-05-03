/**
 * Daily digest cron — POST a summary of yesterday's audit activity to
 * each member who has unread notifications. Vercel Cron hits this once
 * a day; the schedule lives in vercel.json.
 *
 * For now we mark notifications "emailed_at" so we don't double-send. The
 * actual SMTP/Resend integration is intentionally a single hook so the
 * email vendor can be swapped without rewriting the digest logic.
 */
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

function authorized(req: Request): boolean {
  // Vercel Cron sets `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET
  // is configured in project env. Locally / on first deploy we accept all.
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const auth = req.headers.get("authorization") ?? ""
  return auth === `Bearer ${secret}`
}

type Pending = {
  id: string
  recipient_id: string
  tenant_id: string
  kind: string
  title: string
  body: string | null
  created_at: string
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const sb = supabaseAdmin()
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: pending, error } = await sb
    .from("notifications")
    .select("id, recipient_id, tenant_id, kind, title, body, created_at")
    .gte("created_at", yesterday)
    .is("emailed_at", null)
    .order("created_at", { ascending: false })
    .limit(2000)

  if (error) {
    console.error("[cron/daily-digest] read failed", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (pending ?? []) as Pending[]
  if (rows.length === 0) {
    return NextResponse.json({ ok: true, recipients: 0, items: 0 })
  }

  const byRecipient = new Map<string, Pending[]>()
  for (const r of rows) {
    const arr = byRecipient.get(r.recipient_id) ?? []
    arr.push(r)
    byRecipient.set(r.recipient_id, arr)
  }

  // Email vendor hook — swap when Resend/SMTP is wired.
  // For now we only collect what we WOULD send and mark items emailed.
  const emailedIds: string[] = []
  for (const [recipientId, items] of byRecipient.entries()) {
    const subject = `${items.length} new ${items.length === 1 ? "update" : "updates"} in Orage Core`
    const lines = items.slice(0, 20).map((i) => `• ${i.title}${i.body ? ` — ${i.body}` : ""}`)
    console.log("[cron/daily-digest] would email", {
      recipientId,
      subject,
      preview: lines.slice(0, 3),
    })
    for (const i of items) emailedIds.push(i.id)
  }

  if (emailedIds.length > 0) {
    await sb
      .from("notifications")
      .update({ emailed_at: new Date().toISOString() })
      .in("id", emailedIds)
  }

  return NextResponse.json({
    ok: true,
    recipients: byRecipient.size,
    items: rows.length,
  })
}
