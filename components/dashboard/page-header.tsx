"use client"

import { useEffect, useState } from "react"
import { useUIStore } from "@/lib/store"
import { CURRENT_USER } from "@/lib/mock-data"
import { formatDateChip, shortTime } from "@/lib/format"

type DateChip = { dow: string; month: string; day: number }

/** Quarter computed from the current date, e.g. "Q2 Week 4". */
function quarterStatus(now: Date): { label: string; weekOfQuarter: number; daysIn: number } {
  const month = now.getMonth() // 0-11
  const quarter = Math.floor(month / 3) + 1
  const qStartMonth = quarter * 3 - 3 // 0,3,6,9
  const qStart = new Date(now.getFullYear(), qStartMonth, 1)
  const daysIn = Math.floor((now.getTime() - qStart.getTime()) / 86400000) + 1
  const weekOfQuarter = Math.min(13, Math.max(1, Math.ceil(daysIn / 7)))
  return { label: `Q${quarter} Week ${weekOfQuarter}`, weekOfQuarter, daysIn }
}

export function DashboardHeader({ priorityCount }: { priorityCount?: number }) {
  const [time, setTime] = useState<string>("—")
  const [chip, setChip] = useState<DateChip>({ dow: "—", month: "—", day: 0 })
  const [greeting, setGreeting] = useState<string>("GOOD MORNING")
  const [quarter, setQuarter] = useState<{ label: string; weekOfQuarter: number; daysIn: number }>({
    label: "—",
    weekOfQuarter: 0,
    daysIn: 0,
  })
  const sessionUser = useUIStore((s) => s.currentUser)

  useEffect(() => {
    const now = new Date()
    setTime(shortTime(now))
    setChip(formatDateChip(now))
    setGreeting(greetingFor(now.getHours()))
    setQuarter(quarterStatus(now))
    const id = setInterval(() => {
      const t = new Date()
      setTime(shortTime(t))
      setChip(formatDateChip(t))
      setGreeting(greetingFor(t.getHours()))
      setQuarter(quarterStatus(t))
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  const name = sessionUser?.name ?? CURRENT_USER.name
  const firstName = name.split(" ")[0].toUpperCase()

  // Falls back to a friendly null state when no priorities are explicitly
  // passed — used during SSR before the count is known. Server-side
  // callers should pass the real count.
  const priorityText =
    priorityCount === undefined
      ? null
      : priorityCount > 0
        ? (
            <>
              <strong className="text-gold-400 font-semibold">{priorityCount} {priorityCount === 1 ? "priority" : "priorities"}</strong>{" "}
              {priorityCount === 1 ? "needs" : "need"} your attention
            </>
          )
        : <span className="text-text-secondary">no priorities flagged · clear runway</span>

  return (
    <div className="px-6 md:px-8 pt-6 md:pt-8 pb-0 flex flex-col md:flex-row md:items-end md:justify-between gap-3 md:gap-6">
      <div>
        <h1 className="font-display text-[30px] md:text-[42px] tracking-[0.08em] text-gold-400 leading-none mb-1.5 text-balance">
          <span suppressHydrationWarning>{greeting}</span>, {firstName}
        </h1>
        <p className="text-xs text-text-muted" suppressHydrationWarning>
          {quarter.label} · {quarter.daysIn} {quarter.daysIn === 1 ? "day" : "days"} into sprint
          {priorityText !== null && <> · {priorityText}</>}
        </p>
      </div>
      <div className="flex items-center gap-2 px-3.5 py-2 bg-bg-3 border border-border-orage rounded-sm font-mono text-[11px] text-text-secondary" suppressHydrationWarning>
        <span className="font-display text-sm tracking-[0.15em] text-gold-400">
          {chip.dow} · {chip.month} {chip.day}
        </span>
        <span className="opacity-50">·</span>
        <span>{time}</span>
      </div>
    </div>
  )
}

function greetingFor(hour: number): string {
  if (hour < 12) return "GOOD MORNING"
  if (hour < 18) return "GOOD AFTERNOON"
  return "GOOD EVENING"
}
