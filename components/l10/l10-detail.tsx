"use client"

import { TenantLink as Link } from "@/components/tenant-link"
import { useRouter } from "next/navigation"
import { useTenantPath } from "@/hooks/use-tenant-path"
import { useL10Store } from "@/lib/l10-store"
import { USERS } from "@/lib/mock-data"
import { OrageAvatar } from "@/components/orage/avatar"
import { IcCheck } from "@/components/orage/icons"

export function L10Detail({ id }: { id: string }) {
  const meeting = useL10Store((s) => s.getMeeting(id))
  const router = useRouter()
  const tp = useTenantPath()

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

  const date = new Date(meeting.scheduledAt)
  const isUpcoming = meeting.status === "scheduled"
  const isLive = meeting.status === "in_session"
  const isPast = meeting.status === "concluded"

  const totalSec = meeting.agenda.reduce((acc, a) => acc + a.durationSec, 0)
  const totalMin = Math.round(totalSec / 60)

  return (
    <div className="px-8 py-8 max-w-[900px] mx-auto">
      <Link
        href="/l10"
        className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary mb-4 transition-colors font-mono"
      >
        ← L10 MEETINGS
      </Link>

      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-text-primary text-3xl mb-1 tracking-[0.05em]">
            {meeting.name}
          </h1>
          <p className="text-sm text-text-muted font-mono">
            {date
              .toLocaleDateString([], {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })
              .toUpperCase()}{" "}
            ·{" "}
            {date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} ·{" "}
            {totalMin} MIN
          </p>
        </div>
        {(isLive || isUpcoming) && (
          <button
            onClick={() => router.push(tp(`/l10/${meeting.id}/run`))}
            className="px-4 py-2 bg-gold-500 hover:bg-gold-400 text-text-on-gold text-xs font-semibold tracking-wider uppercase rounded-sm transition-colors"
          >
            {isLive ? "Join Runner" : "Start Meeting"}
          </button>
        )}
      </header>

      <section className="glass rounded-md mb-6 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border-orage flex items-center justify-between">
          <span className="font-display text-text-muted text-[11px] tracking-[0.2em] uppercase">
            Agenda · {meeting.agenda.length} segments
          </span>
        </div>
        <ul>
          {meeting.agenda.map((a, i) => (
            <li
              key={a.id}
              className={`flex items-center gap-4 px-5 py-3.5 ${
                i < meeting.agenda.length - 1 ? "border-b border-border-orage" : ""
              }`}
            >
              <span
                className={`font-display text-base w-9 text-center rounded-sm py-1 tracking-wider ${
                  a.status === "active"
                    ? "bg-gold-500 text-text-on-gold"
                    : a.status === "done"
                      ? "bg-bg-active text-gold-400 line-through opacity-60"
                      : "bg-bg-active text-gold-400"
                }`}
              >
                {i + 1}
              </span>
              <div className="flex-1">
                <div className="text-sm text-text-primary">{a.name}</div>
                <div className="text-[10px] text-text-muted font-mono mt-0.5">
                  {Math.round(a.durationSec / 60)} MIN
                  {a.actualSec ? ` · actual ${formatTime(a.actualSec)}` : ""}
                </div>
              </div>
              {a.status === "done" && <IcCheck className="w-4 h-4 text-success" />}
              {a.status === "active" && (
                <span className="font-display text-[10px] tracking-[0.15em] text-gold-400 uppercase">
                  ACTIVE
                </span>
              )}
            </li>
          ))}
        </ul>
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

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}
