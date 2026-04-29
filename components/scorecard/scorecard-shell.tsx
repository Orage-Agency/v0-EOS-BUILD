"use client"

import { useEffect } from "react"
import { useScorecardStore, type Metric, type MetricCell } from "@/lib/scorecard-store"
import { canEditRocks } from "@/lib/permissions"
import { useUIStore } from "@/lib/store"
import { IcPlus } from "@/components/orage/icons"
import { cn } from "@/lib/utils"
import { HealthBar } from "./health-bar"
import { ScorecardGrid } from "./scorecard-grid"
import { InsightsPanel } from "./insights-panel"
import { MetricDrawer } from "./metric-drawer"
import { NewMetricModal } from "./new-metric-modal"

export function ScorecardShell({
  initialMetrics,
  initialCells,
}: {
  initialMetrics?: Metric[]
  initialCells?: MetricCell[]
} = {}) {
  const { metrics, openNewMetric, filterRedOnly, setFilterRedOnly, setMetrics, setCells } =
    useScorecardStore()
  const sessionUser = useUIStore((s) => s.currentUser)

  useEffect(() => {
    if (initialMetrics && initialMetrics.length > 0) setMetrics(initialMetrics)
  }, [initialMetrics, setMetrics])

  useEffect(() => {
    if (initialCells && initialCells.length > 0) setCells(initialCells)
  }, [initialCells, setCells])
  const canCreate = canEditRocks({
    id: sessionUser?.id ?? "",
    role: sessionUser?.role as import("@/types/permissions").Role ?? "member",
    isMaster: sessionUser?.isMaster ?? false,
  })

  return (
    <div className="relative z-[1] pb-16">
      <header className="px-8 pt-6 flex items-start justify-between gap-5">
        <div>
          <span className="inline-block px-2.5 py-0.5 bg-[rgba(182,128,57,0.12)] border border-border-strong rounded-sm font-display text-[10px] tracking-[0.2em] text-gold-400 mb-1.5">
            ● Q2 2026 · WEEK 4 OF 13
          </span>
          <h1 className="h-page" style={{ fontSize: 36 }}>
            SCORECARD
          </h1>
          <p className="text-[12px] text-text-muted mt-1">
            {metrics.length} metrics tracked weekly · 2-week-red triggers
            auto-issue · click any cell to edit
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-3.5 py-2 bg-bg-3 text-text-primary border border-border-orage rounded-sm text-[12px] hover:bg-bg-4 hover:border-gold-500 transition-colors"
          >
            Export CSV
          </button>
          {canCreate && (
            <button
              type="button"
              onClick={openNewMetric}
              className="px-4 py-2 rounded-sm text-[12px] font-semibold flex items-center gap-1.5 bg-gradient-to-br from-gold-500 to-gold-400 text-text-on-gold hover:-translate-y-px transition-transform"
              style={{ boxShadow: "0 2px 8px rgba(182,128,57,0.3)" }}
            >
              <IcPlus className="w-3 h-3" />
              New Metric
            </button>
          )}
        </div>
      </header>

      <HealthBar />

      <div className="px-8 py-3.5 border-b border-border-orage bg-bg-1 flex items-center gap-2 flex-wrap">
        <Chip label="📅 Q2 2026" active />
        <Chip label="⌗ Group: Department" />
        <Chip label="👤 Owner: All" />
        <Chip
          label={filterRedOnly ? "⚠ Filter: Red Only ✓" : "⚠ Filter: Show Red Only"}
          active={filterRedOnly}
          onClick={() => setFilterRedOnly(!filterRedOnly)}
        />
        <span className="ml-auto text-[10px] text-text-muted font-mono">
          CLICK CELL = EDIT · ENTER = SAVE · ESC = CANCEL
        </span>
      </div>

      <div className="px-8 pt-5">
        <ScorecardGrid />
        <InsightsPanel />
      </div>

      <MetricDrawer />
      <NewMetricModal />
    </div>
  )
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-sm border text-[11px] transition-colors flex items-center gap-1.5",
        active
          ? "bg-[rgba(182,128,57,0.1)] border-gold-500 text-gold-400"
          : "bg-bg-3 border-border-orage text-text-secondary hover:border-gold-500 hover:text-gold-400",
      )}
    >
      {label}
    </button>
  )
}
