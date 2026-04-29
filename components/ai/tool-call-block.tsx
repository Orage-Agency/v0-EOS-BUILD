"use client"

import type { ToolCallBlock } from "@/lib/ai-implementer-store"
import { cn } from "@/lib/utils"

const STATUS_LABEL: Record<ToolCallBlock["status"], string> = {
  running: "● RUNNING",
  done: "✓ DONE",
  "auto-executed": "✓ AUTO-EXECUTED",
  error: "✕ ERROR",
}

export function ToolCall({ block }: { block: ToolCallBlock }) {
  return (
    <div className="my-3 bg-bg-3/60 border border-border-orage rounded-sm overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-orage bg-bg-2/60">
        <span className="text-gold-400 text-xs">◆</span>
        <span className="font-mono text-[11px] text-gold-400 tracking-wide flex-1">
          {block.name}
        </span>
        <span
          className={cn(
            "font-display tracking-[0.18em] text-[9px] px-1.5 py-px rounded-sm",
            block.status === "auto-executed"
              ? "bg-[rgba(111,170,107,0.18)] text-success"
              : block.status === "error"
                ? "bg-[rgba(194,84,80,0.18)] text-danger"
                : "bg-[rgba(228,175,122,0.15)] text-gold-400",
          )}
        >
          {STATUS_LABEL[block.status]}
        </span>
      </div>
      <dl className="px-3 py-2.5 space-y-1 font-mono text-[11px] leading-relaxed">
        {Object.entries(block.args).map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <dt className="text-text-muted shrink-0">{k}:</dt>
            <dd className="text-gold-300 break-all">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
