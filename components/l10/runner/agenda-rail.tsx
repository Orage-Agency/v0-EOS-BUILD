"use client"

import { useL10Store, type AgendaItem } from "@/lib/l10-store"
import { toast } from "sonner"

function fmtClock(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function AgendaRail({ meetingId }: { meetingId: string }) {
  const meeting = useL10Store((s) => s.getMeeting(meetingId))
  const advanceRound = useL10Store((s) => s.advanceRound)
  const openConclude = useL10Store((s) => s.openConclude)

  if (!meeting) return null

  const startedAt = meeting.startedAt
  const elapsedSec = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0

  return (
    <aside
      className="flex flex-col border-r border-border-orage bg-bg-2"
      style={{ width: 280 }}
    >
      <header className="px-5 py-5 border-b border-border-orage">
        <div className="h-display text-gold-400 text-base mb-1">{meeting.name}</div>
        <div className="text-[10px] text-text-muted font-mono mb-3">
          {new Date(meeting.scheduledAt)
            .toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })
            .toUpperCase()}{" "}
          ·{" "}
          {new Date(meeting.scheduledAt).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-gold-400">
          <span
            className="w-2 h-2 rounded-full bg-gold-500 animate-pulse"
            style={{ boxShadow: "0 0 8px var(--gold-500)" }}
          />
          IN SESSION · {fmtClock(elapsedSec)}
        </div>
      </header>

      <ul className="flex-1 overflow-y-auto py-2">
        {meeting.agenda.map((a, i) => (
          <AgendaRow key={a.id} item={a} index={i} />
        ))}
      </ul>

      <footer className="px-4 py-4 border-t border-border-orage flex flex-col gap-2">
        <button
          onClick={() => {
            advanceRound(meetingId)
            toast("ROUND ADVANCED → NEXT")
          }}
          className="w-full h-9 bg-gold-500 hover:bg-gold-400 text-bg-1 text-xs font-semibold tracking-wider uppercase rounded-sm transition-colors"
        >
          Advance Round →
        </button>
        <button
          onClick={() => toast("AGENDA EDITED · NEXT ROUND")}
          className="w-full h-9 bg-bg-3 border border-border-orage hover:bg-bg-4 text-text-secondary text-xs font-semibold tracking-wider uppercase rounded-sm transition-colors"
        >
          Customize Agenda
        </button>
        <button
          onClick={openConclude}
          className="w-full h-9 bg-bg-3 border border-danger/40 hover:bg-danger/10 text-danger text-xs font-semibold tracking-wider uppercase rounded-sm transition-colors"
        >
          End Meeting Early
        </button>
      </footer>
    </aside>
  )
}

function AgendaRow({ item, index }: { item: AgendaItem; index: number }) {
  const isDone = item.status === "done"
  const isActive = item.status === "active"

  return (
    <li
      className={`flex items-center gap-3 px-5 py-3 transition-colors ${
        isActive ? "bg-bg-3 border-l-2 border-gold-500" : isDone ? "opacity-50" : ""
      }`}
    >
      <span
        className={`h-display text-sm w-7 h-7 flex items-center justify-center rounded-sm ${
          isActive
            ? "bg-gold-500 text-bg-1"
            : isDone
              ? "bg-bg-active text-text-muted line-through"
              : "bg-bg-active text-gold-400"
        }`}
      >
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <div
          className={`h-display text-[12px] tracking-[0.12em] truncate ${
            isActive ? "text-gold-400" : isDone ? "text-text-muted" : "text-text-secondary"
          }`}
        >
          {item.name}
        </div>
        <div className="text-[10px] text-text-muted font-mono mt-0.5">
          {Math.round(item.durationSec / 60)} MIN
          {item.actualSec ? ` · ${fmtClock(item.actualSec)}` : ""}
        </div>
      </div>
    </li>
  )
}
