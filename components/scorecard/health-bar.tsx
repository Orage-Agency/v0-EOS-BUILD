"use client"

import { useScorecardStore, colorForCell, CURRENT_WEEK, Q_WEEKS } from "@/lib/scorecard-store"
import { cn } from "@/lib/utils"

type Tone = "green" | "yellow" | "red" | "gold"

function HealthCard({
  label,
  value,
  meta,
  tone,
}: {
  label: string
  value: string
  meta: React.ReactNode
  tone: Tone
}) {
  const accentClass: Record<Tone, string> = {
    green: "bg-success",
    yellow: "bg-warning",
    red: "bg-danger",
    gold: "bg-gold-500",
  }
  return (
    <div className="bg-bg-3 border border-border-orage rounded-sm px-4 py-3.5 relative overflow-hidden">
      <span
        className={cn("absolute top-0 left-0 w-[3px] h-full", accentClass[tone])}
        aria-hidden
      />
      <div className="font-display text-[9px] tracking-[0.22em] text-text-muted uppercase mb-1.5">
        {label}
      </div>
      <div className="font-display text-[30px] text-gold-400 leading-none">
        {value}
      </div>
      <div className="text-[11px] text-text-muted mt-1">{meta}</div>
    </div>
  )
}

function colorAtWeek(
  metrics: ReturnType<typeof useScorecardStore.getState>["metrics"],
  cells: ReturnType<typeof useScorecardStore.getState>["cells"],
  weekIso: string,
) {
  return metrics.map((m) => {
    const cell = cells.find((c) => c.metricId === m.id && c.week === weekIso)
    return colorForCell(cell?.value ?? null, m.target, m.direction)
  })
}

export function HealthBar() {
  const { metrics, cells } = useScorecardStore()
  const currentColors = colorAtWeek(metrics, cells, CURRENT_WEEK)
  const greens = currentColors.filter((c) => c === "green").length
  const yellows = currentColors.filter((c) => c === "yellow").length

  // Compute the same buckets one week back to give the user a real
  // delta instead of a hardcoded "↑ 2 from last week".
  const currentIdx = Q_WEEKS.findIndex((w) => w.iso === CURRENT_WEEK)
  const prevWeek = currentIdx > 0 ? Q_WEEKS[currentIdx - 1].iso : null
  const prevColors = prevWeek ? colorAtWeek(metrics, cells, prevWeek) : []
  const greensPrev = prevColors.filter((c) => c === "green").length

  // 2-week red streak count
  const redStreak = prevWeek
    ? metrics.filter((m) => {
        const cur = cells.find(
          (c) => c.metricId === m.id && c.week === CURRENT_WEEK,
        )
        const prev = cells.find((c) => c.metricId === m.id && c.week === prevWeek)
        return (
          colorForCell(cur?.value ?? null, m.target, m.direction) === "red" &&
          colorForCell(prev?.value ?? null, m.target, m.direction) === "red"
        )
      }).length
    : 0

  const total = metrics.length
  const score =
    total > 0 ? Math.round(((greens + yellows * 0.5) / total) * 100) : 0
  const scorePrev =
    prevColors.length > 0
      ? Math.round(
          ((greensPrev + prevColors.filter((c) => c === "yellow").length * 0.5) /
            prevColors.length) *
            100,
        )
      : 0
  const scoreDelta = score - scorePrev
  const greensDelta = greens - greensPrev

  function delta(n: number, suffix = "") {
    if (n === 0) return <span className="text-text-muted">flat vs last week{suffix}</span>
    const cls = n > 0 ? "text-success" : "text-danger"
    const arrow = n > 0 ? "↑" : "↓"
    return (
      <>
        <span className={`${cls} font-semibold`}>{arrow} {Math.abs(n)}{suffix}</span> vs last week
      </>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-8 py-5 border-b border-border-orage">
      <HealthCard
        label="METRICS GREEN"
        value={String(greens)}
        meta={prevColors.length > 0 ? delta(greensDelta) : <span className="text-text-muted">first week</span>}
        tone="green"
      />
      <HealthCard
        label="YELLOW"
        value={String(yellows)}
        meta="Watching closely"
        tone="yellow"
      />
      <HealthCard
        label="RED · 2-WK STREAK"
        value={String(redStreak)}
        meta={
          redStreak > 0 ? (
            <>
              <span className="text-danger font-semibold">{redStreak}</span> issue
              {redStreak === 1 ? "" : "s"} auto-created
            </>
          ) : (
            <span className="text-text-muted">none — keep it that way</span>
          )
        }
        tone="red"
      />
      <HealthCard
        label="OVERALL HEALTH"
        value={`${score}%`}
        meta={prevColors.length > 0 ? delta(scoreDelta, "%") : <span className="text-text-muted">first week</span>}
        tone="gold"
      />
    </div>
  )
}
