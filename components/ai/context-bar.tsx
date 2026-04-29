"use client"

import { useAIImplementerStore } from "@/lib/ai-implementer-store"
import { IcClose, IcPlus } from "@/components/orage/icons"
import { toast } from "sonner"

const KIND_GLYPH = {
  rock: "●",
  person: "◐",
  date: "◇",
  issue: "△",
  task: "□",
  metric: "◈",
} as const

export function ContextBar({ threadId }: { threadId: string }) {
  const thread = useAIImplementerStore((s) =>
    s.threads.find((t) => t.id === threadId),
  )
  const remove = useAIImplementerStore((s) => s.removeContextChip)

  const chips = thread?.contextChips ?? []
  if (!thread) return null

  return (
    <div className="border-b border-border-orage bg-bg-2/60 px-5 py-2.5 flex items-center gap-2 flex-wrap">
      <span className="font-display tracking-[0.22em] text-[10px] text-text-dim shrink-0">
        CONTEXT:
      </span>
      {chips.length === 0 && (
        <span className="text-[11px] text-text-dim italic">
          No pinned entities
        </span>
      )}
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex items-center gap-1.5 bg-bg-3 border border-border-orage rounded-pill px-2.5 py-1 text-[11px] text-text-secondary"
        >
          <span className="text-gold-400 text-[10px]">
            {KIND_GLYPH[chip.kind]}
          </span>
          {chip.label}
          <button
            onClick={() => remove(threadId, chip.id)}
            className="text-text-dim hover:text-text-primary"
            aria-label={`Remove ${chip.label}`}
          >
            <IcClose className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
      <button
        onClick={() => toast("PIN ENTITY")}
        className="ml-auto inline-flex items-center gap-1 font-display tracking-[0.18em] text-[10px] text-gold-400 hover:text-gold-300 px-2 py-1 rounded-sm border border-dashed border-gold-500/40 hover:bg-gold-500/10 transition"
      >
        <IcPlus className="w-2.5 h-2.5" />
        PIN ENTITY
      </button>
    </div>
  )
}
