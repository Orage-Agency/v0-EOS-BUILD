"use client"

import { TenantLink as Link } from "@/components/tenant-link"
import { useTenantPath } from "@/hooks/use-tenant-path"
import { useL10Store } from "@/lib/l10-store"
import { USERS } from "@/lib/mock-data"
import { useUIStore } from "@/lib/store"
import { useUIStore } from "@/lib/store"
import { OrageAvatar } from "@/components/orage/avatar"
import { IcCalendar, IcArrowRight } from "@/components/orage/icons"
import { useRouter } from "next/navigation"
import { useState } from "react"

function relativeTime(ts: number): string {
  const diffMs = ts - Date.now()
  const day = 24 * 60 * 60 * 1000
  const days = Math.round(diffMs / day)
  if (days === 0) return "TODAY"
  if (days === 1) return "TOMORROW"
  if (days === -1) return "YESTERDAY"
  if (days > 0 && days < 7) return `IN ${days}D`
  if (days > 0) return `IN ${Math.round(days / 7)}W`
  if (days < 0 && days > -7) return `${Math.abs(days)}D AGO`
  return `${Math.abs(Math.round(days / 7))}W AGO`
}

export function L10List() {
  const meetings = useL10Store((s) => s.meetings)
  const createMeeting = useL10Store((s) => s.createMeeting)
  const router = useRouter()
  const tp = useTenantPath()
  const [creating, setCreating] = useState(false)
  const sessionUser = useUIStore((s) => s.currentUser)

  const active = meetings.find((m) => m.status === "in_session")
  const upcoming = meetings
    .filter((m) => m.status === "scheduled")
    .sort((a, b) => a.scheduledAt - b.scheduledAt)
  const past = meetings
    .filter((m) => m.status === "concluded")
    .sort((a, b) => (b.concludedAt ?? 0) - (a.concludedAt ?? 0))

  function handleCreate() {
    setCreating(true)
    const when = Date.now() + 7 * 24 * 60 * 60 * 1000
    const id = createMeeting(when)
    router.push(tp(`/l10/${id}`))
  }

  return (
    <div className="px-8 py-8 max-w-[1100px] mx-auto">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-text-primary text-3xl mb-1 tracking-[0.05em]">
            L10 MEETINGS
          </h1>
          <p className="text-sm text-text-muted">
            Weekly leadership rhythm · agenda → IDS → conclude
          </p>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="px-4 py-2 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-text-on-gold text-xs font-semibold tracking-wider uppercase rounded-sm transition-colors"
        >
          {creating ? "Creating..." : "Schedule Meeting"}
        </button>
      </header>

      {active && (
        <section className="mb-8">
          <SectionLabel>In Session</SectionLabel>
          <Link href={`/l10/${active.id}/run`} className="block group">
            <div className="glass p-5 border border-gold-500 rounded-md relative overflow-hidden transition-shadow hover:shadow-[0_0_30px_rgba(182,128,57,0.2)]">
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-r from-[rgba(182,128,57,0.08)] to-transparent pointer-events-none"
              />
              <div className="relative flex items-center gap-4">
                <span
                  className="w-2.5 h-2.5 rounded-full bg-gold-500 animate-pulse"
                  style={{ boxShadow: "0 0 10px var(--gold-500)" }}
                />
                <div className="flex-1">
                  <div className="font-display text-gold-400 text-base mb-0.5 tracking-[0.1em]">
                    {active.name}
                  </div>
                  <div className="text-xs text-text-muted font-mono">
                    LIVE · STARTED{" "}
                    {active.startedAt
                      ? new Date(active.startedAt).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "—"}
                  </div>
                </div>
                <div className="flex items-center -space-x-1">
                  {active.participants.slice(0, 4).map((p) => {
                    const u = USERS.find((x) => x.id === p.userId)
                    if (!u) return null
                    return (
                      <span
                        key={p.userId}
                        className={p.status === "away" ? "opacity-50" : ""}
                      >
                        <OrageAvatar user={u} size="sm" />
                      </span>
                    )
                  })}
                </div>
                <span className="text-xs font-mono text-gold-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  JOIN RUNNER <IcArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </Link>
        </section>
      )}

      <section className="mb-8">
        <SectionLabel>Upcoming</SectionLabel>
        {upcoming.length === 0 ? (
          <EmptyState text="No upcoming meetings scheduled." />
        ) : (
          <div className="glass rounded-md overflow-hidden">
            {upcoming.map((m, i) => (
              <MeetingRow
                key={m.id}
                meeting={m}
                isLast={i === upcoming.length - 1}
                kind="upcoming"
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionLabel>Past Meetings</SectionLabel>
        {past.length === 0 ? (
          <EmptyState text="No past meetings yet." />
        ) : (
          <div className="glass rounded-md overflow-hidden">
            {past.map((m, i) => (
              <MeetingRow
                key={m.id}
                meeting={m}
                isLast={i === past.length - 1}
                kind="past"
                currentUserId={sessionUser?.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-display text-text-muted text-xs tracking-[0.2em] mb-3 uppercase">
      {children}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="glass rounded-md px-5 py-10 text-center text-sm text-text-muted font-mono uppercase tracking-wider">
      {text}
    </div>
  )
}

function MeetingRow({
  meeting,
  isLast,
  kind,
  currentUserId,
}: {
  meeting: ReturnType<typeof useL10Store.getState>["meetings"][number]
  isLast: boolean
  kind: "upcoming" | "past"
  currentUserId?: string
}) {
  const date = new Date(meeting.scheduledAt)
  const myRating =
    kind === "past"
      ? meeting.participants.find((p) => p.userId === currentUserId)?.rating
      : undefined

  return (
    <Link
      href={`/l10/${meeting.id}`}
      className={`flex items-center gap-4 px-5 py-4 hover:bg-bg-hover transition-colors ${
        !isLast ? "border-b border-border-orage" : ""
      }`}
    >
      <div className="w-10 h-10 rounded-sm bg-bg-active flex items-center justify-center text-gold-400">
        <IcCalendar className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-text-primary font-medium mb-0.5 truncate">
          {meeting.name}
        </div>
        <div className="text-xs text-text-muted font-mono">
          {date
            .toLocaleDateString([], {
              weekday: "short",
              month: "short",
              day: "numeric",
            })
            .toUpperCase()}{" "}
          ·{" "}
          {date.toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}{" "}
          · {meeting.durationMin} MIN
        </div>
      </div>
      <div className="flex items-center -space-x-1">
        {meeting.participants.slice(0, 4).map((p) => {
          const u = USERS.find((x) => x.id === p.userId)
          if (!u) return null
          return (
            <span
              key={p.userId}
              className={p.status === "away" ? "opacity-50" : ""}
            >
              <OrageAvatar user={u} size="sm" />
            </span>
          )
        })}
      </div>
      {kind === "past" && (
        <div className="flex items-center gap-3">
          {meeting.attendedCount !== undefined && (
            <span className="text-xs font-mono text-text-muted">
              {meeting.attendedCount}/{meeting.participants.length}
            </span>
          )}
          {myRating !== undefined && (
            <span className="text-xs font-mono text-gold-400">{myRating}/10</span>
          )}
          {meeting.notesPosted && (
            <span className="font-display text-[10px] tracking-[0.15em] px-2 py-0.5 rounded-sm bg-bg-active text-gold-400">
              SUMMARY
            </span>
          )}
        </div>
      )}
      {kind === "upcoming" && (
        <span className="text-xs font-mono text-text-muted">
          {relativeTime(meeting.scheduledAt)}
        </span>
      )}
    </Link>
  )
}
