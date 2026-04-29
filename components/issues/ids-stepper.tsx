"use client"

import type { IssueStage } from "@/lib/issues-store"
import { cn } from "@/lib/utils"

const STAGES: { stage: IssueStage; num: number; label: string }[] = [
  { stage: "identify", num: 1, label: "IDENTIFY" },
  { stage: "discuss", num: 2, label: "DISCUSS" },
  { stage: "solve", num: 3, label: "SOLVE" },
]

const ORDER: Record<IssueStage, number> = {
  identify: 0,
  discuss: 1,
  solve: 2,
}

export function IDSStepper({
  stage,
  onChange,
}: {
  stage: IssueStage
  onChange: (next: IssueStage) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5 mb-3.5">
      {STAGES.map((s) => {
        const active = s.stage === stage
        const done = ORDER[s.stage] < ORDER[stage]
        return (
          <button
            key={s.stage}
            type="button"
            onClick={() => onChange(s.stage)}
            className={cn(
              "px-2.5 py-2.5 rounded-sm text-center font-display text-[10px] tracking-[0.2em] transition-all border",
              active
                ? "bg-[rgba(182,128,57,0.15)] border-gold-500 text-gold-400"
                : done
                  ? "bg-bg-2 text-success border-[rgba(111,170,107,0.3)]"
                  : "bg-bg-3 border-border-orage text-text-muted hover:border-gold-500 hover:text-gold-400",
            )}
            aria-pressed={active}
          >
            <span className="block text-[18px] leading-none mb-1">
              {done ? "✓" : s.num}
            </span>
            {s.label}
          </button>
        )
      })}
    </div>
  )
}
