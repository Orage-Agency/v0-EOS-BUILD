"use client"

import { useEffect } from "react"
import {
  Q_WEEKS,
  colorForCell,
  metricCellsOrdered,
  useScorecardStore,
} from "@/lib/scorecard-store"
import { getUser } from "@/lib/mock-data"
import { OrageAvatar } from "@/components/orage/avatar"
import { IcClose } from "@/components/orage/icons"
import { cn } from "@/lib/utils"

const COLOR_BG: Record<"green" | "yellow" | "red" | "empty", string> = {
  green: "bg-success",
  yellow: "bg-warning",
  red: "bg-danger",
  empty: "bg-bg-2",
}

export function MetricDrawer() {
  const { drawerMetricId, metrics, cells, closeDrawer } = useScorecardStore()
  const metric = metrics.find((m) => m.id === drawerMetricId)
  const owner = metric ? getUser(metric.ownerId) : null

  useEffect(() => {
    if (!drawerMetricId) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeDrawer()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [drawerMetricId, closeDrawer])

  const ordered = metric ? metricCellsOrdered(cells, metric.id) : []
  const max = metric
    ? Math.max(metric.target, ...ordered.map((c) => c.value ?? 0)) || 1
    : 1

  return (
    <>
      <div
        onClick={closeDrawer}
        aria-hidden
        className={cn(
          "fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm transition-opacity",
          drawerMetricId
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
      />
      <aside
        role="dialog"
        aria-label={metric ? `Metric · ${metric.name}` : "Metric drawer"}
        className={cn(
          "fixed right-0 top-0 h-screen w-full max-w-[560px] z-[201] flex flex-col transition-transform glass-strong border-l border-gold-500",
          drawerMetricId ? "translate-x-0" : "translate-x-full",
        )}
        style={{ boxShadow: "-12px 0 40px rgba(0,0,0,0.6)" }}
      >
        {metric ? (
          <>
            <header className="px-6 py-4 border-b border-border-orage flex justify-between items-center">
              <span className="font-display text-[11px] tracking-[0.22em] text-text-muted">
                METRIC · 13-WEEK TREND
              </span>
              <button
                type="button"
                onClick={closeDrawer}
                aria-label="Close drawer"
                className="w-7 h-7 rounded-sm flex items-center justify-center text-text-secondary hover:bg-bg-hover hover:text-gold-400"
              >
                <IcClose className="w-3.5 h-3.5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <h2 className="font-display text-[24px] tracking-[0.05em] text-gold-400 leading-tight mb-3.5">
                {metric.name}
              </h2>

              <dl
                className="grid gap-2.5 px-3.5 py-3.5 bg-bg-3 rounded-sm border border-border-orage mb-6"
                style={{ gridTemplateColumns: "100px 1fr" }}
              >
                <dt className="font-display text-[10px] tracking-[0.18em] text-text-muted self-center uppercase">
                  Owner
                </dt>
                <dd className="text-[12px] text-text-secondary flex items-center gap-2">
                  {owner ? (
                    <>
                      <OrageAvatar user={owner} size="sm" />
                      {owner.name}
                    </>
                  ) : (
                    "Team"
                  )}
                </dd>

                <dt className="font-display text-[10px] tracking-[0.18em] text-text-muted self-center uppercase">
                  Target
                </dt>
                <dd className="text-[12px] text-text-secondary font-mono">
                  {metric.direction === "up" ? "≥" : "≤"} {metric.target}
                  {metric.unit ? ` ${metric.unit}` : ""}
                </dd>

                <dt className="font-display text-[10px] tracking-[0.18em] text-text-muted self-center uppercase">
                  Direction
                </dt>
                <dd className="text-[12px] text-text-secondary uppercase font-display tracking-[0.15em]">
                  {metric.direction === "up" ? "Higher better" : "Lower better"}
                </dd>

                <dt className="font-display text-[10px] tracking-[0.18em] text-text-muted self-center uppercase">
                  Source
                </dt>
                <dd className="text-[12px] text-text-secondary uppercase font-display tracking-[0.15em]">
                  {metric.source}
                </dd>

                <dt className="font-display text-[10px] tracking-[0.18em] text-text-muted self-center uppercase">
                  Group
                </dt>
                <dd className="text-[12px] text-text-secondary">
                  {metric.group}
                </dd>
              </dl>

              <section className="mb-6">
                <h3 className="font-display text-[11px] tracking-[0.2em] text-gold-500 mb-2.5 uppercase">
                  13-Week Trend
                </h3>
                <div
                  className="h-40 bg-bg-3 border border-border-orage rounded-sm p-3.5 flex items-end gap-1"
                  role="img"
                  aria-label={`${metric.name} weekly bar trend`}
                >
                  {ordered.map((c) => {
                    const color = colorForCell(c.value, metric.target, metric.direction)
                    const v = c.value ?? 0
                    const height = c.value == null ? 4 : Math.max(8, Math.min(100, (v / max) * 100))
                    return (
                      <div
                        key={c.week}
                        className={cn(
                          "flex-1 rounded-t-sm flex items-end justify-center pb-1 text-[9px] font-mono font-bold text-text-on-gold",
                          COLOR_BG[color],
                          color !== "red" && color !== "empty" && "opacity-70",
                          color === "empty" && "opacity-40",
                        )}
                        style={{ height: `${height}%`, minHeight: 4 }}
                        title={`${c.week} · ${c.value ?? "—"}`}
                      >
                        {c.value ?? ""}
                      </div>
                    )
                  })}
                </div>
                <div className="grid grid-cols-13 gap-1 mt-1.5 text-[8px] font-mono text-text-dim text-center">
                  {Q_WEEKS.map((w) => (
                    <span key={w.iso}>W{w.num}</span>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="font-display text-[11px] tracking-[0.2em] text-gold-500 mb-2.5 uppercase">
                  Audit · Recent Updates
                </h3>
                <ul className="flex flex-col gap-2 pl-2 border-l border-border-orage">
                  {ordered
                    .filter((c) => c.value != null)
                    .slice(-5)
                    .reverse()
                    .map((c) => (
                      <li
                        key={c.week}
                        className="py-2 pl-3 border-l-2 border-gold-500 -ml-px"
                      >
                        <div className="font-display text-[9px] tracking-[0.18em] text-text-muted mb-1">
                          {c.week} · {c.source.toUpperCase()}
                        </div>
                        <p className="text-[12px] text-text-secondary leading-relaxed">
                          Value set to <strong className="text-gold-400">{c.value}</strong>
                        </p>
                      </li>
                    ))}
                </ul>
              </section>
            </div>
          </>
        ) : null}
      </aside>
    </>
  )
}
