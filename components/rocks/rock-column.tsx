"use client"

import { useDroppable } from "@dnd-kit/core"
import { CURRENT_USER, type MockRock, type RockStatus } from "@/lib/mock-data"
import { canEditRocks } from "@/lib/permissions"
import { useRocksStore } from "@/lib/rocks-store"
import { RockCard } from "./rock-card"
import { cn } from "@/lib/utils"

const STATUS_META: Record<RockStatus, { label: string; mark: string; sub: string; accent: string; pulse?: boolean }> = {
  on_track: { label: "ON TRACK", mark: "●", sub: "PACING MATCHES PLAN", accent: "text-success" },
  in_progress: { label: "IN PROGRESS", mark: "◐", sub: "ACTIVE · PACING UNCLEAR", accent: "text-info" },
  at_risk: { label: "AT RISK", mark: "▲", sub: "RECOVERABLE · NEEDS FOCUS", accent: "text-warning", pulse: true },
  off_track: { label: "OFF TRACK", mark: "●", sub: "SIGNIFICANTLY BEHIND · ESCALATE", accent: "text-danger", pulse: true },
  done: { label: "DONE", mark: "✓", sub: "SHIPPED THIS QUARTER", accent: "text-gold-400" },
}

export function RockColumn({ status, rocks }: { status: RockStatus; rocks: MockRock[] }) {
  const meta = STATUS_META[status]
  const openNewRock = useRocksStore((s) => s.openNewRock)
  const allowed = canEditRocks(CURRENT_USER)

  const { setNodeRef, isOver } = useDroppable({
    id: `col-${status}`,
    data: { status },
    disabled: !allowed,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-lg border border-border-orage bg-bg-2 min-h-[480px]",
        "transition-all",
        isOver && "drop-zone-active",
      )}
      data-status={status}
    >
      <header className="px-3.5 py-3 border-b border-border-orage">
        <div className={cn("flex items-center gap-2 font-display text-[12px] tracking-[0.18em]", meta.accent)}>
          {meta.pulse && (
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                status === "at_risk" && "bg-warning",
                status === "off_track" && "bg-danger",
              )}
              style={{ animation: "ai-pulse 1.6s ease-in-out infinite" }}
              aria-hidden
            />
          )}
          <span>{meta.mark}</span>
          <span>{meta.label}</span>
          <span className="rounded-sm bg-bg-3 px-1.5 py-0.5 font-mono text-[9px] text-text-muted">
            {rocks.length}
          </span>
        </div>
        <div className="font-display text-[9px] tracking-[0.18em] text-text-muted mt-1">{meta.sub}</div>
      </header>

      <div className="flex flex-col gap-2.5 p-3 flex-1">
        {rocks.map((r) => (
          <RockCard key={r.id} rock={r} />
        ))}
        {allowed && (
          <button
            type="button"
            onClick={openNewRock}
            className="w-full mt-1 px-3 py-2.5 rounded-sm border border-dashed border-border-strong text-[11px] font-display tracking-[0.15em] text-text-muted hover:border-gold-500 hover:text-gold-400 hover:bg-gold-500/5 transition-colors"
          >
            + NEW ROCK
          </button>
        )}
      </div>
    </div>
  )
}
