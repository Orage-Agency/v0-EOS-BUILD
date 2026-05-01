"use client"

import { useRocksStore } from "@/lib/rocks-store"
import { cn } from "@/lib/utils"

export function SummaryBar() {
  const rocks = useRocksStore((s) => s.rocks)
  const total = rocks.length || 1

  const onTrack = rocks.filter((r) => r.status === "on_track").length
  const inProgress = rocks.filter((r) => r.status === "in_progress").length
  const atRisk = rocks.filter((r) => r.status === "at_risk").length
  const offTrack = rocks.filter((r) => r.status === "off_track").length
  const done = rocks.filter((r) => r.status === "done").length
  const velocity = Math.round(((onTrack + done) / total) * 100)

  const cards: { label: string; value: number | string; meta: string; tone: string; barClass?: string }[] = [
    { label: "ON TRACK", value: onTrack, meta: `${pct(onTrack, total)}% of total`, tone: "border-l-success", barClass: "bg-success" },
    { label: "IN PROGRESS", value: inProgress, meta: `${pct(inProgress, total)}% of total`, tone: "border-l-info", barClass: "bg-info" },
    { label: "AT RISK", value: atRisk, meta: atRisk > 0 ? `${pct(atRisk, total)}% · attention needed` : "all clear", tone: "border-l-warning", barClass: "bg-warning" },
    { label: "OFF TRACK", value: offTrack, meta: offTrack > 0 ? `${pct(offTrack, total)}% · escalation` : "none — keep it that way", tone: "border-l-danger", barClass: "bg-danger" },
    { label: "VELOCITY", value: `${velocity}%`, meta: rocks.length === 0 ? "no rocks committed" : `${onTrack + done} of ${rocks.length} pacing well`, tone: "border-l-gold-500" },
  ]

  return (
    <div className="px-8 mt-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
      {cards.map((c) => (
        <div
          key={c.label}
          className={cn(
            "p-3.5 bg-bg-2 border border-border-orage border-l-2 rounded-sm transition-colors hover:border-gold-500/40",
            c.tone,
          )}
        >
          <div className="font-display text-[10px] tracking-[0.18em] text-text-muted mb-1.5">
            {c.label}
          </div>
          <div className="font-mono text-[26px] font-semibold text-gold-400 leading-none mb-1">
            {c.value}
          </div>
          <div className="text-[10px] text-text-muted">{c.meta}</div>
        </div>
      ))}
    </div>
  )
}

function pct(n: number, total: number) {
  return Math.round((n / total) * 100)
}
