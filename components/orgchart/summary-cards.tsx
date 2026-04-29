"use client"

import { useOrgChartStore, gwcGapCount, rightPersonRightSeatCount } from "@/lib/orgchart-store"
import { cn } from "@/lib/utils"

const CARDS = [
  { id: "total", accent: "gold" as const, label: "TOTAL SEATS", meta: "Designed structure" },
  { id: "filled", accent: "gold" as const, label: "FILLED", meta: "" },
  { id: "empty", accent: "info" as const, label: "EMPTY · HIRE NEED", meta: "Hires queued" },
  {
    id: "rprs",
    accent: "success" as const,
    label: "RIGHT PERSON RIGHT SEAT",
    meta: "All 3 GWC = yes",
  },
  { id: "gap", accent: "warning" as const, label: "GWC GAPS", meta: "Need attention" },
]

const ACCENT_CLS: Record<"gold" | "info" | "success" | "warning", string> = {
  gold: "before:bg-gold-500",
  info: "before:bg-info",
  success: "before:bg-success",
  warning: "before:bg-warning",
}

export function SummaryCards() {
  const seats = useOrgChartStore((s) => s.seats)
  const total = seats.length
  const filled = seats.filter((s) => !s.vacant).length
  const empty = seats.filter((s) => s.vacant).length
  const { rightSeat } = rightPersonRightSeatCount(seats)
  const gaps = gwcGapCount(seats)

  const values: Record<string, { value: string; meta?: string }> = {
    total: { value: String(total) },
    filled: {
      value: String(filled),
      meta: total === 0 ? "" : `${Math.round((filled / total) * 100)}% staffing`,
    },
    empty: { value: String(empty), meta: "Open hires" },
    rprs: { value: `${rightSeat} / ${filled}` },
    gap: { value: String(gaps) },
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 px-8 py-5 border-b border-border-orage">
      {CARDS.map((c) => (
        <div
          key={c.id}
          className={cn(
            "relative bg-bg-3 border border-border-orage rounded-sm py-3 px-4 cursor-pointer transition-colors hover:border-gold-500",
            "before:content-[''] before:absolute before:top-0 before:left-0 before:w-[3px] before:h-full before:opacity-70",
            ACCENT_CLS[c.accent],
          )}
        >
          <div className="font-display text-[9px] tracking-[0.22em] text-text-muted uppercase mb-1.5">
            {c.label}
          </div>
          <div className="font-display text-[32px] text-gold-400 leading-none">
            {values[c.id].value}
          </div>
          <div className="text-[10px] text-text-muted mt-1">
            {values[c.id].meta ?? c.meta}
          </div>
        </div>
      ))}
    </div>
  )
}
