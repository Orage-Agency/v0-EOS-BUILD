"use client"

import { useEffect, useState } from "react"
import { CURRENT_USER } from "@/lib/mock-data"
import { formatDateChip, shortTime } from "@/lib/format"

export function DashboardHeader() {
  const [time, setTime] = useState<string>("—")

  useEffect(() => {
    setTime(shortTime(new Date()))
    const id = setInterval(() => setTime(shortTime(new Date())), 60_000)
    return () => clearInterval(id)
  }, [])

  const today = new Date()
  const chip = formatDateChip(today)
  const firstName = CURRENT_USER.name.split(" ")[0].toUpperCase()
  const greeting = greetingFor(today.getHours())

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
