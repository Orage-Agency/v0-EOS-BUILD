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
  // Look back 7 days so transient send failures get up to a week of
  // retries before we give up. The MAX_ATTEMPTS gate stops us from
  // pinging the same broken row forever.
  const lookback = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const MAX_ATTEMPTS = 3

  // Page through notifications instead of capping at 2000. A large
  // workspace with thousands of unread notifications would have lost
  // every row past the cap forever.
  const PAGE_SIZE = 1000
  const rows: Pending[] = []
  let offset = 0
  while (true) {
    const { data, error } = await sb
      .from("notifications")
      .select("id, recipient_id, tenant_id, kind, title, body, created_at")
      .gte("created_at", lookback)
      .is("emailed_at", null)
      .lt("email_attempts", MAX_ATTEMPTS)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)
    if (error) {
      console.error("[cron/daily-digest] read failed", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    const page = (data ?? []) as Pending[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
    offset += PAGE_SIZE
    if (offset >= 50_000) break
  }

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
        .select("id, email, full_name, notification_prefs")
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
    ((profiles ?? []) as Array<{
      id: string
      email: string
      full_name: string | null
      notification_prefs: Record<string, { email?: boolean }> | null
    }>).map((p) => [p.id, p]),
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
  let failedCount = 0
  const emailedIds: string[] = []
  const attemptedIds: string[] = []
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

    // Filter out items whose kind the recipient has opted out of email.
    // Missing entries default to enabled (opt-out model).
    const allowedItems = items.filter((i) => {
      const k = profile.notification_prefs?.[i.kind]
      if (!k) return true
      return k.email === undefined ? true : k.email
    })
    if (allowedItems.length === 0) {
      // The user has opted out of email for every kind in this batch.
      // Treat the rows as consumed (the in-app notification still
      // exists; we just won't email about them) so the next cron tick
      // doesn't re-evaluate the same opt-outs.
      for (const i of items) {
        attemptedIds.push(i.id)
        emailedIds.push(i.id)
      }
      skippedCount++
      continue
    }

    const { subject, html } = digestEmail({
      recipientName: profile.full_name ?? profile.email,
      workspaceName: wsName,
      inboxUrl,
      items: allowedItems.map((i) => ({
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
    // Every send is an attempt — bump the counter regardless of outcome
    // so a hard-failing row eventually trips MAX_ATTEMPTS and stops
    // retrying. emailed_at only stamps on success.
    for (const i of items) attemptedIds.push(i.id)
    if (result.ok) {
      sentCount++
      for (const i of items) emailedIds.push(i.id)
    } else {
      failedCount++
      console.error("[cron/daily-digest] send failed", {
        recipientId,
        error: result.error,
      })
    }
  }

  // Bump email_attempts on every row we tried to send — this lets the
  // next cron run skip rows that have already maxed out their retries.
  if (attemptedIds.length > 0) {
    const nowIso = new Date().toISOString()
    // Postgres doesn't support `column = column + 1` directly through
    // PostgREST update with .in(...), so use the RPC-equivalent pattern
    // via raw SQL inside Supabase's `rpc` is overkill — instead we
    // fetch current attempts then write batched updates. With small
    // batches this is fine.
    const { data: existing } = await sb
      .from("notifications")
      .select("id, email_attempts")
      .in("id", attemptedIds)
    const updates = ((existing ?? []) as Array<{
      id: string
      email_attempts: number
    }>).map((row) => ({
      id: row.id,
      email_attempts: (row.email_attempts ?? 0) + 1,
      last_email_attempt_at: nowIso,
    }))
    if (updates.length > 0) {
      // upsert keeps it a single round-trip vs N updates.
      await sb.from("notifications").upsert(updates, { onConflict: "id" })
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
    failed: failedCount,
    skipped: skippedCount,
    items: rows.length,
  })
}
