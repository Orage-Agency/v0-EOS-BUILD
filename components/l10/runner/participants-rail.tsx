"use client"

import { useEffect, useRef, useState } from "react"
import { useL10Store, type LiveCapture, type Participant } from "@/lib/l10-store"
import { CURRENT_USER, USERS } from "@/lib/mock-data"
import { OrageAvatar } from "@/components/orage/avatar"
import { AIOrb } from "@/components/orage/ai-orb"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function ParticipantsRail({ meetingId }: { meetingId: string }) {
  const meeting = useL10Store((s) => s.getMeeting(meetingId))
  const addCapture = useL10Store((s) => s.addCapture)

  const [text, setText] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const feedRef = useRef<HTMLDivElement>(null)

  // Auto-scroll the feed when new captures appear
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [meeting?.captures.length])

  if (!meeting) return null

  function commit(kind: "todo" | "park" | "decision" | "note") {
    if (!text.trim()) {
      toast("ENTER TEXT FIRST")
      return
    }
    addCapture(meetingId, kind, text.trim(), CURRENT_USER)
    const labels = {
      todo: "TO-DO ADDED",
      park: "PARKED AS ISSUE",
      decision: "DECISION CAPTURED",
      note: "NOTE CAPTURED",
    }
    toast(labels[kind])
    setText("")
    inputRef.current?.focus()
  }

  return (
    <aside
      className="flex flex-col border-l border-border-orage bg-bg-2"
      style={{ width: 320 }}
    >
      <header className="px-5 py-4 border-b border-border-orage flex items-center justify-between">
        <span className="font-display text-text-secondary text-[11px] tracking-[0.2em] uppercase">
          Attendees · {meeting.participants.length}
        </span>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-gold-400">
          <span
            className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-pulse"
            style={{ boxShadow: "0 0 6px var(--gold-500)" }}
          />
          LIVE
        </div>
      </header>

      <ul className="border-b border-border-orage">
        {meeting.participants.map((p, i) => (
          <ParticipantRow
            key={p.userId}
            participant={p}
            isLast={i === meeting.participants.length - 1}
          />
        ))}
      </ul>

      <div className="px-5 py-3 border-b border-border-orage flex items-center gap-2">
        <AIOrb size="xs" />
        <span className="font-display text-text-muted text-[10px] tracking-[0.2em] uppercase">
          Live Capture
        </span>
      </div>

      <div ref={feedRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {meeting.captures.length === 0 ? (
          <div className="text-xs text-text-muted text-center py-8">
            No captures yet. Type below to add a to-do, decision, or note.
          </div>
        ) : (
          meeting.captures.map((c) => <CaptureItem key={c.id} capture={c} />)
        )}
      </div>

      <div className="px-3 py-3 border-t border-border-orage flex items-center gap-1.5 bg-bg-3">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              commit("todo")
            }
          }}
          placeholder="Capture a to-do, decision, or note…"
          className="flex-1 bg-bg-2 border border-border-orage rounded-sm px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold-500 transition-colors"
        />
        <button
          onClick={() => commit("todo")}
          title="Add as to-do (Enter)"
          aria-label="Add as to-do"
          className="w-8 h-8 flex items-center justify-center bg-bg-active hover:bg-bg-hover text-gold-400 rounded-sm border border-border-orage transition-colors"
        >
          ✓
        </button>
        <button
          onClick={() => commit("park")}
          title="Park as issue"
          aria-label="Park as issue"
          className="w-8 h-8 flex items-center justify-center bg-bg-active hover:bg-bg-hover text-text-secondary rounded-sm border border-border-orage transition-colors"
        >
          ⏸
        </button>
      </div>
    </aside>
  )
}

function ParticipantRow({
  participant,
  isLast,
}: {
  participant: Participant
  isLast: boolean
}) {
  const u = USERS.find((x) => x.id === participant.userId)
  if (!u) return null
  const isSpeaking = participant.status === "speaking"
  const isAway = participant.status === "away"

  return (
    <li
      className={cn(
        "flex items-center gap-3 px-5 py-3 transition-colors",
        !isLast && "border-b border-border-orage",
        isSpeaking && "bg-bg-3",
        isAway && "opacity-50",
      )}
    >
      <span
        className={cn(
          "inline-flex rounded-full",
          isSpeaking &&
            "ring-2 ring-gold-500 ring-offset-2 ring-offset-bg-2 shadow-[0_0_10px_rgba(182,128,57,0.5)]",
        )}
      >
        <OrageAvatar user={u} size="md" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-text-primary truncate">{u.name}</div>
        <div className="text-[10px] text-text-muted font-mono uppercase truncate">
          {u.role}
        </div>
      </div>
      <span
        className={cn(
          "font-display text-[10px] tracking-[0.15em] uppercase",
          isSpeaking && "text-gold-400",
          isAway && "text-text-muted",
          !isSpeaking && !isAway && "text-success",
        )}
      >
        {isSpeaking ? "SPEAKING" : isAway ? "AWAY" : "●"}
      </span>
    </li>
  )
}

function CaptureItem({ capture }: { capture: LiveCapture }) {
  const meta =
    capture.kind === "todo"
      ? `TO-DO${capture.ownerLabel ? ` · ${capture.ownerLabel}` : ""}`
      : capture.kind === "decision"
        ? `DECISION${capture.ownerLabel ? ` · ${capture.ownerLabel}` : ""}`
        : capture.kind === "headline"
          ? "HEADLINE"
          : capture.kind === "park"
            ? `PARKED · ${capture.ownerLabel ?? "ISSUE"}`
            : "NOTE"

  const accent =
    capture.kind === "todo"
      ? "border-l-gold-500"
      : capture.kind === "park"
        ? "border-l-warning"
        : capture.kind === "headline"
          ? "border-l-success"
          : "border-l-text-muted"

  return (
    <div
      className={cn(
        "bg-bg-3 border border-border-orage rounded-sm px-3 py-2.5 border-l-2",
        accent,
      )}
    >
      <div className="font-display text-[10px] tracking-[0.15em] text-gold-400 mb-1 uppercase">
        {meta}
      </div>
      <div className="text-xs text-text-primary leading-relaxed">{capture.text}</div>
    </div>
  )
}
