"use client"

import { useUIStore } from "@/lib/store"
import { useAIImplementerStore } from "@/lib/ai-implementer-store"
import { AIOrb } from "@/components/orage/ai-orb"

export function AILauncher() {
  const open = useUIStore((s) => s.openAiPanel)
  // Pull the real briefing/insight count instead of the hardcoded "3".
  // Falls back to "Ready" if there's nothing pending so the launcher
  // doesn't lie about activity.
  const briefings = useAIImplementerStore((s) => s.briefings ?? [])
  const insightCount = briefings.length
  const subline =
    insightCount > 0
      ? `${insightCount} ${insightCount === 1 ? "insight" : "insights"} ready`
      : "Ask me anything"

  return (
    <button
      type="button"
      onClick={open}
      className="relative mx-3 my-3 px-3.5 py-3 rounded-md text-left overflow-hidden border border-border-strong hover:border-gold-500 transition-all hover:-translate-y-px hover:shadow-gold group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
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
            {subline}
          </span>
        </span>
      </span>
    </button>
  )
}
