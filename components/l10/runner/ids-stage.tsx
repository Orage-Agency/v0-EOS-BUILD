"use client"

import { useEffect, useRef, useState } from "react"
import { useL10Store, type IDSIssue, type IDSStage } from "@/lib/l10-store"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function IDSStageView({ meetingId }: { meetingId: string }) {
  const meeting = useL10Store((s) => s.getMeeting(meetingId))
  const setIDSStage = useL10Store((s) => s.setIDSStage)
  const setIDSNotes = useL10Store((s) => s.setIDSNotes)
  const resolveIDS = useL10Store((s) => s.resolveIDS)
  const addCapture = useL10Store((s) => s.addCapture)

  if (!meeting) return null

  const open = meeting.ids.filter((i) => !i.resolved)
  const active = open[0]
  const upNext = open.slice(1)

  function handleResolve(id: string, as: "rock" | "task" | "headline" | "table") {
    resolveIDS(meetingId, id, as)
    const map: Record<typeof as, { msg: string; cap?: "todo" | "headline" | "park" }> = {
      rock: { msg: "CONVERTED TO ROCK" },
      task: { msg: "TO-DO CREATED", cap: "todo" },
      headline: { msg: "MARKED HEADLINE", cap: "headline" },
      table: { msg: "TABLED 30 DAYS", cap: "park" },
    }
    const entry = map[as]
    toast(entry.msg)
    if (entry.cap && active) {
      addCapture(meetingId, entry.cap, active.title)
    }
  }

  return (
    <div className="px-10 py-8 max-w-[820px] mx-auto">
      {active ? (
        <ActiveIDSCard
          issue={active}
          onStageChange={(stage) => setIDSStage(meetingId, active.id, stage)}
          onNotesChange={(notes) => setIDSNotes(meetingId, active.id, notes)}
          onResolve={(as) => handleResolve(active.id, as)}
        />
      ) : (
        <div className="card-glass p-10 text-center">
          <div className="h-display text-gold-400 text-base mb-2">QUEUE EMPTY</div>
          <div className="text-sm text-text-muted">
            All issues resolved. Advance to CONCLUDE when ready.
          </div>
        </div>
      )}

      {upNext.length > 0 && (
        <div className="mt-8">
          <div className="h-display text-text-muted text-[11px] tracking-[0.2em] mb-3">
            Up Next · {upNext.length} {upNext.length === 1 ? "Issue" : "Issues"}
          </div>
          <ul className="flex flex-col gap-2">
            {upNext.map((i) => (
              <UpNextRow key={i.id} issue={i} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function ActiveIDSCard({
  issue,
  onStageChange,
  onNotesChange,
  onResolve,
}: {
  issue: IDSIssue
  onStageChange: (stage: IDSStage) => void
  onNotesChange: (notes: string) => void
  onResolve: (as: "rock" | "task" | "headline" | "table") => void
}) {
  const [notes, setNotes] = useState(issue.notes ?? "")
  const idRef = useRef(issue.id)

  // Reset local notes when the active issue changes
  useEffect(() => {
    if (idRef.current !== issue.id) {
      setNotes(issue.notes ?? "")
      idRef.current = issue.id
    }
  }, [issue.id, issue.notes])

  // Debounce notes save
  useEffect(() => {
    const t = setTimeout(() => {
      if (notes !== (issue.notes ?? "")) onNotesChange(notes)
    }, 400)
    return () => clearTimeout(t)
  }, [notes, issue.notes, onNotesChange])

  return (
    <div className="card-glass overflow-hidden">
      <div className="px-6 py-5 border-b border-border-orage">
        <div className="flex items-center gap-3 text-[10px] font-mono text-text-muted mb-3">
          <span className="h-display text-gold-400 text-xs tracking-[0.2em]">
            RANK · {issue.rank}
          </span>
          <span
            className={cn(
              "h-display text-[10px] tracking-[0.15em] px-2 py-0.5 rounded-sm",
              issue.source === "scorecard" && "bg-gold-500/15 text-gold-400",
              issue.source === "ai" && "bg-gold-500/15 text-gold-400",
              issue.source === "rock" && "bg-bg-active text-text-secondary",
              issue.source === "manual" && "bg-bg-active text-text-secondary",
            )}
          >
            {issue.source === "scorecard" ? "▲ " : issue.source === "ai" ? "◆ " : ""}
            {issue.sourceLabel}
          </span>
          <span className="ml-auto">
            {issue.stage === "discuss"
              ? "DISCUSSING"
              : issue.stage === "solve"
                ? "SOLVING"
                : "IDENTIFYING"}
          </span>
        </div>
        <h2 className="text-text-primary text-lg leading-snug mb-2 font-medium">
          {issue.title}
        </h2>
        {issue.context && (
          <p className="text-sm text-text-secondary leading-relaxed">{issue.context}</p>
        )}
      </div>

      <div className="px-6 py-5">
        <Stepper stage={issue.stage} onChange={onStageChange} />
      </div>

      {issue.stage !== "identify" && (
        <div className="px-6 pb-5">
          <div className="h-display text-text-muted text-[11px] tracking-[0.2em] mb-2">
            Discussion Notes · Live
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={8}
            placeholder="Capture the discussion as it happens…"
            className="w-full bg-bg-3 border border-border-orage rounded-sm px-4 py-3 text-sm text-text-primary placeholder:text-text-muted resize-y leading-relaxed font-mono focus:outline-none focus:border-gold-500 focus:bg-bg-4 transition-colors"
          />
        </div>
      )}

      <div className="px-6 pb-6">
        <div className="h-display text-text-muted text-[11px] tracking-[0.2em] mb-2">
          Resolve Into
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <ResolveButton
            label="New Rock"
            sub="90-day commitment"
            icon="●"
            onClick={() => onResolve("rock")}
          />
          <ResolveButton
            label="To-Do / Task"
            sub="Single action item"
            icon="✓"
            onClick={() => onResolve("task")}
          />
          <ResolveButton
            label="Headline"
            sub="Info only · share"
            icon="◆"
            onClick={() => onResolve("headline")}
          />
          <ResolveButton
            label="Table It"
            sub="Park · revisit 30d"
            icon="⏸"
            onClick={() => onResolve("table")}
          />
        </div>
      </div>
    </div>
  )
}

function Stepper({
  stage,
  onChange,
}: {
  stage: IDSStage
  onChange: (s: IDSStage) => void
}) {
  const steps: { id: IDSStage; label: string; num: number }[] = [
    { id: "identify", label: "IDENTIFIED", num: 1 },
    { id: "discuss", label: "DISCUSSING", num: 2 },
    { id: "solve", label: "SOLVE", num: 3 },
  ]
  const order: IDSStage[] = ["identify", "discuss", "solve"]
  const currentIdx = order.indexOf(stage)

  return (
    <div className="flex gap-2">
      {steps.map((s, i) => {
        const isDone = i < currentIdx
        const isActive = i === currentIdx
        return (
          <button
            key={s.id}
            onClick={() => onChange(s.id)}
            className={cn(
              "flex-1 h-display text-[11px] tracking-[0.15em] px-3 py-2.5 rounded-sm border transition-colors text-left",
              isActive && "bg-gold-500 border-gold-500 text-bg-1",
              isDone && "bg-bg-active border-border-orage text-gold-400",
              !isActive && !isDone && "bg-bg-3 border-border-orage text-text-muted hover:bg-bg-4",
            )}
          >
            {isDone ? "✓ " : `${s.num} · `}
            {s.label}
          </button>
        )
      })}
    </div>
  )
}

function ResolveButton({
  label,
  sub,
  icon,
  onClick,
}: {
  label: string
  sub: string
  icon: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="bg-bg-3 hover:bg-bg-4 border border-border-orage hover:border-gold-500 rounded-sm px-3 py-3 text-left transition-colors group"
    >
      <span className="text-gold-400 text-base block mb-1">{icon}</span>
      <span className="h-display text-[11px] tracking-[0.15em] text-text-primary block mb-0.5">
        {label}
      </span>
      <span className="text-[10px] text-text-muted block">{sub}</span>
    </button>
  )
}

function UpNextRow({ issue }: { issue: IDSIssue }) {
  return (
    <li className="bg-bg-3 border border-border-orage rounded-sm px-4 py-3.5 flex items-center gap-4">
      <span className="h-display text-base text-gold-400 bg-bg-active px-3 py-1 rounded-sm min-w-9 text-center">
        {issue.rank}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-text-primary mb-0.5 truncate">{issue.title}</div>
        <div className="text-[10px] text-text-muted font-mono">{issue.sourceLabel}</div>
      </div>
      <span
        className={cn(
          "h-display text-[10px] tracking-[0.15em] px-2 py-0.5 rounded-sm",
          issue.severity === "high" && "bg-warning/15 text-warning",
          issue.severity === "med" && "bg-bg-active text-text-secondary",
          issue.severity === "low" && "bg-bg-active text-text-muted",
        )}
      >
        {issue.severity.toUpperCase()}
      </span>
    </li>
  )
}
