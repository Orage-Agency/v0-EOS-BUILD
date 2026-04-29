"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTenantPath } from "@/hooks/use-tenant-path"
import { useL10Store } from "@/lib/l10-store"
import { USERS } from "@/lib/mock-data"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { AIOrb } from "@/components/orage/ai-orb"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function ConcludeModal({ meetingId }: { meetingId: string }) {
  const concludeOpen = useL10Store((s) => s.concludeOpen)
  const closeConclude = useL10Store((s) => s.closeConclude)
  const meeting = useL10Store((s) => s.getMeeting(meetingId))
  const setCascadingMessage = useL10Store((s) => s.setCascadingMessage)
  const setRating = useL10Store((s) => s.setParticipantRating)
  const conclude = useL10Store((s) => s.conclude)
  const router = useRouter()
  const tp = useTenantPath()

  const [cascading, setCascading] = useState("")

  useEffect(() => {
    if (concludeOpen && meeting) {
      setCascading(
        meeting.cascadingMessage ??
          "Discovery calls dipped 2 weeks — root-causing this week. Brooklyn focused on Toolkit T1. Client NPS hit 74 (record).",
      )
    }
  }, [concludeOpen, meeting])

  if (!meeting) return null

  const greenCount = meeting.captures.filter((c) => c.kind === "headline").length
  const todoCount = meeting.captures.filter((c) => c.kind === "todo").length
  const parkedCount = meeting.captures.filter((c) => c.kind === "park").length

  function handleConfirm() {
    setCascadingMessage(meetingId, cascading)
    conclude(meetingId)
    toast("MEETING CONCLUDED · SUMMARY SENT TO #ORAGE-L10")
    router.push(tp(`/l10/${meetingId}`))
  }

  return (
    <Dialog open={concludeOpen} onOpenChange={(o) => !o && closeConclude()}>
      <DialogContent className="card-glass max-w-2xl border-gold-500 max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border-orage">
          <DialogTitle className="h-display text-gold-400 text-lg tracking-[0.15em]">
            CONCLUDE MEETING
          </DialogTitle>
          <DialogDescription className="text-xs text-text-muted">
            Cascading messages · rate the meeting · AI auto-summary delivered to attendees + #orage-l10
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="h-display text-text-muted text-[11px] tracking-[0.2em] block mb-2">
              Cascading Message
            </label>
            <textarea
              value={cascading}
              onChange={(e) => setCascading(e.target.value)}
              rows={4}
              placeholder="What needs to be communicated to the rest of the team this week?"
              className="w-full bg-bg-3 border border-border-orage rounded-sm px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted resize-y leading-relaxed focus:outline-none focus:border-gold-500 transition-colors"
            />
          </div>

          <div>
            <label className="h-display text-text-muted text-[11px] tracking-[0.2em] block mb-2">
              Rate the Meeting
            </label>
            <div className="flex flex-col gap-2">
              {meeting.participants
                .filter((p) => p.status !== "away")
                .map((p) => {
                  const u = USERS.find((x) => x.id === p.userId)
                  if (!u) return null
                  return (
                    <RateRow
                      key={p.userId}
                      name={u.name}
                      value={p.rating ?? 0}
                      onChange={(v) => setRating(meetingId, p.userId, v)}
                    />
                  )
                })}
            </div>
          </div>

          <div className="rounded-sm p-4 border border-gold-500 bg-gradient-to-br from-[rgba(182,128,57,0.08)] to-[rgba(228,175,122,0.04)]">
            <div className="flex items-center gap-2 mb-2">
              <AIOrb className="w-3 h-3" />
              <span className="h-display text-gold-500 text-[10px] tracking-[0.2em]">
                AI · AUTO-SUMMARY · WILL POST AFTER CONCLUDE
              </span>
            </div>
            <div className="text-xs text-text-secondary leading-relaxed space-y-2">
              <p>
                <strong className="text-gold-400">
                  L10 ·{" "}
                  {new Date(meeting.scheduledAt)
                    .toLocaleDateString([], { month: "short", day: "numeric" })
                    .toUpperCase()}{" "}
                  · IN-PROGRESS · ATTENDED{" "}
                  {meeting.participants.filter((p) => p.status !== "away").length}/
                  {meeting.participants.length}
                </strong>
              </p>
              <p>
                <strong className="text-gold-400">IDS Resolved:</strong>{" "}
                {meeting.ids.filter((i) => i.resolved).length} of {meeting.ids.length} issues.{" "}
                {todoCount} to-dos created, {parkedCount} parked, {greenCount} headlines.
              </p>
              <p>
                <strong className="text-gold-400">Captures:</strong>{" "}
                {meeting.captures.length} live entries collected during the session.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border-orage flex items-center justify-end gap-2">
          <button
            onClick={closeConclude}
            className="h-9 px-4 bg-bg-3 border border-border-orage hover:bg-bg-4 text-text-secondary text-xs font-semibold tracking-wider uppercase rounded-sm transition-colors"
          >
            Cancel · Resume
          </button>
          <button
            onClick={handleConfirm}
            className="h-9 px-4 bg-gold-500 hover:bg-gold-400 text-bg-1 text-xs font-semibold tracking-wider uppercase rounded-sm transition-colors"
          >
            Conclude & Send Summary
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function RateRow({
  name,
  value,
  onChange,
}: {
  name: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-text-secondary w-32 truncate">{name}</span>
      <div className="flex gap-1 flex-1">
        {Array.from({ length: 10 }).map((_, i) => {
          const n = i + 1
          const isActive = n <= value
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              className={cn(
                "flex-1 h-7 rounded-sm border text-[10px] font-mono transition-colors",
                isActive
                  ? "bg-gold-500 border-gold-500 text-bg-1"
                  : "bg-bg-3 border-border-orage text-text-muted hover:bg-bg-4",
              )}
            >
              {n}
            </button>
          )
        })}
      </div>
    </div>
  )
}
