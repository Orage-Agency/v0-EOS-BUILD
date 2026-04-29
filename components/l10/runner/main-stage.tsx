"use client"

import { useEffect } from "react"
import { useL10Store } from "@/lib/l10-store"
import { IDSStageView } from "./ids-stage"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function MainStage({ meetingId }: { meetingId: string }) {
  const meeting = useL10Store((s) => s.getMeeting(meetingId))
  const timerSec = useL10Store((s) => s.timerSec)
  const timerRunning = useL10Store((s) => s.timerRunning)
  const tickTimer = useL10Store((s) => s.tickTimer)
  const setTimerRunning = useL10Store((s) => s.setTimerRunning)
  const addTime = useL10Store((s) => s.addTime)
  const advanceRound = useL10Store((s) => s.advanceRound)

  // Drive the timer client-side
  useEffect(() => {
    const id = setInterval(() => tickTimer(), 1000)
    return () => clearInterval(id)
  }, [tickTimer])

  if (!meeting) return null
  const active = meeting.agenda.find((a) => a.status === "active")
  const activeIdx = meeting.agenda.findIndex((a) => a.status === "active")
  const totalElapsed = meeting.agenda
    .filter((a) => a.status === "done")
    .reduce((acc, a) => acc + (a.actualSec ?? 0), 0)

  const totalSegmentSec = active?.durationSec ?? 1
  const elapsedInSegment = totalSegmentSec - timerSec
  const segmentPct = Math.max(0, Math.min(1, elapsedInSegment / totalSegmentSec)) * 100

  const m = Math.floor(timerSec / 60)
  const s = timerSec % 60
  const display = `${m}:${s.toString().padStart(2, "0")}`
  const warning = timerSec < 300 && timerSec >= 60
  const over = timerSec < 60

  const isIDS = active?.segment === "ids"

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-bg-1">
      <header className="px-10 py-6 border-b border-border-orage flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-display text-5xl text-gold-400 leading-none">{activeIdx + 1}</div>
          <div>
            <div className="h-display text-text-primary text-xl tracking-[0.05em]">
              {active?.name ?? "—"}
            </div>
            <div className="text-[11px] text-text-muted font-mono mt-1">
              SEGMENT {activeIdx + 1} OF {meeting.agenda.length}
              {totalElapsed > 0 && ` · TOTAL ${Math.floor(totalElapsed / 60)} MIN`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-display text-3xl font-mono tracking-tight transition-colors",
              warning && "text-warning",
              over && "text-danger animate-pulse",
              !warning && !over && "text-text-primary",
            )}
            style={{ fontFamily: "var(--font-mono, 'JetBrains Mono')" }}
          >
            {display}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTimerRunning(!timerRunning)}
              className="w-9 h-9 flex items-center justify-center bg-bg-3 hover:bg-bg-4 border border-border-orage rounded-sm text-text-secondary text-sm transition-colors"
              title={timerRunning ? "Pause" : "Resume"}
            >
              {timerRunning ? "❚❚" : "▶"}
            </button>
            <button
              onClick={() => addTime(5 * 60)}
              className="h-9 px-3 flex items-center justify-center bg-bg-3 hover:bg-bg-4 border border-border-orage rounded-sm text-text-secondary text-[11px] font-mono transition-colors"
              title="Add 5 minutes"
            >
              +5
            </button>
            <button
              onClick={() => {
                advanceRound(meetingId)
                toast("ROUND ADVANCED → NEXT")
              }}
              className="h-9 px-3 flex items-center justify-center bg-gold-500 hover:bg-gold-400 text-bg-1 text-[11px] font-semibold tracking-wider uppercase rounded-sm transition-colors"
              title="Skip to next round"
            >
              SKIP →
            </button>
          </div>
        </div>
      </header>

      <div className="h-1 bg-bg-3 relative overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-500",
            over ? "bg-danger" : warning ? "bg-warning" : "bg-gold-500",
          )}
          style={{ width: `${segmentPct}%` }}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {isIDS ? (
          <IDSStageView meetingId={meetingId} />
        ) : (
          <NonIDSPlaceholder name={active?.name ?? "—"} />
        )}
      </div>
    </main>
  )
}

function NonIDSPlaceholder({ name }: { name: string }) {
  return (
    <div className="px-10 py-12 max-w-[820px] mx-auto">
      <div className="card-glass p-10 text-center">
        <div className="h-display text-gold-400 text-base mb-3 tracking-[0.2em]">{name}</div>
        <p className="text-sm text-text-muted leading-relaxed">
          {name === "SEGUE"
            ? "Each leader shares 1 personal best, 1 business best from the past week."
            : name === "SCORECARD"
              ? "Walk through metrics. Anything red 2 weeks running auto-flags into IDS."
              : name === "ROCK REVIEW"
                ? "Status check on each rock — On Track, At Risk, or Off Track."
                : name === "HEADLINES"
                  ? "Customer + employee headlines. Signal, not full discussion."
                  : name === "TO-DOS"
                    ? "Review last week's to-dos. Not done = drops to IDS."
                    : "Cascade messages, rate the meeting, AI summary delivered to attendees."}
        </p>
        <div className="text-[10px] text-text-muted font-mono mt-6 tracking-wider">
          USE THE LIVE FEED ON THE RIGHT TO CAPTURE TO-DOS, DECISIONS, OR HEADLINES
        </div>
      </div>
    </div>
  )
}
