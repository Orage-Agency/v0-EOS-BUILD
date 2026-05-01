"use client"

import { canEditRocks } from "@/lib/permissions"
import { useRocksStore } from "@/lib/rocks-store"
import { IcPlus } from "@/components/orage/icons"
import { cn } from "@/lib/utils"

function quarterContext(now: Date): {
  quarter: number
  year: number
  weekOfQuarter: number
  weeksRemain: number
} {
  const month = now.getMonth()
  const quarter = Math.floor(month / 3) + 1
  const qStart = new Date(now.getFullYear(), (quarter - 1) * 3, 1)
  const qEnd = new Date(now.getFullYear(), quarter * 3, 0) // last day of quarter
  const weekOfQuarter = Math.min(13, Math.max(1, Math.ceil((now.getTime() - qStart.getTime()) / 86400000 / 7)))
  const weeksRemain = Math.max(0, Math.ceil((qEnd.getTime() - now.getTime()) / 86400000 / 7))
  return { quarter, year: now.getFullYear(), weekOfQuarter, weeksRemain }
}

export function RocksHeader() {
  const rocks = useRocksStore((s) => s.rocks)
  const openNewRock = useRocksStore((s) => s.openNewRock)
  const currentActor = useRocksStore((s) => s.currentActor)
  const allowed = currentActor ? canEditRocks(currentActor) : false

  const total = rocks.length
  const onTrack = rocks.filter((r) => r.status === "on_track").length
  const inProgress = rocks.filter((r) => r.status === "in_progress").length
  const atRisk = rocks.filter((r) => r.status === "at_risk").length
  const offTrack = rocks.filter((r) => r.status === "off_track").length
  const done = rocks.filter((r) => r.status === "done").length
  const completed = done + onTrack
  const velocity = total ? Math.round((completed / total) * 100) : 0
  const ctx = quarterContext(new Date())

  return (
    <div className="px-8 pt-6 flex items-start justify-between gap-5">
      <div>
        <span
          className="font-display text-[10px] tracking-[0.2em] text-gold-500 mb-2 inline-flex items-center gap-1.5"
          suppressHydrationWarning
        >
          <span className="w-1.5 h-1.5 bg-gold-500 rounded-full" /> Q{ctx.quarter} {ctx.year} · WEEK {ctx.weekOfQuarter} OF 13 · {ctx.weeksRemain} {ctx.weeksRemain === 1 ? "WEEK" : "WEEKS"} REMAIN
        </span>
        <h1 className="font-display text-[36px] tracking-[0.08em] text-gold-400 leading-none mb-1 text-balance">
          QUARTERLY ROCKS
        </h1>
        <p className="text-xs text-text-muted">
          {total === 0 ? (
            <>No rocks committed for this quarter yet — pick the 3-7 things you&apos;ll ship in the next 90 days.</>
          ) : (
            <>
              <span className="text-text-primary">{total}</span> rock{total === 1 ? "" : "s"}
              {" "}· <span className="text-gold-400 font-semibold">{velocity}%</span> velocity
              {atRisk + offTrack > 0 && (
                <>
                  {" "}· <span className="text-warning font-semibold">{atRisk + offTrack} need{atRisk + offTrack === 1 ? "s" : ""} attention</span>
                </>
              )}
              {" "}· drag a card between columns to update status
            </>
          )}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="px-3.5 py-1.5 bg-bg-3 text-text-secondary border border-border-orage rounded-sm text-xs hover:bg-bg-4 hover:border-gold-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
        >
          Past Quarters
        </button>
        <button
          type="button"
          onClick={openNewRock}
          disabled={!allowed}
          className={cn(
            "px-4 py-2 rounded-sm text-xs font-semibold flex items-center gap-1.5 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-1",
            allowed
              ? "bg-gradient-to-br from-gold-500 to-gold-400 text-text-on-gold hover:-translate-y-px shadow-[0_2px_8px_rgba(182,128,57,0.3)]"
              : "bg-bg-3 text-text-muted cursor-not-allowed border border-border-orage opacity-60",
          )}
          title={allowed ? "Create new rock" : "Founders/Admins/Leaders only"}
        >
          <IcPlus className="w-3 h-3" />
          New Rock
        </button>
      </div>
    </div>
  )
}
