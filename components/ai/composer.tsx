"use client"

import { useAIImplementerStore } from "@/lib/ai-implementer-store"
import { AIOrb } from "@/components/orage/ai-orb"
import { useWorkspaceSlug } from "@/hooks/use-workspace-slug"
import { cn } from "@/lib/utils"

const QUICK_ACTIONS: { label: string; prompt: string }[] = [
  { label: "Show overdue", prompt: "Show me every task that's past its due date and list each owner." },
  { label: "Rocks at risk", prompt: "Which rocks are at risk or off-track right now? Group by owner." },
  { label: "This week's L10 prep", prompt: "Summarize what should be on the agenda for this week's L10 — top issues to discuss, todos still open from last week, and headlines." },
  { label: "Create a rock", prompt: "Help me create a new quarterly rock. Ask me one question at a time." },
  { label: "Who owns what", prompt: "List every active rock with its owner and current progress." },
  { label: "Stale notes", prompt: "Show notes that haven't been touched in 30+ days but are still pinned to active rocks." },
]

export function Composer() {
  const draft = useAIImplementerStore((s) => s.composerDraft)
  const setDraft = useAIImplementerStore((s) => s.setComposerDraft)
  const sendMessage = useAIImplementerStore((s) => s.sendMessage)
  const deepMode = useAIImplementerStore((s) => s.deepMode)
  const toggleDeep = useAIImplementerStore((s) => s.toggleDeepMode)
  const streaming = useAIImplementerStore((s) => s.streaming)
  const cancelStream = useAIImplementerStore((s) => s.cancelStream)
  const quotaRemainingHour = useAIImplementerStore((s) => s.quotaRemainingHour)
  const quotaRemainingDay = useAIImplementerStore((s) => s.quotaRemainingDay)
  const workspaceSlug = useWorkspaceSlug()

  const handleSend = () => {
    if (streaming) return
    const text = draft.trim()
    if (!text) return
    sendMessage(text, workspaceSlug)
  }

  return (
    <footer className="border-t border-border-orage bg-bg-2/60 p-4">
      {!streaming && draft.trim().length === 0 && (
        <div
          className="flex flex-wrap gap-1.5 mb-2.5"
          aria-label="Quick actions"
        >
          {QUICK_ACTIONS.map((qa) => (
            <button
              key={qa.label}
              type="button"
              onClick={() => setDraft(qa.prompt)}
              className="font-display tracking-[0.14em] text-[10px] px-2.5 py-1 rounded-sm border border-border-orage text-text-secondary hover:border-gold-500/40 hover:text-gold-400 transition-colors"
            >
              {qa.label.toUpperCase()}
            </button>
          ))}
        </div>
      )}
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
          // Stay editable while the AI is responding — the user should be
          // able to draft the next prompt without waiting for the stream
          // to finish. Only Send is gated by `streaming`.
          placeholder={
            streaming
              ? "Drafting next message… (Stop the response to send)"
              : "Ask the implementer anything · @ to mention · / for commands · pin context above…"
          }
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
          {quotaRemainingHour !== null && quotaRemainingHour <= 10 && (
            <span
              className={cn(
                "font-mono text-[10px] px-1.5 py-0.5 rounded-sm",
                quotaRemainingHour <= 3
                  ? "text-danger bg-danger/10"
                  : "text-warning bg-warning/10",
              )}
              title={`${quotaRemainingHour} AI requests remaining this hour`}
            >
              {quotaRemainingHour}/hr
            </span>
          )}
          {quotaRemainingDay !== null && quotaRemainingDay <= 50 && (
            <span
              className={cn(
                "font-mono text-[10px] px-1.5 py-0.5 rounded-sm",
                quotaRemainingDay <= 10
                  ? "text-danger bg-danger/10"
                  : "text-warning bg-warning/10",
              )}
              title={`${quotaRemainingDay} AI requests remaining today`}
            >
              {quotaRemainingDay}/day
            </span>
          )}
          {streaming ? (
            <button
              onClick={cancelStream}
              className="font-display tracking-[0.2em] text-[10px] px-3.5 py-1.5 rounded-sm border border-danger/60 text-danger hover:bg-danger/10 transition inline-flex items-center gap-1.5"
              aria-label="Stop generating"
            >
              ■ STOP
            </button>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </footer>
  )
}

