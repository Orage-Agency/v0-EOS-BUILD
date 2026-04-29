"use client"

import {
  CURRENT_WEEK,
  Q_WEEKS,
  cellEditableBy,
  colorForCell,
  metricsByGroup,
  metricCellsOrdered,
  useScorecardStore,
} from "@/lib/scorecard-store"
import { CURRENT_USER, getUser } from "@/lib/mock-data"
import { OrageAvatar } from "@/components/orage/avatar"
import { updateMetricValue } from "@/app/actions/scorecard"
import { useWorkspaceSlug } from "@/hooks/use-workspace-slug"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { OrageEmpty } from "@/components/empty/orage-empty"
import { MetricCellView } from "./metric-cell"
import { MetricSparkline } from "./metric-sparkline"

const GRID_TEMPLATE = `280px 80px 56px repeat(13, minmax(56px, 1fr)) 110px`

export function ScorecardGrid() {
  const {
    metrics,
    cells,
    setCellValue,
    openDrawer,
    filterRedOnly,
  } = useScorecardStore()
  const workspaceSlug = useWorkspaceSlug()

  const groups = metricsByGroup(metrics)

  if (metrics.length === 0) {
    return (
      <OrageEmpty
        eyebrow="WEEKLY PULSE"
        title="SCORECARD IS EMPTY"
        description="Pick 3-7 numbers that tell you, every Monday, whether the company is on track. Two reds in a row auto-creates an issue for the next L10."
        bullets={[
          "Examples: weekly revenue, qualified leads, NPS, on-time rate",
          "Each metric has a target, an owner, and a direction (≥ or ≤)",
          "Click any cell to edit — Enter saves, Esc cancels",
        ]}
        ctas={[
          { label: "Add First Metric", onClick: () => useScorecardStore.getState().openNewMetric() },
          { label: "How scorecards work", href: "/help#scorecard", variant: "ghost" },
        ]}
        footnote="W1 STARTS THIS MONDAY"
      />
    )
  }

  return (
    <div className="bg-bg-3 border border-border-orage rounded-sm overflow-hidden overflow-x-auto">
      <div
        role="grid"
        aria-label="Quarterly scorecard"
        className="min-w-[1400px] grid"
        style={{ gridTemplateColumns: GRID_TEMPLATE }}
      >
        {/* Headers */}
        <ColumnHeader first>METRIC</ColumnHeader>
        <ColumnHeader>OWNER</ColumnHeader>
        <ColumnHeader>TGT</ColumnHeader>
        {Q_WEEKS.map((w) => (
          <ColumnHeader key={w.iso} current={w.iso === CURRENT_WEEK}>
            <span className="block text-[11px] text-text-secondary">
              W{w.num}
            </span>
            <span className="block font-mono text-[9px] text-text-dim normal-case tracking-normal">
              {w.label}
            </span>
          </ColumnHeader>
        ))}
        <ColumnHeader>TREND</ColumnHeader>

        {groups.map(({ group, metrics: groupMetrics }) => (
          <GroupSection
            key={group}
            group={group}
            metrics={groupMetrics}
            renderMetric={(m) => {
              const ordered = metricCellsOrdered(cells, m.id)
              const editable = cellEditableBy(m, {
                id: CURRENT_USER.id,
                role: CURRENT_USER.role,
                isMaster: CURRENT_USER.isMaster,
              })
              const owner = getUser(m.ownerId)
              const currentColor = colorForCell(
                ordered.find((c) => c.week === CURRENT_WEEK)?.value ?? null,
                m.target,
                m.direction,
              )
              if (filterRedOnly && currentColor !== "red") return null
              return (
                <div
                  key={m.id}
                  role="row"
                  className="contents"
                  onClick={(e) => {
                    // ignore clicks coming from a cell edit
                    const target = e.target as HTMLElement
                    if (
                      target.tagName === "INPUT" ||
                      target.closest("button")
                    ) {
                      return
                    }
                  }}
                >
                  {/* Name + target */}
                  <button
                    type="button"
                    onClick={() => openDrawer(m.id)}
                    className="px-4 py-3 border-b border-r border-border-orage flex flex-col items-start gap-1 text-left hover:bg-bg-4 transition-colors"
                  >
                    <span className="text-[13px] text-text-primary font-medium">
                      {m.name}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] text-text-muted font-mono",
                        m.direction === "up"
                          ? "before:content-['≥_'] before:text-success"
                          : "before:content-['≤_'] before:text-info",
                      )}
                    >
                      {m.target}
                      {m.unit ? ` ${m.unit}` : ""}
                    </span>
                  </button>
                  {/* Owner */}
                  <div className="px-2 py-3 border-b border-r border-border-orage flex items-center justify-center">
                    {owner ? (
                      <OrageAvatar user={owner} size="sm" />
                    ) : (
                      <span className="avatar avatar-sm bg-bg-2 text-text-muted text-[8px] font-display tracking-[0.1em]">
                        ALL
                      </span>
                    )}
                  </div>
                  {/* Target column */}
                  <div className="px-2 py-3 border-b border-r border-border-orage font-display text-gold-400 text-[12px] font-semibold flex items-center justify-center">
                    {m.target}
                  </div>
                  {/* 13 cells */}
                  {ordered.map((c) => (
                    <MetricCellView
                      key={c.week}
                      metric={m}
                      cell={c}
                      isCurrent={c.week === CURRENT_WEEK}
                      editable={editable}
                      onSave={async (next) => {
                        setCellValue(m.id, c.week, next, {
                          id: CURRENT_USER.id,
                          name: CURRENT_USER.name,
                        })
                        try {
                          await updateMetricValue(workspaceSlug, {
                            metricId: m.id,
                            metricOwnerId: m.ownerId,
                            week: c.week,
                            value: next,
                          })
                          toast("VALUE SAVED")
                        } catch (err) {
                          toast("FAILED", {
                            description:
                              err instanceof Error ? err.message : "Save failed",
                          })
                        }
                      }}
                    />
                  ))}
                  {/* Trend */}
                  <div className="px-2 py-3 border-b border-border-orage flex items-center">
                    <MetricSparkline metric={m} cells={ordered} />
                  </div>
                </div>
              )
            }}
          />
        ))}
      </div>
    </div>
  )
}

function ColumnHeader({
  children,
  first,
  current,
}: {
  children: React.ReactNode
  first?: boolean
  current?: boolean
}) {
  return (
    <div
      role="columnheader"
      className={cn(
        "px-2.5 py-3 bg-bg-2 border-b border-r border-border-orage font-display text-[9px] tracking-[0.18em] uppercase text-center flex flex-col items-center justify-center",
        first && "items-start text-left pl-4",
        current ? "bg-[rgba(182,128,57,0.12)] text-gold-400" : "text-text-muted",
      )}
    >
      {children}
    </div>
  )
}

function GroupSection({
  group,
  metrics,
  renderMetric,
}: {
  group: string
  metrics: ReturnType<typeof metricsByGroup>[number]["metrics"]
  renderMetric: (m: ReturnType<typeof metricsByGroup>[number]["metrics"][number]) => React.ReactNode
}) {
  return (
    <>
      <div
        className="bg-bg-2 border-b border-border-orage px-4 py-2 font-display text-[10px] tracking-[0.22em] uppercase text-gold-500 flex items-center gap-1.5"
        style={{ gridColumn: "1 / -1" }}
      >
        <span className="dot dot-gold" aria-hidden />
        {group}
      </div>
      {metrics.map(renderMetric)}
    </>
  )
}
