"use client"

import { TenantLink as Link } from "@/components/tenant-link"
import { ROCKS, type RockStatus } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

export function OwnedRocks({ rockIds }: { rockIds: string[] }) {
  const rocks = ROCKS.filter((r) => rockIds.includes(r.id))

  return (
    <section>
      <header className="flex items-center justify-between mb-3">
        <h3 className="font-display text-text-primary text-base tracking-[0.1em] uppercase">
          Owned Rocks · Q2
        </h3>
        <Link
          href="/rocks"
          className="text-[11px] text-text-muted hover:text-gold-400 transition-colors uppercase font-mono"
        >
          View All Rocks →
        </Link>
      </header>

      {rocks.length === 0 ? (
        <div className="glass rounded-md px-5 py-6 text-center text-sm text-text-muted">
          No owned rocks this quarter.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rocks.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-4 bg-bg-3 border border-border-orage rounded-sm px-4 py-3 hover:bg-bg-hover transition-colors"
            >
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  statusDotColor(r.status),
                )}
                style={{ boxShadow: `0 0 8px currentColor` }}
              />
              <span className="flex-1 text-sm text-text-primary truncate">{r.title}</span>
              <span className="text-xs font-mono text-text-secondary tabular-nums">
                {r.progress}%
              </span>
              <div className="w-24 h-1 bg-bg-2 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full", statusFillColor(r.status))}
                  style={{ width: `${r.progress}%` }}
                />
              </div>
              <StatusBadge status={r.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function statusDotColor(s: RockStatus): string {
  if (s === "on_track" || s === "in_progress" || s === "done") return "bg-success text-success"
  if (s === "at_risk") return "bg-warning text-warning"
  return "bg-danger text-danger"
}

function statusFillColor(s: RockStatus): string {
  if (s === "on_track" || s === "in_progress" || s === "done") return "bg-success"
  if (s === "at_risk") return "bg-warning"
  return "bg-danger"
}

function StatusBadge({ status }: { status: RockStatus }) {
  const label =
    status === "on_track"
      ? "ON TRACK"
      : status === "in_progress"
        ? "IN PROGRESS"
        : status === "done"
          ? "DONE"
          : status === "at_risk"
            ? "AT RISK"
            : "OFF TRACK"
  const tone =
    status === "on_track" || status === "in_progress" || status === "done"
      ? "bg-success/15 text-success border-success/30"
      : status === "at_risk"
        ? "bg-warning/15 text-warning border-warning/30"
        : "bg-danger/15 text-danger border-danger/30"
  return (
    <span
      className={cn(
        "font-display text-[9px] tracking-[0.18em] px-2 py-0.5 rounded-sm border uppercase",
        tone,
      )}
    >
      {label}
    </span>
  )
}
