"use client"

import type { RockEmbedBlock } from "@/lib/ai-implementer-store"
import { OrageAvatar } from "@/components/orage/avatar"

export function RockEmbed({ block }: { block: RockEmbedBlock }) {
  return (
    <div className="my-3 bg-bg-3/60 border border-border-orage rounded-sm p-3">
      <div className="font-display tracking-[0.22em] text-[9px] text-gold-400 mb-1.5">
        ● {block.subtitle}
      </div>
      <div className="text-text-primary text-sm font-medium mb-2">
        {block.title}
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span
          className={
            block.status === "at_risk"
              ? "text-warning font-semibold"
              : block.status === "off_track"
                ? "text-danger font-semibold"
                : "text-success font-semibold"
          }
        >
          {block.pctLabel}
        </span>
        <div className="flex-1 h-1.5 bg-bg-1 rounded-pill overflow-hidden">
          <div
            className="h-full"
            style={{
              width: `${block.pct}%`,
              background:
                block.status === "at_risk"
                  ? "var(--warning)"
                  : block.status === "off_track"
                    ? "var(--danger)"
                    : "var(--success)",
            }}
          />
        </div>
        <span className="text-text-muted shrink-0">{block.milestoneText}</span>
        <OrageAvatar
          size="xs"
          user={{
            initials: block.ownerInitials,
            color: block.ownerColor,
            name: block.ownerInitials,
          }}
        />
      </div>
    </div>
  )
}
