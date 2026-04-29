/**
 * Orage Core · Scorecard server-side data helpers
 * Server-only. Seeds scorecard_metrics on first use and maps
 * client metric IDs to real DB UUIDs for entry writes.
 */
import "server-only"

import { requireUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

// Mirror the client-side types to avoid cross-boundary imports from "use client" module
type ScorecardMetric = {
  id: string
  name: string
  unit: string
  target: number
  direction: "up" | "down"
  ownerId: string
  group: string
  source: "manual" | "stripe" | "ghl" | "n8n" | "ai"
  notes?: string
}

type ScorecardCell = {
  metricId: string
  week: string
  value: number | null
  source: "manual" | "stripe" | "ghl" | "n8n" | "ai"
}

const SEED_SPEC = [
  { key: "m_disco",    name: "Discovery Calls",  unit: "",   target: 8,  goalOp: ">=", group: "Sales & Growth",          order: 1 },
  { key: "m_mrr",      name: "MRR",              unit: "K",  target: 15, goalOp: ">=", group: "Sales & Growth",          order: 2 },
  { key: "m_cycle",    name: "Sales Cycle",       unit: "d",  target: 21, goalOp: "<=", group: "Sales & Growth",          order: 3 },
  { key: "m_nps",      name: "NPS Score",         unit: "",   target: 75, goalOp: ">=", group: "Client Experience",       order: 4 },
  { key: "m_retain",   name: "Retention",         unit: "%",  target: 95, goalOp: ">=", group: "Client Experience",       order: 5 },
  { key: "m_velocity", name: "Task Velocity",     unit: "%",  target: 85, goalOp: ">=", group: "Product & Execution",     order: 6 },
  { key: "m_ontime",   name: "On-Time Delivery",  unit: "%",  target: 90, goalOp: ">=", group: "Product & Execution",     order: 7 },
  { key: "m_boomer",   name: "Boomer Pipeline",   unit: "%",  target: 100,goalOp: ">=", group: "Boomer AI · Partnership", order: 8 },
]

const GROUP_MAP: Record<string, string> = {
  m_disco:    "Sales & Growth",
  m_mrr:      "Sales & Growth",
  m_cycle:    "Sales & Growth",
  m_nps:      "Client Experience",
  m_retain:   "Client Experience",
  m_velocity: "Product & Execution",
  m_ontime:   "Product & Execution",
  m_boomer:   "Boomer AI · Partnership",
}

const SOURCE_MAP: Record<string, ScorecardMetric["source"]> = {
  m_mrr:    "stripe",
  m_boomer: "n8n",
}

/**
 * Returns the DB UUID for each client metric key for this tenant.
 * Seeds the metrics into Supabase if this tenant has none yet.
 * Client keys are encoded in the notes column as "key:<clientKey>".
 */
export async function getMetricIdMap(workspaceSlug: string): Promise<Record<string, string>> {
  const user = await requireUser(workspaceSlug)
  const sb = supabaseAdmin()

  const { data: existing } = await sb
    .from("scorecard_metrics")
    .select("id, notes")
    .eq("tenant_id", user.workspaceId)
    .is("archived_at", null)

  const rows = (existing ?? []) as { id: string; notes: string | null }[]

  const map: Record<string, string> = {}
  for (const r of rows) {
    const key = r.notes?.startsWith("key:") ? r.notes.slice(4) : null
    if (key) map[key] = r.id
  }

  const missing = SEED_SPEC.filter((s) => !map[s.key])
  if (missing.length > 0) {
    const { data: inserted } = await sb
      .from("scorecard_metrics")
      .insert(
        missing.map((s) => ({
          tenant_id: user.workspaceId,
          name: s.name,
          unit: s.unit,
          goal_value: s.target,
          goal_op: s.goalOp,
          frequency: "weekly",
          display_order: s.order,
          notes: `key:${s.key}`,
        })),
      )
      .select("id, notes")

    for (const r of (inserted ?? []) as { id: string; notes: string | null }[]) {
      const key = r.notes?.startsWith("key:") ? r.notes.slice(4) : null
      if (key) map[key] = r.id
    }
  }

  return map
}

/**
 * Returns all active metrics + their entries for the current quarter.
 * Seeds metrics on first call. Falls back to empty arrays on error so the
 * client store's SEED_METRICS take over.
 */
export async function listScorecardData(workspaceSlug: string): Promise<{
  metrics: ScorecardMetric[]
  cells: ScorecardCell[]
}> {
  try {
    const idMap = await getMetricIdMap(workspaceSlug)
    const keyByDbId: Record<string, string> = {}
    for (const [key, dbId] of Object.entries(idMap)) keyByDbId[dbId] = key

    const user = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()

    const { data: dbMetrics } = await sb
      .from("scorecard_metrics")
      .select("id, name, unit, goal_value, goal_op, display_order, notes")
      .eq("tenant_id", user.workspaceId)
      .is("archived_at", null)
      .order("display_order", { ascending: true })

    if (!dbMetrics || dbMetrics.length === 0) return { metrics: [], cells: [] }

    const typedMetrics = dbMetrics as {
      id: string
      name: string
      unit: string | null
      goal_value: number
      goal_op: string
      display_order: number
      notes: string | null
    }[]

    const metrics: ScorecardMetric[] = typedMetrics.map((r) => {
      const clientKey = r.notes?.startsWith("key:") ? r.notes.slice(4) : r.id
      return {
        id: clientKey,
        name: r.name,
        unit: r.unit ?? "",
        target: r.goal_value,
        direction: r.goal_op === "<=" ? "down" : "up",
        ownerId: "",
        group: GROUP_MAP[clientKey] ?? "General",
        source: SOURCE_MAP[clientKey] ?? "manual",
      }
    })

    const dbIds = typedMetrics.map((r) => r.id)
    const { data: dbEntries } = await sb
      .from("scorecard_entries")
      .select("metric_id, period_start, value")
      .in("metric_id", dbIds)

    const typedEntries = (dbEntries ?? []) as {
      metric_id: string
      period_start: string
      value: number | null
    }[]

    const cells: ScorecardCell[] = typedEntries.map((e) => ({
      metricId: keyByDbId[e.metric_id] ?? e.metric_id,
      week: e.period_start,
      value: e.value,
      source: "manual" as const,
    }))

    return { metrics, cells }
  } catch (err) {
    console.error("[v0] listScorecardData exception", err)
    return { metrics: [], cells: [] }
  }
}

/**
 * Upserts a scorecard entry for the given client metric key + week.
 */
export async function upsertScorecardEntry(
  workspaceSlug: string,
  clientMetricId: string,
  week: string,
  value: number | null,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const idMap = await getMetricIdMap(workspaceSlug)
    const dbId = idMap[clientMetricId]
    if (!dbId) return { ok: false, error: `Metric ${clientMetricId} not seeded in DB` }

    const sb = supabaseAdmin()
    const { error } = await sb.from("scorecard_entries").upsert(
      { metric_id: dbId, period_start: week, value },
      { onConflict: "metric_id,period_start" },
    )

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}
