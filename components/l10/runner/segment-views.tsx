"use client"

/**
 * Per-segment views shown in the L10 main stage. Each segment of the
 * standard EOS L10 has different content the leader walks through:
 *   SEGUE       — personal/business bests, free capture
 *   SCORECARD   — weekly metric grid
 *   ROCK REVIEW — every rock + status
 *   HEADLINES   — capture only (rail handles it)
 *   TO-DOS      — open tasks + done-toggle
 *   IDS         — handled by ids-stage.tsx
 *   CONCLUDE    — handled by conclude-modal.tsx
 *
 * Data comes from the server page once and is passed through MainStage.
 */
import { useMemo } from "react"
import type { MockRock } from "@/lib/mock-data"
import { useL10Store } from "@/lib/l10-store"
import { cn } from "@/lib/utils"

const STATUS_COLOR: Record<string, string> = {
  on_track: "bg-success/15 text-success border-success/40",
  in_progress: "bg-info/15 text-info border-info/40",
  at_risk: "bg-warning/15 text-warning border-warning/40",
  off_track: "bg-danger/15 text-danger border-danger/40",
  done: "bg-gold-500/15 text-gold-400 border-gold-500/40",
}
const STATUS_LABEL: Record<string, string> = {
  on_track: "ON TRACK",
  in_progress: "IN PROGRESS",
  at_risk: "AT RISK",
  off_track: "OFF TRACK",
  done: "DONE",
}

export type ScorecardSnapshot = {
  metrics: Array<{
    id: string
    name: string
    unit: string
    target: number
    direction: "up" | "down"
  }>
  cells: Array<{ metricId: string; week: string; value: number | null }>
}

export type TaskSnapshot = {
  id: string
  title: string
  status: string
  ownerName: string | null
  dueLabel: string | null
}

export type SegmentData = {
  rocks: MockRock[]
  scorecard: ScorecardSnapshot
  openTasks: TaskSnapshot[]
  membersById: Record<string, { name: string; initials: string }>
}

export function SegueView() {
  return (
    <div className="px-10 py-12 max-w-[820px] mx-auto">
      <div className="card-glass p-10">
        <div className="h-display text-gold-400 text-base mb-3 tracking-[0.2em]">SEGUE</div>
        <p className="text-sm text-text-muted leading-relaxed mb-4">
          Round the room. Each leader shares one personal best and one business
          best from the past week. ~30 seconds each.
        </p>
        <p className="text-[11px] text-text-muted font-mono tracking-wider">
          USE THE LIVE FEED ON THE RIGHT TO CAPTURE QUICK NOTES OR HEADLINES.
        </p>
      </div>
    </div>
  )
}

export function ScorecardView({ data }: { data: ScorecardSnapshot }) {
  // Show the most recent 4 weeks across all metrics so the team can spot
  // a "two-weeks-red" trend at a glance.
  const weeks = useMemo(() => {
    const set = new Set(data.cells.map((c) => c.week))
    return Array.from(set).sort().slice(-4)
  }, [data.cells])

  function valueFor(metricId: string, week: string) {
    return data.cells.find((c) => c.metricId === metricId && c.week === week)?.value ?? null
  }
  function isRed(value: number | null, target: number, direction: "up" | "down") {
    if (value === null) return false
    return direction === "up" ? value < target : value > target
  }

  if (data.metrics.length === 0) {
    return (
      <div className="px-10 py-12 max-w-[820px] mx-auto">
        <div className="card-glass p-10 text-center">
          <div className="h-display text-gold-400 text-base mb-2 tracking-[0.2em]">
            SCORECARD
          </div>
          <p className="text-sm text-text-muted">No metrics yet — add some in /scorecard.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-10 py-8 max-w-[1100px] mx-auto">
      <div className="mb-4 flex items-baseline justify-between">
        <div className="h-display text-gold-400 text-base tracking-[0.2em]">SCORECARD</div>
        <div className="text-[11px] text-text-muted font-mono">
          ANY METRIC RED 2+ WEEKS → DROP TO IDS
        </div>
      </div>
      <div className="card-glass overflow-hidden">
        <table className="w-full text-[12px]">
          <thead className="bg-bg-3 border-b border-border-orage">
            <tr className="text-left">
              <th className="px-4 py-3 text-text-muted font-display tracking-[0.15em] text-[10px]">
                METRIC
              </th>
              <th className="px-3 py-3 text-text-muted font-display tracking-[0.15em] text-[10px] text-right">
                TARGET
              </th>
              {weeks.map((w) => (
                <th
                  key={w}
                  className="px-3 py-3 text-text-muted font-display tracking-[0.15em] text-[10px] text-right"
                >
                  {new Date(w).toLocaleDateString([], { month: "short", day: "numeric" })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.metrics.map((m) => {
              const reds = weeks.filter((w) =>
                isRed(valueFor(m.id, w), m.target, m.direction),
              ).length
              return (
                <tr key={m.id} className="border-b border-border-orage/60">
                  <td className="px-4 py-2.5">
                    <div className="text-text-primary">{m.name}</div>
                    {reds >= 2 && (
                      <div className="text-[10px] text-danger font-mono mt-0.5">
                        {reds} OF {weeks.length} WEEKS RED
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-text-muted">
                    {m.direction === "up" ? "≥" : "≤"} {m.target}
                    {m.unit ? ` ${m.unit}` : ""}
                  </td>
                  {weeks.map((w) => {
                    const v = valueFor(m.id, w)
                    const red = isRed(v, m.target, m.direction)
                    return (
                      <td
                        key={w}
                        className={cn(
                          "px-3 py-2.5 text-right font-mono",
                          v === null
                            ? "text-text-dim"
                            : red
                              ? "text-danger"
                              : "text-success",
                        )}
                      >
                        {v === null ? "—" : v}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function RockReviewView({ rocks, membersById }: {
  rocks: MockRock[]
  membersById: Record<string, { name: string; initials: string }>
}) {
  if (rocks.length === 0) {
    return (
      <div className="px-10 py-12 max-w-[820px] mx-auto">
        <div className="card-glass p-10 text-center">
          <div className="h-display text-gold-400 text-base mb-2 tracking-[0.2em]">
            ROCK REVIEW
          </div>
          <p className="text-sm text-text-muted">No rocks yet — add some in /rocks.</p>
        </div>
      </div>
    )
  }
  const onTrack = rocks.filter((r) => r.status === "on_track" || r.status === "in_progress").length
  const atRisk = rocks.filter((r) => r.status === "at_risk").length
  const offTrack = rocks.filter((r) => r.status === "off_track").length
  const done = rocks.filter((r) => r.status === "done").length

  return (
    <div className="px-10 py-8 max-w-[1100px] mx-auto">
      <div className="mb-4 flex items-baseline justify-between">
        <div className="h-display text-gold-400 text-base tracking-[0.2em]">ROCK REVIEW</div>
        <div className="flex gap-3 text-[11px] font-mono">
          <span className="text-success">ON {onTrack}</span>
          <span className="text-warning">RISK {atRisk}</span>
          <span className="text-danger">OFF {offTrack}</span>
          <span className="text-gold-400">DONE {done}</span>
        </div>
      </div>
      <div className="space-y-2">
        {rocks.map((r) => {
          const owner = membersById[r.owner ?? ""]
          const cls = STATUS_COLOR[r.status] ?? STATUS_COLOR.in_progress
          return (
            <div
              key={r.id}
              className="card-glass px-4 py-3 flex items-center gap-4"
            >
              <span
                className={cn(
                  "px-2 py-1 rounded-sm border font-display text-[10px] tracking-[0.15em] shrink-0",
                  cls,
                )}
              >
                {STATUS_LABEL[r.status] ?? r.status.toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-text-primary truncate">{r.title}</div>
                {r.description && (
                  <div className="text-[11px] text-text-muted truncate mt-0.5">
                    {r.description}
                  </div>
                )}
              </div>
              <div className="font-mono text-[11px] text-gold-400 shrink-0">
                {r.progress}%
              </div>
              {owner && (
                <div className="flex items-center gap-1.5 text-[11px] text-text-muted shrink-0">
                  <span className="w-5 h-5 rounded-full bg-bg-3 border border-border-orage flex items-center justify-center text-[9px] text-gold-400">
                    {owner.initials}
                  </span>
                  <span className="hidden md:inline">{owner.name}</span>
                </div>
              )}
              {r.due && (
                <div className="font-mono text-[10px] text-text-muted shrink-0">
                  {r.due}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function HeadlinesView({ meetingId }: { meetingId: string }) {
  const meeting = useL10Store((s) => s.getMeeting(meetingId))
  const headlines = meeting?.captures.filter((c) => c.kind === "headline") ?? []
  return (
    <div className="px-10 py-8 max-w-[820px] mx-auto">
      <div className="mb-4">
        <div className="h-display text-gold-400 text-base tracking-[0.2em]">HEADLINES</div>
        <p className="text-[12px] text-text-muted mt-1">
          Customer + employee headlines. Signal only — full discussion goes to IDS.
        </p>
      </div>
      <div className="card-glass p-6">
        {headlines.length === 0 ? (
          <p className="text-[13px] text-text-muted text-center">
            No headlines captured yet. Use the live feed on the right to add one.
          </p>
        ) : (
          <ul className="space-y-2">
            {headlines.map((h) => (
              <li key={h.id} className="text-[13px] text-text-primary">
                <span className="text-gold-400 mr-2">●</span>
                {h.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export function TodosView({
  openTasks,
  meetingId,
}: {
  openTasks: TaskSnapshot[]
  meetingId: string
}) {
  const meeting = useL10Store((s) => s.getMeeting(meetingId))
  const liveTodos = meeting?.captures.filter((c) => c.kind === "todo") ?? []

  return (
    <div className="px-10 py-8 max-w-[1000px] mx-auto">
      <div className="mb-4 flex items-baseline justify-between">
        <div className="h-display text-gold-400 text-base tracking-[0.2em]">TO-DOS</div>
        <div className="text-[11px] text-text-muted font-mono">
          NOT DONE → DROPS TO IDS
        </div>
      </div>

      {liveTodos.length > 0 && (
        <div className="mb-4">
          <div className="h-display text-text-muted text-[10px] tracking-[0.18em] mb-2">
            CAPTURED THIS MEETING · {liveTodos.length}
          </div>
          <div className="space-y-1.5">
            {liveTodos.map((t) => (
              <div
                key={t.id}
                className="card-glass px-3 py-2 flex items-center gap-2 text-[12px] text-text-primary"
              >
                <span className="w-3 h-3 rounded-sm border border-gold-500 shrink-0" />
                <span className="flex-1">{t.text}</span>
                {t.ownerLabel && (
                  <span className="text-[10px] text-text-muted font-mono">{t.ownerLabel}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="h-display text-text-muted text-[10px] tracking-[0.18em] mb-2">
        OPEN FROM LAST WEEK · {openTasks.length}
      </div>
      <div className="space-y-1.5">
        {openTasks.length === 0 ? (
          <div className="card-glass p-6 text-center text-[12px] text-text-muted">
            No open to-dos from last week. Clean slate.
          </div>
        ) : (
          openTasks.slice(0, 25).map((t) => (
            <div
              key={t.id}
              className="card-glass px-3 py-2 flex items-center gap-2"
            >
              <span
                className={cn(
                  "w-3 h-3 rounded-sm border shrink-0",
                  t.status === "done"
                    ? "bg-gold-500 border-gold-500"
                    : "border-border-strong",
                )}
              />
              <span
                className={cn(
                  "flex-1 text-[12px]",
                  t.status === "done"
                    ? "text-text-muted line-through"
                    : "text-text-primary",
                )}
              >
                {t.title}
              </span>
              {t.dueLabel && (
                <span className="text-[10px] text-text-muted font-mono shrink-0">
                  {t.dueLabel}
                </span>
              )}
              {t.ownerName && (
                <span className="text-[10px] text-text-muted shrink-0">
                  {t.ownerName}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
