"use client"

import { useMemo } from "react"
import { usePeopleStore, type OneOnOne } from "@/lib/people-store"
import { cn } from "@/lib/utils"

const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

export function OneOnOneHistory({ personId }: { personId: string }) {
  // P0-2: subscribe to the raw `oneOnOnes` array (stable reference until
  // mutation), then derive the per-person sorted list via useMemo. The
  // previous selector `(s) => s.getOneOnOnesFor(personId)` returned a
  // freshly built array on every render → React detected an infinite
  // update loop and the profile pages crashed with #185.
  const oneOnOnes = usePeopleStore((s) => s.oneOnOnes)
  const list = useMemo<OneOnOne[]>(
    () =>
      oneOnOnes
        .filter((o) => o.personId === personId)
        .sort((a, b) => b.scheduledAt - a.scheduledAt),
    [oneOnOnes, personId],
  )
  const openDrawer = usePeopleStore((s) => s.openOneOnOneDrawer)
  const openSchedule = () =>
    usePeopleStore.setState({ scheduleOpenForPersonId: personId })

  return (
    <section>
      <header className="flex items-center justify-between mb-3">
        <h3 className="font-display text-text-primary text-base tracking-[0.1em] uppercase">
          1:1 History
        </h3>
        <button
          onClick={openSchedule}
          className="h-7 px-3 text-[11px] font-semibold tracking-wider uppercase rounded-sm bg-bg-3 border border-border-orage hover:bg-bg-hover text-text-secondary transition-colors"
        >
          + Schedule
        </button>
      </header>

      {list.length === 0 ? (
        <div className="glass rounded-md px-5 py-6 text-center text-sm text-text-muted">
          No 1:1 sessions yet.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((o) => (
            <OneOnOneRow key={o.id} ooo={o} onOpen={() => openDrawer(o.id)} />
          ))}
        </ul>
      )}
    </section>
  )
}

function OneOnOneRow({
  ooo,
  onOpen,
}: {
  ooo: OneOnOne
  onOpen: () => void
}) {
  const d = new Date(ooo.scheduledAt)
  const dow = DOW[d.getDay()]
  const day = d.getDate()
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })

  return (
    <li
      onClick={onOpen}
      className={cn(
        "flex items-center gap-4 bg-bg-3 border border-border-orage rounded-sm px-3 py-3 hover:bg-bg-hover transition-colors cursor-pointer",
        ooo.status === "upcoming" && "border-l-2 border-l-gold-500",
        ooo.status === "missed" && "opacity-60",
      )}
    >
      <div className="w-12 h-12 bg-bg-2 rounded-sm flex flex-col items-center justify-center flex-shrink-0">
        <span className="font-display text-[9px] tracking-[0.2em] text-text-muted leading-none">
          {dow}
        </span>
        <span className="font-display text-text-primary text-lg leading-none mt-1">
          {day.toString().padStart(2, "0")}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-text-primary mb-0.5 truncate">{ooo.title}</div>
        <div className="text-[11px] text-text-muted leading-relaxed line-clamp-1">
          {ooo.preview ?? "—"}
        </div>
      </div>
      <div className="text-[11px] text-text-muted font-mono whitespace-nowrap hidden md:block">
        {time} · {ooo.durationMin} MIN
      </div>
      <StatusBadge status={ooo.status} />
    </li>
  )
}

function StatusBadge({ status }: { status: OneOnOne["status"] }) {
  const map: Record<
    OneOnOne["status"],
    { label: string; cls: string }
  > = {
    upcoming: { label: "UPCOMING", cls: "bg-gold-500/15 text-gold-400 border-gold-500/30" },
    completed: { label: "COMPLETED", cls: "bg-success/15 text-success border-success/30" },
    missed: { label: "MISSED", cls: "bg-danger/15 text-danger border-danger/30" },
    cancelled: { label: "CANCELLED", cls: "bg-bg-active text-text-muted border-border-orage" },
  }
  const m = map[status]
  return (
    <span
      className={cn(
        "font-display text-[9px] tracking-[0.18em] px-2 py-0.5 rounded-sm border uppercase",
        m.cls,
      )}
    >
      {m.label}
    </span>
  )
}
