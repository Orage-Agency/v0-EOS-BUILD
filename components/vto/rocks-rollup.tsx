"use client"

import { TenantLink as Link } from "@/components/tenant-link"
import { useRocksStore } from "@/lib/rocks-store"
import { rockProgress } from "@/lib/rocks-store"
import { getUser, type RockStatus } from "@/lib/mock-data"
import { OrageAvatar } from "@/components/orage/avatar"
import { cn } from "@/lib/utils"

const STATUS_BORDER: Record<RockStatus, string> = {
  on_track: "border-l-success",
  in_progress: "border-l-gold-500",
  at_risk: "border-l-warning",
  off_track: "border-l-danger",
  done: "border-l-success",
}

const STATUS_LABEL: Record<RockStatus, string> = {
  on_track: "ON TRACK",
  in_progress: "IN PROGRESS",
  at_risk: "AT RISK",
  off_track: "OFF TRACK",
  done: "DONE",
}

export function RocksRollup() {
  const rocks = useRocksStore((s) => s.rocks)
  const milestones = useRocksStore((s) => s.milestones)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
      {rocks.map((r) => {
        const owner = getUser(r.owner)
        const pct = rockProgress(r.id, milestones, r.progress)
        return (
          <Link
            href={`/rocks?rock=${r.id}`}
            key={r.id}
            className={cn(
              "block p-3.5 bg-bg-2 border border-border-orage rounded-sm border-l-2 hover:border-gold-500 transition-colors cursor-pointer",
              STATUS_BORDER[r.status],
            )}
          >
            <div className="flex items-center gap-1.5 mb-1.5 font-display text-[9px] tracking-[0.15em] text-text-muted">
              {owner ? (
                <OrageAvatar user={owner} size="xs" />
              ) : null}
              <span>{owner?.name.toUpperCase() ?? "—"}</span>
              <span aria-hidden>·</span>
              <span>{STATUS_LABEL[r.status]}</span>
            </div>
            <p className="text-[12px] text-text-primary font-medium leading-snug mb-2 line-clamp-2">
              {r.title}
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-text-muted font-mono">
              <span>{pct}%</span>
              <div className="flex-1 max-w-[200px] h-[3px] bg-bg-base rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-gold-500 to-gold-300 rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="font-display tracking-[0.1em]">{r.tag}</span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
