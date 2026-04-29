"use client"

import { useUIStore } from "@/lib/store"
import { AIOrb } from "@/components/orage/ai-orb"

export function AILauncher() {
  const open = useUIStore((s) => s.openAiPanel)
  return (
    <button
      type="button"
      onClick={open}
      className="relative mx-3 my-3 px-3.5 py-3 rounded-md text-left overflow-hidden border border-border-strong hover:border-gold-500 transition-all hover:-translate-y-px hover:shadow-gold group"
      style={{
        background:
          "linear-gradient(135deg, rgba(182,128,57,0.18), rgba(228,175,122,0.06))",
      }}
      aria-label="Open AI Implementer panel"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-1/2 -left-1/2 w-[200%] h-[200%]"
        style={{
          background:
            "radial-gradient(circle, rgba(228,175,122,0.12) 0%, transparent 60%)",
          animation: "ai-pulse 4s ease-in-out infinite",
        }}
      />
      <span className="relative flex items-center gap-2.5">
        <AIOrb size="sm" />
        <span>
          <span className="block font-display text-[9px] tracking-[0.2em] text-gold-500">
            AI IMPLEMENTER
          </span>
          <span className="block text-xs font-semibold text-gold-400">
            3 new insights
          </span>
        </span>
      </span>
    </button>
  )
}
