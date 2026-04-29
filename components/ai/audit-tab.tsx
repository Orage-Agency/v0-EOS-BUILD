"use client"

import { useAIImplementerStore } from "@/lib/ai-implementer-store"
import { cn } from "@/lib/utils"

const STATUS_CLASS = {
  auto: "bg-[rgba(228,175,122,0.15)] text-gold-400",
  approved: "bg-[rgba(111,170,107,0.18)] text-success",
  pending: "bg-[rgba(212,162,74,0.18)] text-warning",
  rejected: "bg-[rgba(194,84,80,0.18)] text-danger",
}

export function AuditTab() {
  const audit = useAIImplementerStore((s) => s.audit)
  return (
    <div>
      <div className="font-display tracking-[0.22em] text-[10px] text-text-dim mb-2 px-1">
        RECENT AUDIT · 24H
      </div>
      <ul className="divide-y divide-border-orage">
        {audit.map((row) => (
          <li
            key={row.id}
            className="py-2.5 flex items-start gap-2 text-[11px]"
          >
            <span className="font-mono text-[9px] text-text-dim shrink-0 min-w-[44px] pt-0.5">
              {row.time}
            </span>
            <span className="flex-1 text-text-secondary leading-snug">
              <span className="font-display tracking-[0.18em] text-[10px] text-gold-400 mr-1">
                {row.action}
              </span>
              · {row.text}
            </span>
            <span
              className={cn(
                "font-display tracking-[0.18em] text-[8px] px-1.5 py-0.5 rounded-sm shrink-0",
                STATUS_CLASS[row.status],
              )}
            >
              {row.status.toUpperCase()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
