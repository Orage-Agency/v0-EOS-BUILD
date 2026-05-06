/**
 * Drift sweep — once a day, look for the kinds of "things are quietly going
 * sideways" that the EOS rhythm is supposed to surface, and turn each one
 * into an inbox notification for the right owner.
 *
 * What counts as drift right now:
 *   1. ROCKS AT RISK — status = at_risk or off_track AND no `drift_rock`
 *      notification raised in the past 7 days.
 *   2. ROCK VELOCITY — progress < expected_progress - 20 percentage points,
 *      where expected_progress = days_elapsed_in_quarter / 90 * 100.
 *      ("you're 60 days in but only 30% done" beats "the status field
 *      hasn't been updated.")
 *   3. SCORECARD MISS — most-recent week's cell below `target` for 2+
 *      consecutive weeks, on metrics with a numeric target. (Single-week
 *      misses are noise — two weeks is a pattern.)
 *   4. VTO STALE — workspaces.vto_data.updated_at older than 90 days, or
 *      missing entirely on a workspace that's past its first 14 days.
 *
 * The welcome step of the onboarding wizard promises an "AI that watches
 * everything for drift." This cron is what makes that true. It wires
 * directly into the existing notifications + email-digest stack — drift
 * notifications appear in /inbox and roll into the daily-digest email.
 *
 * Idempotency: each candidate is keyed by (entity_type, entity_id), and
 * we skip any candidate that already produced a `drift_*` notification in
 * the last 7 days. Safe to run hourly; default schedule is daily.
 */
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

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

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000

type Rock = {
  id: string
  tenant_id: string
  title: string
  owner_id: string | null
  status: string | null
  progress: number | null
  start_date: string | null
  due_date: string | null
}

type ScorecardRow = {
  id: string
  tenant_id: string
  metric_id: string
  week_start: string
  value: number | null
}

type Metric = {
  id: string
  tenant_id: string
  name: string
  owner_id: string | null
  target: number | null
  comparator: string | null
}

type Workspace = {
  id: string
  name: string
  vto_data: { updated_at?: string } | null
  created_at: string
}

async function alreadyNotified(
  sb: ReturnType<typeof supabaseAdmin>,
  entityType: string,
  entityIds: string[],
  kindPrefix: string,
): Promise<Set<string>> {
  if (entityIds.length === 0) return new Set()
  const since = new Date(Date.now() - SEVEN_DAYS_MS).toISOString()
  const { data } = await sb
    .from("notifications")
    .select("entity_id, kind")
    .eq("entity_type", entityType)
    .like("kind", `${kindPrefix}%`)
    .in("entity_id", entityIds)
    .gte("created_at", since)
  return new Set(
    ((data ?? []) as Array<{ entity_id: string }>).map((r) => r.entity_id),
  )
}

async function notify(
  sb: ReturnType<typeof supabaseAdmin>,
  args: {
    tenant_id: string
    recipient_id: string
    kind: string
    entity_type: string
    entity_id: string
    title: string
    body: string
    link?: string | null
  },
): Promise<boolean> {
  const { error } = await sb.from("notifications").insert({
    tenant_id: args.tenant_id,
    recipient_id: args.recipient_id,
    actor_id: null,
    kind: args.kind,
    entity_type: args.entity_type,
    entity_id: args.entity_id,
    title: args.title,
    body: args.body,
    link: args.link ?? null,
  })
  return !error
}

/**
 * Map a drift notification to the URL the inbox card should jump to.
 * The cron runs without HTTP context so we have to compute the
 * workspace slug from the tenant_id — kept as a small helper to avoid
 * leaking that lookup into every call site.
 */
async function buildLink(
  sb: ReturnType<typeof supabaseAdmin>,
  workspaceId: string,
  entityType: "rock" | "metric" | "workspace",
): Promise<string | null> {
  const { data } = await sb
    .from("workspaces")
    .select("slug")
    .eq("id", workspaceId)
    .maybeSingle()
  const slug = data?.slug as string | undefined
  if (!slug) return null
  switch (entityType) {
    case "rock":
      return `/${slug}/rocks`
    case "metric":
      return `/${slug}/scorecard`
    case "workspace":
      return `/${slug}/vto`
  }
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const sb = supabaseAdmin()
  const counters = { rocks: 0, velocity: 0, scorecard: 0, vto: 0 }

  // Cache slug-by-workspace lookups so each kind of drift loop doesn't
  // re-query workspaces N times. Populated lazily.
  const linkCache = new Map<string, string | null>()
  async function linkFor(
    workspaceId: string,
    entityType: "rock" | "metric" | "workspace",
  ): Promise<string | null> {
    const key = `${workspaceId}:${entityType}`
    const cached = linkCache.get(key)
    if (cached !== undefined) return cached
    const link = await buildLink(sb, workspaceId, entityType)
    linkCache.set(key, link)
    return link
  }

  // ─── ROCK CHECKS (at risk + slow velocity) ───
  const { data: rocksData } = await sb
    .from("rocks")
    .select("id, tenant_id, title, owner_id, status, progress, start_date, due_date")
    .neq("status", "done")
    .not("owner_id", "is", null)
    .limit(2000)
  const rocks = (rocksData ?? []) as Rock[]
  const rockIds = rocks.map((r) => r.id)
  const rockSeen = await alreadyNotified(sb, "rock", rockIds, "drift_rock")

  for (const r of rocks) {
    if (!r.owner_id) continue
    if (rockSeen.has(r.id)) continue

    if (r.status === "at_risk" || r.status === "off_track") {
      const ok = await notify(sb, {
        tenant_id: r.tenant_id,
        recipient_id: r.owner_id,
        kind: "drift_rock_status",
        entity_type: "rock",
        entity_id: r.id,
        title: `Rock at ${r.status === "off_track" ? "off-track" : "risk"}`,
        body: r.title,
        link: await linkFor(r.tenant_id, "rock"),
      })
      if (ok) {
        counters.rocks++
        rockSeen.add(r.id)
        continue
      }
    }

    // Velocity check — skip rocks without a start/due date or progress.
    if (
      r.start_date &&
      r.due_date &&
      typeof r.progress === "number"
    ) {
      const start = new Date(r.start_date).getTime()
      const due = new Date(r.due_date).getTime()
      const span = due - start
      if (span > 0) {
        const elapsed = Math.max(0, Date.now() - start)
        const expectedPct = Math.min(100, (elapsed / span) * 100)
        const lag = expectedPct - r.progress
        if (lag >= 20 && expectedPct >= 25) {
          const ok = await notify(sb, {
            tenant_id: r.tenant_id,
            recipient_id: r.owner_id,
            kind: "drift_rock_velocity",
            entity_type: "rock",
            entity_id: r.id,
            title: "Rock falling behind pace",
            body: `${r.title} — ${Math.round(r.progress)}% complete vs ${Math.round(expectedPct)}% expected`,
            link: await linkFor(r.tenant_id, "rock"),
          })
          if (ok) {
            counters.velocity++
            rockSeen.add(r.id)
          }
        }
      }
    }
  }

  // ─── SCORECARD MISS (2+ consecutive weeks below target) ───
  const { data: metricsData } = await sb
    .from("metrics")
    .select("id, tenant_id, name, owner_id, target, comparator")
    .not("target", "is", null)
    .not("owner_id", "is", null)
    .limit(2000)
  const metrics = (metricsData ?? []) as Metric[]
  const metricSeen = await alreadyNotified(
    sb,
    "metric",
    metrics.map((m) => m.id),
    "drift_scorecard",
  )

  for (const m of metrics) {
    if (!m.owner_id || metricSeen.has(m.id)) continue
    const { data: cells } = await sb
      .from("scorecard_cells")
      .select("id, tenant_id, metric_id, week_start, value")
      .eq("metric_id", m.id)
      .order("week_start", { ascending: false })
      .limit(2)
    const recent = (cells ?? []) as ScorecardRow[]
    if (recent.length < 2) continue
    const target = m.target ?? 0
    const cmp = (m.comparator ?? "gte") as string
    const isMiss = (v: number | null) => {
      if (v === null) return false
      switch (cmp) {
        case "gte":
        case "gt":
          return v < target
        case "lte":
        case "lt":
          return v > target
        case "eq":
          return v !== target
        default:
          return v < target
      }
    }
    if (recent.every((c) => isMiss(c.value))) {
      const ok = await notify(sb, {
        tenant_id: m.tenant_id,
        recipient_id: m.owner_id,
        kind: "drift_scorecard_miss",
        entity_type: "metric",
        entity_id: m.id,
        title: `${m.name} missed target 2 weeks running`,
        body: `Latest: ${recent[0].value ?? "—"} vs target ${target}`,
        link: await linkFor(m.tenant_id, "metric"),
      })
      if (ok) counters.scorecard++
    }
  }

  // ─── VTO STALENESS ───
  const { data: workspacesData } = await sb
    .from("workspaces")
    .select("id, name, vto_data, created_at")
    .limit(2000)
  const workspaces = (workspacesData ?? []) as Workspace[]
  const wsSeen = await alreadyNotified(
    sb,
    "workspace",
    workspaces.map((w) => w.id),
    "drift_vto",
  )

  for (const w of workspaces) {
    if (wsSeen.has(w.id)) continue
    const updatedAtStr = w.vto_data?.updated_at
    const ageMs = updatedAtStr
      ? Date.now() - new Date(updatedAtStr).getTime()
      : Date.now() - new Date(w.created_at).getTime()
    if (ageMs < NINETY_DAYS_MS) continue
    // Skip brand-new workspaces still in their first two weeks — they
    // haven't had a chance to drift yet.
    if (
      !updatedAtStr &&
      Date.now() - new Date(w.created_at).getTime() < 14 * 24 * 60 * 60 * 1000
    ) {
      continue
    }
    // Notify every owner/founder/admin of the workspace.
    const { data: leaders } = await sb
      .from("workspace_memberships")
      .select("user_id, role")
      .eq("workspace_id", w.id)
      .eq("status", "active")
      .in("role", ["owner", "founder", "admin"])
    const vtoLink = await linkFor(w.id, "workspace")
    for (const l of (leaders ?? []) as Array<{ user_id: string }>) {
      const ok = await notify(sb, {
        tenant_id: w.id,
        recipient_id: l.user_id,
        kind: "drift_vto_stale",
        entity_type: "workspace",
        entity_id: w.id,
        title: "VTO hasn't moved in 90+ days",
        body: `${w.name} — refresh the vision/traction overview at the next quarterly`,
        link: vtoLink,
      })
      if (ok) counters.vto++
    }
  }

  return NextResponse.json({ ok: true, ...counters })
}
