"use client"

/**
 * Orage Core · Scorecard client store
 * Weekly metric grid + auto-issue trigger when 2 consecutive reds.
 */

import { create } from "zustand"
import { useIssuesStore } from "@/lib/issues-store"
import { CURRENT_USER } from "@/lib/mock-data"

export type MetricDirection = "up" | "down"
export type MetricSource = "manual" | "stripe" | "ghl" | "n8n" | "ai"
export type CellColor = "green" | "yellow" | "red" | "empty"

export type Metric = {
  id: string
  name: string
  unit: string
  target: number
  direction: MetricDirection
  ownerId: string
  group: string
  source: MetricSource
  notes?: string
}

export type MetricCell = {
  metricId: string
  /** ISO Monday of the week, e.g. 2026-04-25 */
  week: string
  value: number | null
  source: MetricSource
}

/** 13-week Q2 2026 weeks — Mondays. Week 4 = current. */
export const Q_WEEKS: { iso: string; num: number; label: string }[] = [
  { iso: "2026-04-04", num: 14, label: "APR 4" },
  { iso: "2026-04-11", num: 15, label: "APR 11" },
  { iso: "2026-04-18", num: 16, label: "APR 18" },
  { iso: "2026-04-25", num: 17, label: "APR 25" },
  { iso: "2026-05-02", num: 18, label: "MAY 2" },
  { iso: "2026-05-09", num: 19, label: "MAY 9" },
  { iso: "2026-05-16", num: 20, label: "MAY 16" },
  { iso: "2026-05-23", num: 21, label: "MAY 23" },
  { iso: "2026-05-30", num: 22, label: "MAY 30" },
  { iso: "2026-06-06", num: 23, label: "JUN 6" },
  { iso: "2026-06-13", num: 24, label: "JUN 13" },
  { iso: "2026-06-20", num: 25, label: "JUN 20" },
  { iso: "2026-06-27", num: 26, label: "JUN 27" },
]

export const CURRENT_WEEK = "2026-04-25"

const SEED_METRICS: Metric[] = []

function seedCells(): MetricCell[] {
  const cells: MetricCell[] = []
  const seed: Record<string, (number | null)[]> = {
    m_disco: [10, 9, 4, 3, null, null, null, null, null, null, null, null, null],
    m_mrr: [9, 10, 11, 11, null, null, null, null, null, null, null, null, null],
    m_cycle: [19, 22, 31, 34, null, null, null, null, null, null, null, null, null],
    m_nps: [68, 70, 72, 74, null, null, null, null, null, null, null, null, null],
    m_retain: [96, 96, 97, 96, null, null, null, null, null, null, null, null, null],
    m_velocity: [85, 82, 78, 71, null, null, null, null, null, null, null, null, null],
    m_ontime: [88, 87, 82, 86, null, null, null, null, null, null, null, null, null],
    m_boomer: [61, 75, 86, 93, null, null, null, null, null, null, null, null, null],
  }
  Object.entries(seed).forEach(([metricId, values]) => {
    values.forEach((v, idx) => {
      cells.push({
        metricId,
        week: Q_WEEKS[idx].iso,
        value: v,
        source: v == null ? "manual" : metricId === "m_mrr" || metricId === "m_boomer" ? "stripe" : "manual",
      })
    })
  })
  return cells
}

export function colorForCell(
  value: number | null,
  target: number,
  direction: MetricDirection,
): CellColor {
  if (value == null) return "empty"
  if (direction === "up") {
    const ratio = value / target
    if (ratio >= 1) return "green"
    if (ratio >= 0.8) return "yellow"
    return "red"
  }
  // direction === "down" — lower is better
  if (value <= target) return "green"
  if (value <= target * 1.2) return "yellow"
  return "red"
}

type ScorecardState = {
  metrics: Metric[]
  cells: MetricCell[]
  drawerMetricId: string | null
  newMetricOpen: boolean
  filterRedOnly: boolean

  openDrawer: (id: string) => void
  closeDrawer: () => void
  openNewMetric: () => void
  closeNewMetric: () => void
  setFilterRedOnly: (v: boolean) => void

  setCellValue: (
    metricId: string,
    week: string,
    value: number | null,
    actor: { id: string; name: string },
  ) => void

  createMetric: (input: Omit<Metric, "id">) => string
}

export const useScorecardStore = create<ScorecardState>((set, get) => ({
  metrics: [...SEED_METRICS],
  cells: seedCells(),
  drawerMetricId: null,
  newMetricOpen: false,
  filterRedOnly: false,

  openDrawer: (id) => set({ drawerMetricId: id }),
  closeDrawer: () => set({ drawerMetricId: null }),
  openNewMetric: () => set({ newMetricOpen: true }),
  closeNewMetric: () => set({ newMetricOpen: false }),
  setFilterRedOnly: (v) => set({ filterRedOnly: v }),

  setCellValue: (metricId, week, value, actor) => {
    const metric = get().metrics.find((m) => m.id === metricId)
    if (!metric) return
    set((state) => {
      const exists = state.cells.find(
        (c) => c.metricId === metricId && c.week === week,
      )
      const next: MetricCell = {
        metricId,
        week,
        value,
        source: "manual",
      }
      const cells = exists
        ? state.cells.map((c) =>
            c.metricId === metricId && c.week === week ? next : c,
          )
        : [...state.cells, next]
      return { cells }
    })

    // Auto-issue: if current and previous week are both red → ensure an issue exists.
    const after = get().cells
    const idx = Q_WEEKS.findIndex((w) => w.iso === week)
    if (idx <= 0) return
    const prevWeek = Q_WEEKS[idx - 1].iso
    const cur = after.find((c) => c.metricId === metricId && c.week === week)
    const prev = after.find((c) => c.metricId === metricId && c.week === prevWeek)
    if (!cur || !prev) return
    const curColor = colorForCell(cur.value, metric.target, metric.direction)
    const prevColor = colorForCell(prev.value, metric.target, metric.direction)
    if (curColor === "red" && prevColor === "red") {
      const existing = useIssuesStore
        .getState()
        .issues.find(
          (i) =>
            i.linkedMetricId === metricId &&
            (i.queue === "open" || i.queue === "this_week"),
        )
      if (!existing) {
        const newId = useIssuesStore.getState().createIssue({
          title: `${metric.name} red 2 weeks running`,
          context: `Auto-flagged from Scorecard: ${metric.name} has been red two consecutive weeks. Target ${metric.target}${metric.unit}.`,
          severity: "high",
          ownerId: metric.ownerId,
          authorLabel: "SCORECARD",
        })
        // Re-tag as scorecard source + link to the metric
        useIssuesStore.setState((s) => ({
          issues: s.issues.map((i) =>
            i.id === newId
              ? {
                  ...i,
                  source: "scorecard" as const,
                  sourceLabel: "SCORECARD AUTO",
                  linkedMetricId: metricId,
                }
              : i,
          ),
        }))
        void actor
      }
    }
  },

  createMetric: (input) => {
    const id = `m_${Math.random().toString(36).slice(2, 8)}`
    set((s) => ({ metrics: [...s.metrics, { ...input, id }] }))
    return id
  },
}))

export function getCell(
  cells: MetricCell[],
  metricId: string,
  week: string,
): MetricCell | undefined {
  return cells.find((c) => c.metricId === metricId && c.week === week)
}

export function metricCellsOrdered(
  cells: MetricCell[],
  metricId: string,
): MetricCell[] {
  return Q_WEEKS.map(
    (w) =>
      cells.find((c) => c.metricId === metricId && c.week === w.iso) ?? {
        metricId,
        week: w.iso,
        value: null,
        source: "manual" as const,
      },
  )
}

export function metricsByGroup(metrics: Metric[]): {
  group: string
  metrics: Metric[]
}[] {
  const groups: Record<string, Metric[]> = {}
  metrics.forEach((m) => {
    if (!groups[m.group]) groups[m.group] = []
    groups[m.group].push(m)
  })
  const order = [
    "Sales & Growth",
    "Client Experience",
    "Product & Execution",
    "Boomer AI · Partnership",
  ]
  return order
    .filter((g) => groups[g])
    .map((g) => ({ group: g, metrics: groups[g] }))
    .concat(
      Object.keys(groups)
        .filter((g) => !order.includes(g))
        .map((g) => ({ group: g, metrics: groups[g] })),
    )
}

export function cellEditableBy(
  metric: Metric,
  actor: { id: string; role: string; isMaster: boolean },
): boolean {
  if (actor.isMaster) return true
  if (["founder", "admin", "leader"].includes(actor.role)) return true
  if (actor.role === "member") return metric.ownerId === actor.id
  return false
}

/** Check that scope works at module load — placeholder to avoid tree-shake dead-code warning. */
void CURRENT_USER
