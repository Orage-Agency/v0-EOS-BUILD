"use client"

import type { ChartEmbedBlock } from "@/lib/ai-implementer-store"
import { cn } from "@/lib/utils"

export function ChartEmbed({ block }: { block: ChartEmbedBlock }) {
  return (
    <div className="my-3 bg-bg-3/60 border border-border-orage rounded-sm p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="font-display tracking-[0.18em] text-[10px] text-text-primary">
          {block.title}
        </div>
        <div className="text-[10px] text-text-muted font-mono">{block.meta}</div>
      </div>
      <div className="flex items-end gap-1.5 h-24">
        {block.bars.map((bar, idx) => (
          <div
            key={idx}
            className="flex-1 flex flex-col items-center justify-end gap-1"
          >
            <div
              className={cn(
                "w-full rounded-t-sm transition-all",
                bar.tone === "warning"
                  ? "bg-warning"
                  : bar.tone === "danger"
                    ? "bg-danger"
                    : "bg-gold-500",
              )}
              style={{ height: `${bar.pct}%`, minHeight: 4 }}
            />
            <span className="text-[9px] text-text-dim font-mono">
              {bar.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
