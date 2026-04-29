"use client"

import { useAIImplementerStore } from "@/lib/ai-implementer-store"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function BriefingsTab() {
  const briefings = useAIImplementerStore((s) => s.briefings)
  const toggle = useAIImplementerStore((s) => s.toggleBriefing)

  return (
    <div>
      <div className="font-display tracking-[0.22em] text-[10px] text-text-dim mb-2 px-1">
        SCHEDULED BRIEFINGS · {briefings.length}
      </div>
      <ul className="space-y-2">
        {briefings.map((b) => (
          <li
            key={b.id}
            className="px-3 py-3 rounded-sm border border-border-orage bg-bg-3/40 hover:border-gold-500/50 transition"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[12px] text-text-primary font-medium flex-1 truncate">
                {b.name}
              </span>
              <span className="font-mono text-[10px] text-text-dim shrink-0">
                {b.cron}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[10px]">
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    b.paused
                      ? "bg-text-muted"
                      : "bg-success shadow-[0_0_5px_var(--success)]",
                  )}
                />
                <span className="font-display tracking-[0.18em] text-text-muted">
                  {b.nextLabel}
                </span>
              </div>
              <button
                onClick={() => {
                  toggle(b.id)
                  toast(b.paused ? "BRIEFING RESUMED" : "BRIEFING PAUSED")
                }}
                className="font-display tracking-[0.18em] text-[10px] px-2 py-0.5 rounded-sm border border-border-orage text-text-muted hover:text-gold-400 hover:border-gold-500/50 transition"
              >
                {b.paused ? "RESUME" : "PAUSE"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
