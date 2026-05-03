"use client"

/**
 * Per-segment views shown in the L10 main stage. Each segment of the
 * standard EOS L10 has different content the leader walks through:
 *   SEGUE       — personal/business bests, free capture
 *   SCORECARD   — weekly metric grid (inline-editable)
 *   ROCK REVIEW — every rock + clickable status picker
 *   HEADLINES   — capture only (rail handles it)
 *   TO-DOS      — open tasks + done-toggle (clickable)
 *   IDS         — handled by ids-stage.tsx
 *   CONCLUDE    — handled by conclude-modal.tsx
 *
 * Each segment is actionable: the leader can change a rock's status,
 * update a metric value, or mark a todo done — directly from the runner.
 */
import { useMemo, useState, useTransition } from "react"
import { useParams } from "next/navigation"
import type { MockRock, RockStatus } from "@/lib/mock-data"
import { useL10Store } from "@/lib/l10-store"
import { updateRockStatus } from "@/app/actions/rocks"
import { updateTaskStatus } from "@/app/actions/tasks"
import { updateMetricValueDuringL10 } from "@/app/actions/scorecard"
import { toast } from "sonner"
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
const STATUS_OPTIONS: RockStatus[] = ["on_track", "in_progress", "at_risk", "off_track", "done"]

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

function isUuid(v: string | null | undefined): v is string {
  if (!v) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
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

/**
 * SCORECARD with inline-editable cells. Click a cell, type a number,
 * blur or hit Enter to persist via upsertScorecardEntry. Optimistic UI
 * keeps the cell live while the server action runs.
 */
export function ScorecardView({ data }: { data: ScorecardSnapshot }) {
  const params = useParams()
  const slug = (params?.workspace as string) ?? ""

  // Local cell overrides so optimistic updates aren't blown away by the
  // initial snapshot prop while the server action is in flight.
  const [overrides, setOverrides] = useState<Record<string, number | null>>({})

  const weeks = useMemo(() => {
    const set = new Set(data.cells.map((c) => c.week))
    return Array.from(set).sort().slice(-4)
  }, [data.cells])

  function key(metricId: string, week: string) {
    return `${metricId}|${week}`
  }
  function valueFor(metricId: string, week: string): number | null {
    const k = key(metricId, week)
    if (k in overrides) return overrides[k]
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
          ANY METRIC RED 2+ WEEKS → DROP TO IDS · CLICK A CELL TO EDIT
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
                  {weeks.map((w) => (
                    <ScorecardCell
                      key={w}
                      slug={slug}
                      metricId={m.id}
                      week={w}
                      value={valueFor(m.id, w)}
                      red={isRed(valueFor(m.id, w), m.target, m.direction)}
                      onChange={(next) =>
                        setOverrides((o) => ({ ...o, [key(m.id, w)]: next }))
                      }
                    />
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ScorecardCell({
  slug,
  metricId,
  week,
  value,
  red,
  onChange,
}: {
  slug: string
  metricId: string
  week: string
  value: number | null
  red: boolean
  onChange: (next: number | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value === null ? "" : String(value))
  const [, startTransition] = useTransition()

  function commit() {
    setEditing(false)
    const trimmed = draft.trim()
    const next = trimmed === "" ? null : Number(trimmed)
    if (trimmed !== "" && Number.isNaN(next)) {
      setDraft(value === null ? "" : String(value))
      return
    }
    if (next === value) return
    onChange(next)
    if (slug) {
      startTransition(async () => {
        const res = await updateMetricValueDuringL10(slug, metricId, week, next)
        if (!res.ok) {
          toast.error("Couldn't save metric")
          onChange(value)
          setDraft(value === null ? "" : String(value))
        }
      })
    }
  }

  if (editing) {
    return (
      <td className="px-3 py-2.5 text-right">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit()
            if (e.key === "Escape") {
              setDraft(value === null ? "" : String(value))
              setEditing(false)
            }
          }}
          inputMode="decimal"
          className="w-20 bg-bg-3 border border-gold-500/60 rounded-sm px-2 py-0.5 text-[12px] font-mono text-gold-400 outline-none text-right"
        />
      </td>
    )
  }
  return (
    <td
      onClick={() => setEditing(true)}
      className={cn(
        "px-3 py-2.5 text-right font-mono cursor-pointer hover:bg-bg-3/40",
        value === null ? "text-text-dim" : red ? "text-danger" : "text-success",
      )}
    >
      {value === null ? "—" : value}
    </td>
  )
}

/**
 * ROCK REVIEW with clickable status pickers. Click the status pill to
 * open a dropdown of the 5 statuses. Selection persists via
 * updateRockStatus and updates the local view immediately.
 */
export function RockReviewView({
  rocks: initialRocks,
  membersById,
}: {
  rocks: MockRock[]
  membersById: Record<string, { name: string; initials: string }>
}) {
  const params = useParams()
  const slug = (params?.workspace as string) ?? ""
  const [rocks, setRocks] = useState(initialRocks)
  const [openId, setOpenId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

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

  function setStatus(rockId: string, next: RockStatus) {
    const prev = rocks.find((r) => r.id === rockId)?.status
    setRocks((rs) => rs.map((r) => (r.id === rockId ? { ...r, status: next } : r)))
    setOpenId(null)
    toast(`Status: ${STATUS_LABEL[next] ?? next}`)
    if (slug && isUuid(rockId)) {
      startTransition(async () => {
        const res = await updateRockStatus(slug, rockId, next)
        if (!res.ok) {
          toast.error("Couldn't save status")
          setRocks((rs) =>
            rs.map((r) =>
              r.id === rockId
                ? { ...r, status: (prev ?? "in_progress") as RockStatus }
                : r,
            ),
          )
        }
      })
    }
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
              className="card-glass px-4 py-3 flex items-center gap-4 relative"
            >
              <button
                type="button"
                onClick={() => setOpenId((id) => (id === r.id ? null : r.id))}
                className={cn(
                  "px-2 py-1 rounded-sm border font-display text-[10px] tracking-[0.15em] shrink-0 hover:ring-1 hover:ring-gold-500/40",
                  cls,
                )}
              >
                {STATUS_LABEL[r.status] ?? r.status.toUpperCase()}
              </button>
              {openId === r.id && (
                <ul className="absolute left-4 top-12 z-30 w-48 rounded-md border border-border-orage bg-bg-2 shadow-orage-lg py-1 text-[12px]">
                  {STATUS_OPTIONS.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => setStatus(r.id, s)}
                        className={cn(
                          "w-full text-left px-3 py-1.5 hover:bg-bg-3",
                          r.status === s ? "text-gold-400" : "text-text-secondary",
                        )}
                      >
                        {STATUS_LABEL[s] ?? s}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
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

/**
 * TO-DOS with a clickable checkbox per task. Toggling marks the task
 * done in the DB so the L10 ends with a clean checklist.
 */
export function TodosView({
  openTasks: initialOpen,
  meetingId,
}: {
  openTasks: TaskSnapshot[]
  meetingId: string
}) {
  const params = useParams()
  const slug = (params?.workspace as string) ?? ""
  const meeting = useL10Store((s) => s.getMeeting(meetingId))
  const liveTodos = meeting?.captures.filter((c) => c.kind === "todo") ?? []
  const [tasks, setTasks] = useState(initialOpen)
  const [, startTransition] = useTransition()

  function toggleTask(taskId: string, doneNow: boolean) {
    const prev = tasks.find((t) => t.id === taskId)?.status
    setTasks((ts) =>
      ts.map((t) => (t.id === taskId ? { ...t, status: doneNow ? "done" : "open" } : t)),
    )
    if (slug && isUuid(taskId)) {
      startTransition(async () => {
        const res = await updateTaskStatus(slug, taskId, doneNow ? "done" : "open")
        if (!res.ok) {
          toast.error("Couldn't update task")
          setTasks((ts) =>
            ts.map((t) =>
              t.id === taskId ? { ...t, status: prev ?? "open" } : t,
            ),
          )
        }
      })
    }
  }

  return (
    <div className="px-10 py-8 max-w-[1000px] mx-auto">
      <div className="mb-4 flex items-baseline justify-between">
        <div className="h-display text-gold-400 text-base tracking-[0.2em]">TO-DOS</div>
        <div className="text-[11px] text-text-muted font-mono">
          NOT DONE → DROPS TO IDS · CLICK CHECKBOX TO COMPLETE
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
        OPEN FROM LAST WEEK · {tasks.filter((t) => t.status !== "done").length}
      </div>
      <div className="space-y-1.5">
        {tasks.length === 0 ? (
          <div className="card-glass p-6 text-center text-[12px] text-text-muted">
            No open to-dos from last week. Clean slate.
          </div>
        ) : (
          tasks.slice(0, 25).map((t) => {
            const done = t.status === "done"
            return (
              <div
                key={t.id}
                className="card-glass px-3 py-2 flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => toggleTask(t.id, !done)}
                  aria-label={done ? "Mark not done" : "Mark done"}
                  className={cn(
                    "w-3.5 h-3.5 rounded-sm border-[1.5px] shrink-0 flex items-center justify-center",
                    done
                      ? "bg-gold-500 border-gold-500"
                      : "border-border-strong hover:border-gold-500",
                  )}
                >
                  {done && <span className="text-[8px] text-text-on-gold">✓</span>}
                </button>
                <span
                  className={cn(
                    "flex-1 text-[12px]",
                    done ? "text-text-muted line-through" : "text-text-primary",
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
            )
          })
        )}
      </div>
    </div>
  )
}
