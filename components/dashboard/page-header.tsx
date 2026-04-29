"use client"

import { useEffect, useState } from "react"
import { useUIStore } from "@/lib/store"
import { CURRENT_USER } from "@/lib/mock-data"
import { formatDateChip, shortTime } from "@/lib/format"

type DateChip = { dow: string; month: string; day: number }

export function DashboardHeader() {
  const [time, setTime] = useState<string>("—")
  const [chip, setChip] = useState<DateChip>({ dow: "—", month: "—", day: 0 })
  const [greeting, setGreeting] = useState<string>("GOOD MORNING")
  const sessionUser = useUIStore((s) => s.currentUser)

  useEffect(() => {
    const now = new Date()
    setTime(shortTime(now))
    setChip(formatDateChip(now))
    setGreeting(greetingFor(now.getHours()))
    const id = setInterval(() => {
      const t = new Date()
      setTime(shortTime(t))
      setChip(formatDateChip(t))
      setGreeting(greetingFor(t.getHours()))
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  const name = sessionUser?.name ?? CURRENT_USER.name
  const firstName = name.split(" ")[0].toUpperCase()

  return (
    <div className="px-6 md:px-8 pt-6 md:pt-8 pb-0 flex flex-col md:flex-row md:items-end md:justify-between gap-3 md:gap-6">
      <div>
        <h1 className="font-display text-[30px] md:text-[42px] tracking-[0.08em] text-gold-400 leading-none mb-1.5 text-balance">
          {greeting}, {firstName}
        </h1>
        <p className="text-xs text-text-muted">
          Q2 Week 4 · 7 days into sprint ·{" "}
          <strong className="text-gold-400 font-semibold">3 priorities</strong>{" "}
          require your attention
        </p>
      </div>
      <div className="flex items-center gap-2 px-3.5 py-2 bg-bg-3 border border-border-orage rounded-sm font-mono text-[11px] text-text-secondary">
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
