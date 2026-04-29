"use client"

import { useEffect, useMemo, useRef } from "react"
import { useAIImplementerStore } from "@/lib/ai-implementer-store"
import { AIOrb } from "@/components/orage/ai-orb"
import { IcMore, IcPin, IcShare, IcSpark } from "@/components/orage/icons"
import { ContextBar } from "./context-bar"
import { Composer } from "./composer"
import { MessageBubble } from "./message-bubble"
import { useWorkspaceSlug } from "@/hooks/use-workspace-slug"
import { toast } from "sonner"

const SUGGESTIONS = [
  "What's at risk?",
  "Today's priorities",
  "Create a task",
  "Generate pulse",
]

export function ConversationPane({
  onTogglePanel,
}: {
  onTogglePanel?: () => void
}) {
  // Pull stable, top-level slices out of the store. NEVER call .filter/.map/.slice
  // inside the selector — those return a fresh array on every render and turn
  // useSyncExternalStore into an infinite loop.
  const activeId = useAIImplementerStore((s) => s.activeThreadId)
  const allThreads = useAIImplementerStore((s) => s.threads)
  const allMessages = useAIImplementerStore((s) => s.messages)
  const setDraft = useAIImplementerStore((s) => s.setComposerDraft)
  const sendMessage = useAIImplementerStore((s) => s.sendMessage)
  const workspaceSlug = useWorkspaceSlug()

  const thread = useMemo(
    () => allThreads.find((t) => t.id === activeId),
    [allThreads, activeId],
  )
  const messages = useMemo(
    () => allMessages.filter((m) => m.threadId === activeId),
    [allMessages, activeId],
  )

  const scrollerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = scrollerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const meta = useMemo(() => {
    if (!thread) return ""
    return `claude opus · streaming · ${messages.length} message${messages.length === 1 ? "" : "s"}`
  }, [thread, messages.length])

  const isEmpty = messages.length === 0

  function pickSuggestion(s: string) {
    setDraft(s)
    sendMessage(s, workspaceSlug)
    toast("STREAMING RESPONSE…")
  }

  return (
    <section className="grid grid-rows-[auto_auto_1fr_auto] min-w-0 overflow-hidden">
      <header className="px-5 py-3.5 border-b border-border-orage flex items-center gap-3 bg-bg-1">
        <AIOrb size="md" />
        <div className="flex-1 min-w-0">
          <h1 className="font-display tracking-[0.18em] text-text-primary text-base truncate">
            {thread?.title ?? "NEW THREAD"}
          </h1>
          <p className="text-[11px] text-text-muted mt-0.5 truncate">{meta}</p>
        </div>
        <button
          onClick={() => toast("SHARE THREAD")}
          className="w-8 h-8 inline-flex items-center justify-center rounded-sm border border-border-orage text-text-muted hover:text-text-primary hover:bg-bg-3 transition"
          aria-label="Share"
        >
          <IcShare className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => toast("PINNED THREAD")}
          className="w-8 h-8 inline-flex items-center justify-center rounded-sm border border-border-orage text-text-muted hover:text-text-primary hover:bg-bg-3 transition"
          aria-label="Pin"
        >
          <IcPin className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onTogglePanel?.()}
          className="hidden md:inline-flex w-8 h-8 items-center justify-center rounded-sm border border-border-orage text-text-muted hover:text-gold-400 hover:border-gold-500/60 transition"
          aria-label="Capabilities & briefings"
          title="Capabilities · Briefings · Audit"
        >
          <IcSpark className="w-3.5 h-3.5" />
        </button>
        <button
          className="w-8 h-8 inline-flex items-center justify-center rounded-sm border border-border-orage text-text-muted hover:text-text-primary hover:bg-bg-3 transition"
          aria-label="More"
        >
          <IcMore className="w-3.5 h-3.5" />
        </button>
      </header>

      {thread ? <ContextBar threadId={thread.id} /> : <div />}

      <div
        ref={scrollerRef}
        className="overflow-y-auto px-3 py-5 md:px-6 md:py-8 space-y-6"
      >
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 max-w-2xl mx-auto">
            <AIOrb size="lg" className="mx-auto mb-5" />
            <p className="font-display tracking-[0.22em] text-gold-400 text-sm">
              READY TO IMPLEMENT
            </p>
            <p className="text-[12px] text-text-muted mt-2 mb-8">
              Ask anything below — or start with one of these.
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => pickSuggestion(s)}
                    className="w-full text-left px-4 py-3 bg-bg-3 border border-border-orage rounded-sm text-[13px] text-text-primary hover:border-gold-500 hover:text-gold-400 transition-colors"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
      </div>

      <Composer />
    </section>
  )
}
