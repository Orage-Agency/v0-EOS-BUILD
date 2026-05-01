"use client"

import { useEffect, useState } from "react"
import { TenantLink as Link } from "@/components/tenant-link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useTenantPath } from "@/hooks/use-tenant-path"
import { useL10Store } from "@/lib/l10-store"
import { USERS } from "@/lib/mock-data"
import { OrageAvatar } from "@/components/orage/avatar"
import { IcCheck, IcClose } from "@/components/orage/icons"
import { cn } from "@/lib/utils"

function toLocalDateInput(ts: number): string {
  const d = new Date(ts)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function toLocalTimeInput(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${hh}:${mm}`
}

function fromLocalInputs(date: string, time: string): number | null {
  if (!date || !time) return null
  const ts = new Date(`${date}T${time}:00`).getTime()
  return Number.isNaN(ts) ? null : ts
}

export function L10Detail({ id }: { id: string }) {
  const meeting = useL10Store((s) => s.getMeeting(id))
  const renameMeeting = useL10Store((s) => s.renameMeeting)
  const rescheduleMeeting = useL10Store((s) => s.rescheduleMeeting)
  const cancelMeeting = useL10Store((s) => s.cancelMeeting)
  const deleteMeeting = useL10Store((s) => s.deleteMeeting)
  const addAgendaSegment = useL10Store((s) => s.addAgendaSegment)
  const updateAgendaSegment = useL10Store((s) => s.updateAgendaSegment)
  const removeAgendaSegment = useL10Store((s) => s.removeAgendaSegment)
  const router = useRouter()
  const tp = useTenantPath()

  const [titleDraft, setTitleDraft] = useState("")
  const [dateDraft, setDateDraft] = useState("")
  const [timeDraft, setTimeDraft] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [newSegName, setNewSegName] = useState("")
  const [newSegMin, setNewSegMin] = useState(10)
  const [showAddSeg, setShowAddSeg] = useState(false)

  useEffect(() => {
    if (meeting) {
      setTitleDraft(meeting.name)
      setDateDraft(toLocalDateInput(meeting.scheduledAt))
      setTimeDraft(toLocalTimeInput(meeting.scheduledAt))
      setConfirmDelete(false)
      setConfirmCancel(false)
      setShowAddSeg(false)
      setNewSegName("")
      setNewSegMin(10)
    }
  }, [meeting?.id])

  if (!meeting) {
    return (
      <div className="px-8 py-12 max-w-[900px] mx-auto">
        <div className="glass rounded-md p-8 text-center text-text-muted text-sm">
          Meeting not found.{" "}
          <Link href="/l10" className="text-gold-400 underline">
            Back to L10
          </Link>
        </div>
      </div>
    )
  }

  const isUpcoming = meeting.status === "scheduled"
  const isLive = meeting.status === "in_session"
  const isPast = meeting.status === "concluded"
  const isCancelled = meeting.name.startsWith("[CANCELLED]")

  const totalSec = meeting.agenda.reduce((acc, a) => acc + a.durationSec, 0)
  const totalMin = Math.round(totalSec / 60)

  function commitTitle() {
    const next = titleDraft.trim()
    if (!next || !meeting || next === meeting.name) {
      setTitleDraft(meeting?.name ?? "")
      return
    }
    renameMeeting(meeting.id, next)
  }

  function commitDateTime() {
    if (!meeting) return
    const ts = fromLocalInputs(dateDraft, timeDraft)
    if (ts === null || ts === meeting.scheduledAt) return
    rescheduleMeeting(meeting.id, ts)
    toast(`Rescheduled to ${new Date(ts).toLocaleString()}`)
  }

  function handleCancel() {
    if (!meeting) return
    if (!confirmCancel) {
      setConfirmCancel(true)
      toast("Click cancel again to confirm — agenda + notes are preserved.", {
        duration: 3500,
      })
      setTimeout(() => setConfirmCancel(false), 3500)
      return
    }
    cancelMeeting(meeting.id)
    toast(`Cancelled "${meeting.name}"`)
    setConfirmCancel(false)
  }

  function handleDelete() {
    if (!meeting) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      toast("Click delete again to permanently remove this meeting.", { duration: 3500 })
      setTimeout(() => setConfirmDelete(false), 3500)
      return
    }
    deleteMeeting(meeting.id)
    toast(`Deleted meeting`)
    router.push(tp("/l10"))
  }

  return (
    <div className="px-8 py-8 max-w-[900px] mx-auto">
      <Link
        href="/l10"
        className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary mb-4 transition-colors font-mono"
      >
        ← L10 MEETINGS
      </Link>

      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <input
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur()
              if (e.key === "Escape") {
                setTitleDraft(meeting.name)
                ;(e.target as HTMLInputElement).blur()
              }
            }}
            className="w-full bg-transparent font-display text-text-primary text-3xl mb-1 tracking-[0.05em] outline-none rounded px-1 -mx-1 hover:bg-bg-3/40 focus:bg-bg-3 focus:ring-1 focus:ring-gold-500/40"
            aria-label="Edit meeting title"
          />
          <div className="flex items-center gap-2 text-sm text-text-muted font-mono mt-1">
            <input
              type="date"
              value={dateDraft}
              onChange={(e) => setDateDraft(e.target.value)}
              onBlur={commitDateTime}
              className="bg-bg-3 border border-border-orage rounded-sm px-2 py-1 text-[12px] outline-none focus:border-gold-500"
              disabled={isPast}
            />
            <input
              type="time"
              value={timeDraft}
              onChange={(e) => setTimeDraft(e.target.value)}
              onBlur={commitDateTime}
              className="bg-bg-3 border border-border-orage rounded-sm px-2 py-1 text-[12px] outline-none focus:border-gold-500"
              disabled={isPast}
            />
            <span className="text-text-muted text-[11px]">· {totalMin} MIN</span>
            {isCancelled && (
              <span className="px-2 py-0.5 rounded-sm border border-danger/40 bg-danger/10 text-danger text-[10px] font-display tracking-[0.15em]">
                CANCELLED
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {(isLive || isUpcoming) && !isCancelled && (
            <button
              onClick={() => router.push(tp(`/l10/${meeting.id}/run`))}
              className="px-4 py-2 bg-gold-500 hover:bg-gold-400 text-text-on-gold text-xs font-semibold tracking-wider uppercase rounded-sm transition-colors"
            >
              {isLive ? "Join Runner" : "Start Meeting"}
            </button>
          )}
          <div className="flex items-center gap-1">
            {isUpcoming && !isCancelled && (
              <button
                type="button"
                onClick={handleCancel}
                className={cn(
                  "px-2 py-1 rounded-sm text-[11px] font-mono tracking-wider transition-colors",
                  confirmCancel
                    ? "bg-warning text-text-on-gold"
                    : "text-text-muted hover:bg-warning/10 hover:text-warning",
                )}
              >
                {confirmCancel ? "CONFIRM" : "CANCEL MTG"}
              </button>
            )}
            <button
              type="button"
              onClick={handleDelete}
              className={cn(
                "px-2 py-1 rounded-sm text-[11px] font-mono tracking-wider transition-colors",
                confirmDelete
                  ? "bg-danger text-white"
                  : "text-text-muted hover:bg-danger/10 hover:text-danger",
              )}
            >
              {confirmDelete ? "CONFIRM" : "DELETE"}
            </button>
          </div>
        </div>
      </header>

      <section className="glass rounded-md mb-6 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border-orage flex items-center justify-between gap-2">
          <span className="font-display text-text-muted text-[11px] tracking-[0.2em] uppercase">
            Agenda · {meeting.agenda.length} segments
          </span>
          {!isPast && (
            <button
              type="button"
              onClick={() => setShowAddSeg((v) => !v)}
              className="text-gold-400 hover:text-gold-500 text-[11px] font-mono uppercase tracking-wider"
            >
              {showAddSeg ? "Cancel" : "+ Segment"}
            </button>
          )}
        </div>

        {showAddSeg && !isPast && (
          <div className="px-5 py-3 border-b border-border-orage bg-bg-3/40 flex items-center gap-2">
            <input
              autoFocus
              value={newSegName}
              onChange={(e) => setNewSegName(e.target.value)}
              placeholder="Segment name (e.g. Headlines, Scorecard)"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newSegName.trim()) {
                  addAgendaSegment(meeting.id, newSegName, newSegMin)
                  setNewSegName("")
                  setNewSegMin(10)
                  setShowAddSeg(false)
                  toast("Segment added")
                }
              }}
              className="flex-1 bg-bg-2 border border-border-orage rounded-sm px-2 py-1.5 text-[13px] text-text-primary outline-none focus:border-gold-500"
            />
            <input
              type="number"
              min={1}
              max={120}
              value={newSegMin}
              onChange={(e) => setNewSegMin(Number(e.target.value) || 10)}
              className="w-16 bg-bg-2 border border-border-orage rounded-sm px-2 py-1.5 text-[12px] font-mono text-text-secondary outline-none focus:border-gold-500"
            />
            <span className="text-[10px] font-mono text-text-muted">MIN</span>
            <button
              type="button"
              onClick={() => {
                if (!newSegName.trim()) return
                addAgendaSegment(meeting.id, newSegName, newSegMin)
                setNewSegName("")
                setNewSegMin(10)
                setShowAddSeg(false)
                toast("Segment added")
              }}
              className="px-3 py-1.5 bg-gold-500 hover:bg-gold-400 text-text-on-gold text-[11px] font-semibold tracking-wider rounded-sm"
            >
              ADD
            </button>
          </div>
        )}

        {meeting.agenda.length === 0 ? (
          <div className="px-5 py-8 text-center text-text-muted text-[12px]">
            No segments yet. Add one to start building this meeting&apos;s flow.
          </div>
        ) : (
          <ul>
            {meeting.agenda.map((a, i) => (
              <SegmentRow
                key={a.id}
                meetingId={meeting.id}
                segment={a}
                index={i}
                last={i === meeting.agenda.length - 1}
                editable={!isPast}
                onUpdate={(patch) => updateAgendaSegment(meeting.id, a.id, patch)}
                onRemove={() => {
                  removeAgendaSegment(meeting.id, a.id)
                  toast(`Removed "${a.name}"`)
                }}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="glass rounded-md mb-6 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border-orage">
          <span className="font-display text-text-muted text-[11px] tracking-[0.2em] uppercase">
            Attendees · {meeting.participants.length}
          </span>
        </div>
        <ul>
          {meeting.participants.map((p, i) => {
            const u = USERS.find((x) => x.id === p.userId)
            if (!u) return null
            return (
              <li
                key={p.userId}
                className={`flex items-center gap-3 px-5 py-3 ${
                  i < meeting.participants.length - 1
                    ? "border-b border-border-orage"
                    : ""
                } ${p.status === "away" ? "opacity-50" : ""}`}
              >
                <OrageAvatar user={u} size="md" />
                <div className="flex-1">
                  <div className="text-sm text-text-primary">{u.name}</div>
                  <div className="text-[10px] text-text-muted font-mono uppercase">
                    {u.role}
                  </div>
                </div>
                {p.status === "away" && (
                  <span className="font-display text-[10px] tracking-[0.15em] text-text-muted uppercase">
                    AWAY
                  </span>
                )}
                {p.rating !== undefined && (
                  <span className="text-xs font-mono text-gold-400">
                    {p.rating}/10
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      {isPast && meeting.cascadingMessage && (
        <section className="glass rounded-md mb-6 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border-orage">
            <span className="font-display text-text-muted text-[11px] tracking-[0.2em] uppercase">
              Cascading Message
            </span>
          </div>
          <div className="px-5 py-4 text-sm text-text-secondary leading-relaxed">
            {meeting.cascadingMessage}
          </div>
        </section>
      )}
    </div>
  )
}

function SegmentRow({
  segment,
  index,
  last,
  editable,
  onUpdate,
  onRemove,
}: {
  meetingId: string
  segment: { id: string; name: string; durationSec: number; status: string; actualSec?: number }
  index: number
  last: boolean
  editable: boolean
  onUpdate: (patch: { name?: string; durationMin?: number }) => void
  onRemove: () => void
}) {
  const [name, setName] = useState(segment.name)
  const [min, setMin] = useState(Math.round(segment.durationSec / 60))

  useEffect(() => {
    setName(segment.name)
    setMin(Math.round(segment.durationSec / 60))
  }, [segment.name, segment.durationSec])

  function commit() {
    const trimmed = name.trim()
    if (trimmed && trimmed !== segment.name) onUpdate({ name: trimmed })
    if (min > 0 && min * 60 !== segment.durationSec) onUpdate({ durationMin: min })
  }

  return (
    <li
      className={`group flex items-center gap-4 px-5 py-3.5 ${
        !last ? "border-b border-border-orage" : ""
      }`}
    >
      <span
        className={cn(
          "font-display text-base w-9 text-center rounded-sm py-1 tracking-wider",
          segment.status === "active"
            ? "bg-gold-500 text-text-on-gold"
            : segment.status === "done"
              ? "bg-bg-active text-gold-400 line-through opacity-60"
              : "bg-bg-active text-gold-400",
        )}
      >
        {index + 1}
      </span>
      <div className="flex-1">
        {editable ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur()
            }}
            className="w-full bg-transparent text-sm text-text-primary outline-none rounded px-1 -mx-1 hover:bg-bg-3/40 focus:bg-bg-3 focus:ring-1 focus:ring-gold-500/40"
          />
        ) : (
          <div className="text-sm text-text-primary">{segment.name}</div>
        )}
        <div className="text-[10px] text-text-muted font-mono mt-0.5 flex items-center gap-1">
          {editable ? (
            <>
              <input
                type="number"
                min={1}
                max={180}
                value={min}
                onChange={(e) => setMin(Number(e.target.value) || 1)}
                onBlur={commit}
                className="w-12 bg-bg-3 border border-border-orage rounded-sm px-1 text-[10px] text-text-secondary outline-none focus:border-gold-500"
              />
              MIN
            </>
          ) : (
            <>{Math.round(segment.durationSec / 60)} MIN</>
          )}
          {segment.actualSec ? ` · actual ${formatTime(segment.actualSec)}` : ""}
        </div>
      </div>
      {segment.status === "done" && <IcCheck className="w-4 h-4 text-success" />}
      {segment.status === "active" && (
        <span className="font-display text-[10px] tracking-[0.15em] text-gold-400 uppercase">
          ACTIVE
        </span>
      )}
      {editable && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove segment"
          className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition"
        >
          <IcClose className="w-3.5 h-3.5" />
        </button>
      )}
    </li>
  )
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}
