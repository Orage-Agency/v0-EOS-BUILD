"use client"

import { canEditRocks } from "@/lib/permissions"
import { useRocksStore } from "@/lib/rocks-store"
import { IcPlus } from "@/components/orage/icons"
import { cn } from "@/lib/utils"

export function RocksHeader() {
  const rocks = useRocksStore((s) => s.rocks)
  const openNewRock = useRocksStore((s) => s.openNewRock)
  const currentActor = useRocksStore((s) => s.currentActor)
  const allowed = currentActor ? canEditRocks(currentActor) : false

  const total = rocks.length
  const onTrack = rocks.filter((r) => r.status === "on_track").length
  const inProgress = rocks.filter((r) => r.status === "in_progress").length
  const done = rocks.filter((r) => r.status === "done").length
  const completed = done + onTrack
  const velocity = total ? Math.round((completed / total) * 100) : 0

  return (
    <div className="px-8 pt-6 flex items-start justify-between gap-5">
      <div>
        <span className="font-display text-[10px] tracking-[0.2em] text-gold-500 mb-2 inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-gold-500 rounded-full" /> Q2 2026 · WEEK 4 OF 13 · 9 WEEKS REMAIN
        </span>
        <h1 className="font-display text-[36px] tracking-[0.08em] text-gold-400 leading-none mb-1 text-balance">
          QUARTERLY ROCKS
        </h1>
        <p className="text-xs text-text-muted">
          {total} rocks · {velocity}% velocity · {inProgress} in progress · drag between columns to update status
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="px-3.5 py-1.5 bg-bg-3 text-text-secondary border border-border-orage rounded-sm text-xs hover:bg-bg-4 hover:border-gold-500 transition-colors"
        >
          Past Quarters
        </button>
        <button
          type="button"
          onClick={openNewRock}
          disabled={!allowed}
          className={cn(
            "px-4 py-2 rounded-sm text-xs font-semibold flex items-center gap-1.5 transition-transform",
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
