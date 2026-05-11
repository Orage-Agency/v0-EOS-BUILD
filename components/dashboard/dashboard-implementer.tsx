"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { TenantLink as Link } from "@/components/tenant-link"
import { useAIImplementerStore } from "@/lib/ai-implementer-store"
import { useWorkspaceSlug } from "@/hooks/use-workspace-slug"
import { AIOrb } from "@/components/orage/ai-orb"
import { MessageBubble } from "@/components/ai/message-bubble"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

/**
 * Compact AI Implementer surface for the dashboard hero. Shares the global
 * AI store with /ai so anything the user says here continues into the
 * full chat. Renders the last few exchanges, a textarea, and a couple of
 * starter prompts.
 */
const QUICK_PROMPTS: { label: string; prompt: string }[] = [
  { label: "What's on my plate today?", prompt: "What's on my plate today? Show every open task assigned to me grouped by due date." },
  { label: "Make a task", prompt: "Create a task for me — ask me one question at a time (title, due date, owner)." },
  { label: "Rocks at risk", prompt: "Which quarterly rocks are at risk or off-track right now? Group by owner." },
  { label: "Summarize team", prompt: "Summarize what every teammate is currently working on, one line each." },
]

export function DashboardImplementer() {
  const activeId = useAIImplementerStore((s) => s.activeThreadId)
  const allMessages = useAIImplementerStore((s) => s.messages)
  const draft = useAIImplementerStore((s) => s.composerDraft)
  const setDraft = useAIImplementerStore((s) => s.setComposerDraft)
  const sendMessage = useAIImplementerStore((s) => s.sendMessage)
  const streaming = useAIImplementerStore((s) => s.streaming)
  const cancelStream = useAIImplementerStore((s) => s.cancelStream)
  const writeTick = useAIImplementerStore((s) => s.writeTick)
  const workspaceSlug = useWorkspaceSlug()
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)

  // Mirror /ai page's behavior: when the AI writes anything, refresh the
  // dashboard so MY FOCUS / TEAM FOCUS / KPI tiles reflect the new state.
  useEffect(() => {
    if (writeTick > 0) {
      router.refresh()
      toast.success("Updated")
    }
  }, [writeTick, router])

  const messages = useMemo(
    () => allMessages.filter((m) => m.threadId === activeId),
    [allMessages, activeId],
  )

  // Show the last 4 exchanges (8 messages) so the dashboard surface stays
  // compact. Full thread lives at /ai.
  const visible = useMemo(() => messages.slice(-8), [messages])
  const hasHistory = visible.length > 0

  const scrollerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight
    if (distanceFromBottom < 80) {
      el.scrollTop = el.scrollHeight
    }
  }, [visible])

  function handleSend() {
    if (streaming) return
    const text = draft.trim()
    if (!text) return
    sendMessage(text, workspaceSlug)
    // Auto-expand the panel once the user actually sends so they can read
    // the reply without scrolling the whole dashboard.
    setExpanded(true)
  }

  function pickPrompt(p: string) {
    setDraft(p)
  }

  return (
    <section className="mb-5 rounded-md border border-border-orage bg-bg-2 overflow-hidden">
      <header className="px-5 md:px-6 py-3.5 border-b border-border-orage flex items-center justify-between gap-3 bg-bg-3/40">
        <div className="flex items-center gap-3 min-w-0">
          <AIOrb size="sm" />
          <div className="min-w-0">
            <div className="font-display text-[13px] tracking-[0.22em] text-gold-400 uppercase">
              Ask The Implementer
            </div>
            <div className="text-[10px] text-text-muted truncate">
              Powered by Claude Haiku · ask, plan, create, update — all in
              one breath
            </div>
          </div>
        </div>
        <Link
          href="/ai"
          className="shrink-0 text-[10px] font-display tracking-[0.18em] uppercase text-text-muted hover:text-gold-400 transition-colors"
        >
          Full chat →
        </Link>
      </header>

      {hasHistory && (
        <div
          ref={scrollerRef}
          className={cn(
            "px-3 md:px-4 py-3 overflow-y-auto flex flex-col gap-4 border-b border-border-orage bg-bg-base/60",
            expanded ? "max-h-[420px]" : "max-h-[220px]",
          )}
        >
          {visible.map((m, i) => (
            <MessageBubble
              key={m.id}
              message={m}
              isLastAi={
                i === visible.length - 1 && m.author === "ai" && !streaming
              }
            />
          ))}
        </div>
      )}

      <div className="px-4 md:px-5 py-4">
        {!streaming && draft.trim().length === 0 && !hasHistory && (
          <div className="flex flex-wrap gap-1.5 mb-3" aria-label="Suggestions">
            {QUICK_PROMPTS.map((qp) => (
              <button
                key={qp.label}
                type="button"
                onClick={() => pickPrompt(qp.prompt)}
                className="font-display tracking-[0.14em] text-[10px] px-2.5 py-1.5 rounded-sm border border-border-orage text-text-secondary hover:border-gold-500/40 hover:text-gold-400 transition-colors"
              >
                {qp.label.toUpperCase()}
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
            placeholder={
              streaming
                ? "Drafting next message… (Stop to send)"
                : "Ask the implementer anything — make a task, check rocks, summarize…"
            }
            className="w-full bg-transparent px-3.5 py-3 text-[14px] text-text-primary placeholder:text-text-dim focus:outline-none resize-none leading-snug min-h-[64px]"
          />
          <div className="flex items-center gap-2 px-3 py-2 border-t border-border-orage/70">
            <span className="hidden md:inline font-mono text-[10px] text-text-dim">
              ⌘↩ to send
            </span>
            <div className="flex-1" />
            {streaming ? (
              <button
                type="button"
                onClick={cancelStream}
                className="font-display tracking-[0.2em] text-[10px] px-4 py-2 rounded-sm border border-danger/60 text-danger hover:bg-danger/10 transition"
              >
                ■ STOP
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={!draft.trim()}
                className="font-display tracking-[0.2em] text-[11px] px-5 py-2 rounded-sm bg-gold-500 hover:bg-gold-400 disabled:opacity-40 disabled:cursor-not-allowed text-text-on-gold transition"
              >
                SEND →
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
