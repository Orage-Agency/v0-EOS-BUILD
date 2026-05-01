"use client"

import { useAIImplementerStore } from "@/lib/ai-implementer-store"
import { AIOrb } from "@/components/orage/ai-orb"
import { useWorkspaceSlug } from "@/hooks/use-workspace-slug"
import { cn } from "@/lib/utils"

export function Composer() {
  const draft = useAIImplementerStore((s) => s.composerDraft)
  const setDraft = useAIImplementerStore((s) => s.setComposerDraft)
  const sendMessage = useAIImplementerStore((s) => s.sendMessage)
  const deepMode = useAIImplementerStore((s) => s.deepMode)
  const toggleDeep = useAIImplementerStore((s) => s.toggleDeepMode)
  const workspaceSlug = useWorkspaceSlug()

  const handleSend = () => {
    const text = draft.trim()
    if (!text) return
    sendMessage(text, workspaceSlug)
  }

  return (
    <footer className="border-t border-border-orage bg-bg-2/60 p-4">
      <div className="rounded-md border border-border-orage bg-bg-3/60 focus-within:border-gold-500/60 transition">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault()
              handleSend()
            }
          }}
          rows={2}
          placeholder="Ask the implementer anything · @ to mention · / for commands · pin context above…"
          className="w-full bg-transparent px-3.5 py-3 text-[13px] text-text-primary placeholder:text-text-dim focus:outline-none resize-none leading-snug"
        />
        <div className="flex items-center gap-2 px-3 py-2 border-t border-border-orage/70">
          <button
            onClick={toggleDeep}
            className={cn(
              "font-display tracking-[0.18em] text-[10px] px-2 py-1 rounded-sm transition inline-flex items-center gap-1.5",
              deepMode
                ? "bg-gold-500/15 text-gold-400 border border-gold-500/40"
                : "border border-border-orage text-text-muted hover:text-text-primary",
            )}
          >
            <AIOrb size="xs" />
            DEEP MODE
          </button>
          <div className="flex-1" />
          <span className="font-mono text-[10px] text-text-dim">
            ⌘↩ to send
          </span>
          <button
            onClick={handleSend}
            disabled={!draft.trim()}
            className="font-display tracking-[0.2em] text-[10px] px-3.5 py-1.5 rounded-sm bg-gold-500 hover:bg-gold-400 disabled:opacity-40 disabled:cursor-not-allowed text-text-on-gold transition"
          >
            SEND →
          </button>
        </div>
      </div>
    </footer>
  )
}

