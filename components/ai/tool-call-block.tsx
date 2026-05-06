"use client"

import { useState } from "react"
import type { ToolCallBlock } from "@/lib/ai-implementer-store"
import { cn } from "@/lib/utils"

const STATUS_LABEL: Record<ToolCallBlock["status"], string> = {
  running: "● RUNNING",
  done: "✓ DONE",
  "auto-executed": "✓ DONE",
  error: "✕ ERROR",
}

export function ToolCall({ block }: { block: ToolCallBlock }) {
  const isRunning = block.status === "running"
  const [expanded, setExpanded] = useState(block.status === "error")
  const hasArgs = Object.keys(block.args).length > 0

  return (
    <div className="my-3 bg-bg-3/60 border border-border-orage rounded-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center gap-2 px-3 py-2 border-b border-border-orage bg-bg-2/60 hover:bg-bg-2 transition-colors text-left"
      >
        <span
          className={cn(
            "text-gold-400 text-xs",
            isRunning && "animate-pulse",
          )}
          aria-hidden
        >
          ◆
        </span>
        <span className="font-mono text-[11px] text-gold-400 tracking-wide flex-1">
          {block.name}
        </span>
        <span
          className={cn(
            "font-display tracking-[0.18em] text-[9px] px-1.5 py-px rounded-sm",
            block.status === "auto-executed" || block.status === "done"
              ? "bg-[rgba(111,170,107,0.18)] text-success"
              : block.status === "error"
                ? "bg-[rgba(194,84,80,0.18)] text-danger"
                : "bg-[rgba(228,175,122,0.15)] text-gold-400 animate-pulse",
          )}
        >
          {STATUS_LABEL[block.status]}
        </span>
        <span
          aria-hidden
          className="text-text-dim text-[10px] font-mono ml-1 select-none"
        >
          {expanded ? "▾" : "▸"}
        </span>
      </button>

      {/* Compact summary line — always visible. */}
      {!expanded && block.summary && (
        <div className="px-3 py-1.5 font-mono text-[10px] text-text-muted truncate">
          {block.summary}
        </div>
      )}

      {expanded && (
        <>
          {hasArgs ? (
            <dl className="px-3 py-2.5 space-y-1 font-mono text-[11px] leading-relaxed">
              {Object.entries(block.args).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <dt className="text-text-muted shrink-0">{k}:</dt>
                  <dd className="text-gold-300 break-all">{v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="px-3 py-2.5 font-mono text-[11px] text-text-muted">
              No arguments.
            </div>
          )}
          {block.summary && (
            <div className="px-3 py-2 border-t border-border-orage bg-bg-2/40 font-mono text-[10px] text-text-muted whitespace-pre-wrap break-words">
              <div className="font-display tracking-[0.18em] text-text-dim mb-1">
                {block.status === "error" ? "ERROR" : "RESULT"}
              </div>
              {block.summary}
            </div>
          )}
        </>
      )}
    </div>
  )
}
