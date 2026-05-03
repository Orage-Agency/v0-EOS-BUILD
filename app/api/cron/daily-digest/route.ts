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
  const secret = process.env.CRON_SECRET
  if (!secret) {
    // In production, missing CRON_SECRET must be a fail-closed default —
    // anyone could otherwise trigger the cron. Local/dev still accepts all
    // so smoke tests aren't blocked by the env var.
    if (process.env.NODE_ENV === "production") return false
    return true
  }
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

  // Bucket by (recipient_id, tenant_id) — a user who is a member of two
  // workspaces gets two separate emails, one per workspace. Mixing them
  // would leak titles/bodies from workspace A into the digest sent for
  // workspace B.
  const byRecipientTenant = new Map<string, Pending[]>()
  const keyFor = (rid: string, tid: string) => `${rid}::${tid}`
  for (const r of rows) {
    const k = keyFor(r.recipient_id, r.tenant_id)
    const arr = byRecipientTenant.get(k) ?? []
    arr.push(r)
    byRecipientTenant.set(k, arr)
  }

  // Resolve recipient profiles + workspace names so we can address the email.
  const recipientIds = Array.from(new Set(rows.map((r) => r.recipient_id)))
  const tenantIds = Array.from(new Set(rows.map((r) => r.tenant_id)))
  const [{ data: profiles }, { data: workspaces }, { data: memberships }] =
    await Promise.all([
      sb
        .from("profiles")
        .select("id, email, full_name")
        .in("id", recipientIds),
      sb
        .from("workspaces")
        .select("id, name, slug")
        .in("id", tenantIds),
      sb
        .from("workspace_memberships")
        .select("user_id, workspace_id")
        .in("user_id", recipientIds)
        .in("workspace_id", tenantIds)
        .eq("status", "active"),
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
  // Set of valid (user, workspace) pairs — anything missing here is a
  // stale notification (recipient is no longer a member) and gets skipped.
  const activeMembership = new Set(
    ((memberships ?? []) as Array<{ user_id: string; workspace_id: string }>).map(
      (m) => keyFor(m.user_id, m.workspace_id),
    ),
  )

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

  let sentCount = 0
  let skippedCount = 0
  const emailedIds: string[] = []
  for (const [k, items] of byRecipientTenant.entries()) {
    const [recipientId, tenantId] = k.split("::")
    if (!activeMembership.has(k)) {
      skippedCount++
      continue
    }
    const profile = profileById.get(recipientId)
    if (!profile?.email) {
      skippedCount++
      continue
    }
    const ws = workspaceById.get(tenantId)
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
    recipients: byRecipientTenant.size,
    sent: sentCount,
    skipped: skippedCount,
    items: rows.length,
  })
}
