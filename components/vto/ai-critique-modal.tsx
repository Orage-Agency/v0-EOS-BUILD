"use client"

/**
 * V/TO Ask-AI critique modal.
 *
 * Shows the current text alongside a streaming AI suggestion. The user
 * can accept (replaces text + records a revision), regenerate, refine
 * with a custom prompt, or discard. The streaming itself is mocked in
 * the store so we don't gate on a live API key for the design pass.
 */

import { useEffect } from "react"
import { useVTOStore, sectionLabel, type VTOSection } from "@/lib/vto-store"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type ApplyHandler = (section: VTOSection, value: string) => void

export function AICritiqueModal({ onApply }: { onApply: ApplyHandler }) {
  const ai = useVTOStore((s) => s.ai)
  const close = useVTOStore((s) => s.closeAI)
  const setPrompt = useVTOStore((s) => s.setAIPrompt)
  const regenerate = useVTOStore((s) => s.regenerateAI)
  const accept = useVTOStore((s) => s.acceptAI)
  const saveRevision = useVTOStore((s) => s.saveRevision)

  // Close on Escape
  useEffect(() => {
    if (!ai.open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [ai.open, close])

  if (!ai.open || !ai.section) return null

  function onAccept() {
    if (!ai.section) return
    const value = accept()
    onApply(ai.section, value)
    saveRevision(`AI assist · ${sectionLabel(ai.section)}`, "GEORGE")
    toast("REPLACED · SAVED")
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI critique"
      className="fixed inset-0 z-[300] flex items-center justify-center p-10 bg-black/60 backdrop-blur-md animate-in fade-in"
      onClick={close}
    >
      <div
        className="glass-strong border border-gold-500 rounded-md shadow-gold-strong w-full max-w-[640px] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-2.5 px-6 py-4 border-b border-border-orage">
          <span className="ai-orb" aria-hidden />
          <h2 className="font-display text-lg tracking-[0.1em] text-gold-400">
            ASK AI · {sectionLabel(ai.section)}
          </h2>
          <span className="ml-auto font-mono text-[11px] text-text-muted">
            claude opus · streaming
          </span>
        </header>

        <div className="px-6 py-5 flex flex-col gap-3.5 overflow-y-auto flex-1">
          <div className="bg-bg-3 border border-border-orage rounded-sm p-3.5">
            <div className="font-display text-[9px] tracking-[0.2em] text-text-muted mb-2">
              CURRENT
            </div>
            <p className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-wrap">
              {ai.current || "(empty)"}
            </p>
          </div>

          <div className="rounded-sm p-3.5 border border-gold-500 relative bg-gradient-to-br from-gold-500/10 to-gold-300/[0.04]">
            <div className="font-display text-[9px] tracking-[0.2em] text-gold-400 mb-2 flex items-center gap-1.5">
              <span className="ai-orb" aria-hidden />
              SUGGESTION
            </div>
            <p
              className={cn(
                "font-display text-lg tracking-[0.04em] text-text-primary leading-snug whitespace-pre-wrap min-h-[80px]",
                ai.streaming && "after:content-['▋'] after:ml-1 after:text-gold-500 after:animate-pulse",
              )}
            >
              {ai.suggestion ||
                (ai.streaming ? "" : "Click regenerate to draft a new option.")}
            </p>
          </div>

          <div>
            <div className="font-display text-[9px] tracking-[0.2em] text-text-muted mb-2">
              REFINE WITH PROMPT
            </div>
            <textarea
              value={ai.prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
              placeholder="(optional) Ask to make it tighter, sharper, or more specific…"
              className="w-full bg-bg-3 border border-border-orage rounded-sm px-3 py-2.5 text-[13px] text-text-primary leading-snug focus:border-gold-500 focus:outline-none resize-y"
            />
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border-orage">
          <button
            type="button"
            onClick={() => {
              regenerate()
              toast("REGENERATING")
            }}
            disabled={ai.streaming}
            className="px-3 py-1.5 border border-border-strong rounded-sm font-display text-[10px] tracking-[0.15em] text-text-secondary hover:border-gold-500 hover:text-gold-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            REGENERATE
          </button>
          <button
            type="button"
            onClick={() => {
              close()
              toast("DISCARDED")
            }}
            className="px-3 py-1.5 border border-border-strong rounded-sm font-display text-[10px] tracking-[0.15em] text-text-secondary hover:border-danger hover:text-danger transition-colors"
          >
            DISCARD
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={ai.streaming || !ai.suggestion}
            className="px-4 py-2 rounded-sm font-display text-[10px] tracking-[0.15em] text-text-on-gold disabled:opacity-50 disabled:cursor-not-allowed transition-shadow hover:shadow-gold"
            style={{
              background:
                "linear-gradient(135deg, var(--gold-500), var(--gold-400))",
            }}
          >
            REPLACE
          </button>
        </footer>
      </div>
    </div>
  )
}
