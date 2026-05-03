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
import { sendEmail, htmlToText } from "@/lib/email"
import { digestEmail } from "@/lib/email-templates"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

function fmtRelative(iso: string): string {
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return ""
  const diffSec = Math.round((Date.now() - ts) / 1000)
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return `${Math.round(diffHr / 24)}d ago`
}

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

  // Resolve recipient profiles + workspace names so we can address the email.
  const recipientIds = Array.from(byRecipient.keys())
  const tenantIds = Array.from(new Set(rows.map((r) => r.tenant_id)))
  const [{ data: profiles }, { data: workspaces }] = await Promise.all([
    sb
      .from("profiles")
      .select("id, email, full_name")
      .in("id", recipientIds),
    sb
      .from("workspaces")
      .select("id, name, slug")
      .in("id", tenantIds),
  ])
  const profileById = new Map(
    ((profiles ?? []) as Array<{ id: string; email: string; full_name: string | null }>).map(
      (p) => [p.id, p],
    ),
  )
  const workspaceById = new Map(
    ((workspaces ?? []) as Array<{ id: string; name: string; slug: string }>).map((w) => [
      w.id,
      w,
    ]),
  )

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

  let sentCount = 0
  let skippedCount = 0
  const emailedIds: string[] = []
  for (const [recipientId, items] of byRecipient.entries()) {
    const profile = profileById.get(recipientId)
    if (!profile?.email) {
      skippedCount++
      continue
    }
    // All notifications in this recipient's batch share the workspace if the
    // user is in one; if multiple workspaces appear (rare — same email across
    // tenants), pick the workspace of the first item.
    const ws = workspaceById.get(items[0].tenant_id)
    const wsName = ws?.name ?? "your workspace"
    const inboxUrl = ws ? `${appUrl}/${ws.slug}/inbox` : `${appUrl}/`

    const { subject, html } = digestEmail({
      recipientName: profile.full_name ?? profile.email,
      workspaceName: wsName,
      inboxUrl,
      items: items.map((i) => ({
        title: i.title,
        body: i.body,
        relativeTime: fmtRelative(i.created_at),
      })),
    })

    const result = await sendEmail({
      to: profile.email,
      subject,
      html,
      text: htmlToText(html),
    })
    if (result.ok) {
      sentCount++
      for (const i of items) emailedIds.push(i.id)
    } else {
      console.error("[cron/daily-digest] send failed", {
        recipientId,
        error: result.error,
      })
    }
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
    sent: sentCount,
    skipped: skippedCount,
    items: rows.length,
  })
}
