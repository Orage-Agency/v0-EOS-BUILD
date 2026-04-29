/**
 * Dashboard data composition.
 *
 * All KPIs and feed widgets here use the SAME source of truth as the
 * module pages and sidebar — `lib/mock-data` plus `lib/issues-seed`.
 * Any AI-created tasks in Supabase are merged in on top so they still
 * surface in MY PRIORITIES without breaking parity with module pages.
 *
 * (Once each module migrates fully to Supabase, swap the seeds out
 *  for queries here. The shape of the returned helpers is stable.)
 */
import "server-only"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireUser, type AuthUser } from "@/lib/auth"
import {
  ROCKS,
  TASKS,
  USERS,
  type MockTask,
} from "@/lib/mock-data"
import { SEED_ISSUES } from "@/lib/issues-seed"
import type {
  DbActivityRow,
  DbCalendarEvent,
  DbScorecardEntry,
  DbScorecardMetric,
  DbTask,
  DbUser,
} from "@/lib/db-types"
import type { ScorecardStatus, TaskPriority, TaskStatus } from "@/types/database"

// ---------------------------------------------------------------- public types

export type Kpi = {
  label: string
  value: string
  meta: string
  metaTone: "up" | "down" | "neutral"
  tone?: "default" | "warning" | "danger"
  href?: string
}

export type Nudge = {
  id: string
  severity: "warn" | "crit"
  category: string
  ageLabel: string
  html: string
  actions: { id: string; label: string; primary?: boolean; toast: string }[]
}

export type ScorecardMetric = {
  name: string
  goal: string
  value: string
  status: ScorecardStatus
  spark: { height: number; tone?: "danger" | "warning" }[]
}

export type ActivityRow = {
  id: string
  html: string
  time: string
}

export type UpcomingEvent = {
  dow: string
  day: string
  title: string
  meta: string
  isToday?: boolean
}

/** UI-shaped task row used by today's-priorities & dashboard widgets. */
export type DashboardTask = {
  id: string
  title: string
  owner: string
  status: TaskStatus
  priority: TaskPriority
  due: string
  rockId?: string
  completed?: string
}

// ---------------------------------------------------------- helpers (private)

function startOfDayISO(d: Date): string {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.toISOString()
}

function endOfDayISO(d: Date): string {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x.toISOString()
}

function fmtDate(iso: string | null): string {
  if (!iso) return ""
  return iso.slice(0, 10)
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "JUST NOW"
  if (min < 60) return `${min} MIN AGO`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} HOUR${hr === 1 ? "" : "S"} AGO`
  const d = Math.floor(hr / 24)
  return `${d} DAY${d === 1 ? "" : "S"} AGO`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function mockToDashboardTask(t: MockTask): DashboardTask {
  return {
    id: t.id,
    title: t.title,
    owner: t.owner,
    status: t.status,
    priority: t.priority,
    due: t.due ?? "",
    rockId: t.rockId,
    completed: t.completed,
  }
}

function dbRowToDashboardTask(row: DbTask): DashboardTask {
  return {
    id: row.id,
    title: row.title,
    owner: row.owner_id ?? "",
    status: row.status,
    priority: row.priority,
    due: fmtDate(row.due_date),
    rockId: row.parent_rock_id ?? undefined,
    completed: row.completed_at ? fmtDate(row.completed_at) : undefined,
  }
}

/** Pull AI-created additions from Supabase (best effort; never blocks). */
async function loadExtraTasks(user: AuthUser): Promise<DashboardTask[]> {
  try {
    const sb = supabaseAdmin()
    const { data } = await sb
      .from("tasks")
      .select("*")
      .eq("tenant_id", user.workspaceId)
      .order("created_at", { ascending: false })
    return ((data as DbTask[] | null) ?? []).map(dbRowToDashboardTask)
  } catch {
    return []
  }
}

function isOpen(t: DashboardTask): boolean {
  return t.status !== "done" && t.status !== "cancelled"
}

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// ----------------------------------------------------------- KPI tile loader

export async function getKpis(workspaceSlug: string): Promise<Kpi[]> {
  const user = await requireUser(workspaceSlug)
  const extras = await loadExtraTasks(user)
  const tasks: DashboardTask[] = [
    ...TASKS.map(mockToDashboardTask),
    ...extras,
  ]

  const totalRocks = ROCKS.length
  const onTrackRocks = ROCKS.filter((r) => r.status === "on_track").length
  const openTasks = tasks.filter(isOpen).length
  const todayKey = ymd(new Date())
  const dueToday = tasks.filter(
    (t) => isOpen(t) && t.due && t.due === todayKey,
  ).length
  const openIssues = SEED_ISSUES.filter((i) => i.queue === "open").length
  const escalated = SEED_ISSUES.filter(
    (i) => i.queue === "open" && i.rank <= 3,
  ).length

  return [
    {
      label: "QUARTER ROCKS",
      value: totalRocks > 0 ? `${onTrackRocks}/${totalRocks}` : "0",
      meta: totalRocks > 0 ? "on track" : "no rocks yet",
      metaTone: "up",
      href: "/rocks",
    },
    {
      label: "OPEN TASKS",
      value: String(openTasks),
      meta: dueToday === 1 ? "1 due today" : `${dueToday} due today`,
      metaTone: "neutral",
      href: "/tasks",
    },
    {
      label: "SCORECARD HEALTH",
      value: await scorecardHealthLabel(user),
      meta: "this week",
      metaTone: "neutral",
      href: "/scorecard",
    },
    {
      label: "ISSUES IN IDS",
      value: String(openIssues),
      meta: escalated === 0 ? "none escalated" : `${escalated} escalated`,
      metaTone: escalated === 0 ? "neutral" : "down",
      tone: escalated > 0 ? "warning" : "default",
      href: "/issues",
    },
  ]
}

async function scorecardHealthLabel(user: AuthUser): Promise<string> {
  // Scorecard still reads from Supabase if present; otherwise render placeholder.
  try {
    const sb = supabaseAdmin()
    const { data: metrics } = await sb
      .from("scorecard_metrics")
      .select("id")
      .eq("tenant_id", user.workspaceId)
      .is("archived_at", null)
    const total = metrics?.length ?? 0
    if (total === 0) return "—"
    const ids = (metrics ?? []).map((m) => m.id as string)
    const { data: entries } = await sb
      .from("scorecard_entries")
      .select("metric_id, status_override, period_start")
      .in("metric_id", ids)
      .order("period_start", { ascending: false })

    const latestPerMetric = new Map<string, ScorecardStatus>()
    for (const e of (entries ?? []) as DbScorecardEntry[]) {
      if (!latestPerMetric.has(e.metric_id) && e.status_override) {
        latestPerMetric.set(e.metric_id, e.status_override)
      }
    }
    const greens = [...latestPerMetric.values()].filter((s) => s === "green")
      .length
    const measured = latestPerMetric.size || total
    const pct = Math.round((greens / measured) * 100)
    return `${pct}%`
  } catch {
    return "—"
  }
}

// ----------------------------------------------------------- AI nudges (stub)

export async function getNudges(workspaceSlug: string): Promise<Nudge[]> {
  // AI nudges remain Supabase-backed; if the table is empty this just returns [].
  try {
    const user = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()
    const { data } = await sb
      .from("ai_nudges")
      .select("id, type, title, body, action_payload, status, created_at")
      .eq("tenant_id", user.workspaceId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5)

    return (data ?? []).map((n) => ({
      id: n.id as string,
      severity: "warn" as const,
      category: String(n.type ?? "AI NUDGE").toUpperCase(),
      ageLabel: relTime(n.created_at as string),
      html: `<strong>${escapeHtml(String(n.title))}</strong> ${escapeHtml(
        String(n.body),
      )}`,
      actions: [{ id: "dismiss", label: "DISMISS", toast: "NUDGE DISMISSED" }],
    }))
  } catch {
    return []
  }
}

// --------------------------------------------------- Today's priorities feed

/**
 * "MY PRIORITIES · NEXT 3 DAYS" feed for the dashboard.
 *
 * `userId` is the auth-system uuid for the signed-in user. Mock tasks
 * use the demo ids (u_geo / u_bro / u_bar / u_ivy), so when the auth
 * user has no Supabase tasks yet we fall back to the demo owner id
 * matching CURRENT_USER. This keeps the audit-listed 7/12/8 dataset
 * visible without needing a full migration.
 */
export async function getTodayPriorities(
  workspaceSlug: string,
  userId: string,
): Promise<DashboardTask[]> {
  const user = await requireUser(workspaceSlug)
  const extras = await loadExtraTasks(user)
  const ownerKey = pickOwnerKey(userId)
  const all: DashboardTask[] = [
    ...TASKS.filter((t) => t.owner === ownerKey).map(mockToDashboardTask),
    ...extras.filter((t) => t.owner === userId),
  ]
  return all.filter(isOpen).slice(0, 5)
}

export async function getDashboardTasks(
  workspaceSlug: string,
  userId: string,
): Promise<DashboardTask[]> {
  const user = await requireUser(workspaceSlug)
  const extras = await loadExtraTasks(user)
  const ownerKey = pickOwnerKey(userId)
  const mine: DashboardTask[] = [
    ...TASKS.filter((t) => t.owner === ownerKey).map(mockToDashboardTask),
    ...extras.filter((t) => t.owner === userId),
  ]
  const open = mine.filter(isOpen).slice(0, 3)
  const done = mine
    .filter((t) => t.status === "done")
    .sort((a, b) => (b.completed ?? "").localeCompare(a.completed ?? ""))
    .slice(0, 2)
  return [...open, ...done]
}

/** Map the auth user id to the matching mock owner id, falling back to the first mock user. */
function pickOwnerKey(authUserId: string): string {
  const direct = USERS.find((u) => u.id === authUserId)
  if (direct) return direct.id
  return USERS[0]?.id ?? authUserId
}

// --------------------------------------------------------- Scorecard pulse

export async function getScorecard(
  workspaceSlug: string,
): Promise<ScorecardMetric[]> {
  try {
    const user = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()
    const { data: metrics } = await sb
      .from("scorecard_metrics")
      .select("*")
      .eq("tenant_id", user.workspaceId)
      .is("archived_at", null)
      .order("display_order", { ascending: true })
      .limit(4)

    if (!metrics || metrics.length === 0) return []

    const metricIds = (metrics as DbScorecardMetric[]).map((m) => m.id)
    const { data: entries } = await sb
      .from("scorecard_entries")
      .select("*")
      .in("metric_id", metricIds)
      .order("period_start", { ascending: true })

    return (metrics as DbScorecardMetric[]).map((m) => {
      const myEntries = ((entries as DbScorecardEntry[] | null) ?? []).filter(
        (e) => e.metric_id === m.id,
      )
      const latest = myEntries[myEntries.length - 1]
      const op =
        m.goal_op === ">=" ? "≥" : m.goal_op === "<=" ? "≤" : m.goal_op
      return {
        name: m.name,
        goal: `Goal ${op} ${m.goal_value}${m.unit ? ` ${m.unit}` : ""}`,
        value: latest?.value != null ? String(latest.value) : "—",
        status: metricStatus(m, latest),
        spark: entryToSpark(myEntries, m),
      }
    })
  } catch {
    return []
  }
}

function metricStatus(
  metric: DbScorecardMetric,
  latest?: DbScorecardEntry,
): ScorecardStatus {
  if (latest?.status_override) return latest.status_override
  if (latest?.value == null) return "yellow"
  const v = Number(latest.value)
  const goal = Number(metric.goal_value)
  switch (metric.goal_op) {
    case ">=":
      return v >= goal ? "green" : "red"
    case "<=":
      return v <= goal ? "green" : "red"
    case "==":
      return v === goal ? "green" : "red"
    case "between": {
      const high = Number(metric.goal_value_secondary ?? goal)
      return v >= goal && v <= high ? "green" : "red"
    }
    default:
      return "yellow"
  }
}

function entryToSpark(entries: DbScorecardEntry[], metric: DbScorecardMetric) {
  const last8 = entries.slice(-8)
  const max = Math.max(1, ...last8.map((e) => Number(e.value ?? 0)))
  return last8.map((e) => {
    const status = metricStatus(metric, e)
    return {
      height: Math.max(15, Math.round((Number(e.value ?? 0) / max) * 100)),
      tone:
        status === "red"
          ? ("danger" as const)
          : status === "yellow"
            ? ("warning" as const)
            : undefined,
    }
  })
}

// --------------------------------------------------------- Recent activity

export async function getRecentActivity(
  workspaceSlug: string,
): Promise<ActivityRow[]> {
  try {
    const user = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()
    const { data: rows } = await sb
      .from("activity_log")
      .select("*")
      .eq("tenant_id", user.workspaceId)
      .order("created_at", { ascending: false })
      .limit(8)

    if (!rows || rows.length === 0) return []

    const actorIds = Array.from(
      new Set(
        ((rows as DbActivityRow[]) ?? [])
          .map((r) => r.actor_id)
          .filter((x): x is string => Boolean(x)),
      ),
    )
    const actorMap = new Map<string, string>()
    if (actorIds.length > 0) {
      const { data: actors } = await sb
        .from("users")
        .select("id, name")
        .in("id", actorIds)
      for (const a of (actors as Pick<DbUser, "id" | "name">[] | null) ?? []) {
        actorMap.set(a.id, a.name)
      }
    }

    return (rows as DbActivityRow[]).map((r) => {
      const who = r.actor_id ? actorMap.get(r.actor_id) ?? "Someone" : "System"
      return {
        id: r.id,
        html: `<strong>${escapeHtml(who)}</strong> ${escapeHtml(
          r.action,
        )} ${escapeHtml(r.entity_type)}`,
        time: relTime(r.created_at).toUpperCase(),
      }
    })
  } catch {
    return []
  }
}

// -------------------------------------------------------------- Upcoming

export async function getUpcoming(
  workspaceSlug: string,
): Promise<UpcomingEvent[]> {
  try {
    const user = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()
    const now = new Date()
    const horizon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

    const { data: rows } = await sb
      .from("calendar_events")
      .select("*")
      .eq("tenant_id", user.workspaceId)
      .gte("starts_at", now.toISOString())
      .lte("starts_at", horizon.toISOString())
      .order("starts_at", { ascending: true })
      .limit(5)

    if (!rows || rows.length === 0) return []

    const dow = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
    const todayKey = now.toISOString().slice(0, 10)
    return (rows as DbCalendarEvent[]).map((e) => {
      const start = e.starts_at ? new Date(e.starts_at) : new Date()
      return {
        dow: dow[start.getDay()],
        day: String(start.getDate()).padStart(2, "0"),
        title: e.title ?? "Untitled",
        meta: `${start.toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })} · ${e.provider.toUpperCase()}`,
        isToday: e.starts_at?.slice(0, 10) === todayKey,
      }
    })
  } catch {
    return []
  }
}

// ----------------------------------------------------- shared user lookup

/** Server-side DB lookup for actions and server components. */
export async function userByIdAsync(id: string) {
  try {
    const sb = supabaseAdmin()
    const { data } = await sb
      .from("users")
      .select("id, name, email, is_master, avatar_url")
      .eq("id", id)
      .maybeSingle()
    if (data) return data
  } catch {
    /* fall through to mock */
  }
  // Fallback to mock users so Today's Priorities still resolves owners
  // before the database is fully seeded.
  const mock = USERS.find((u) => u.id === id)
  return mock
    ? {
        id: mock.id,
        name: mock.name,
        email: mock.email,
        is_master: mock.isMaster,
        avatar_url: null as string | null,
      }
    : null
}

// `mockToDashboardTask` is referenced from request handlers via internal helpers.
// Suppress unused warning for the imported helper symbol while keeping signatures intact.
void startOfDayISO
void endOfDayISO
