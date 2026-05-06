"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useParams } from "next/navigation"
import {
  deleteThread,
  listMyThreads,
  loadThread,
  type ThreadListItem,
} from "@/app/actions/ai-threads"
import { cn } from "@/lib/utils"

/**
 * Sidebar section that surfaces the user's durable AI conversation
 * history (the rows persisted by /api/ai/chat into ai_chat_threads).
 *
 * Lives below the existing in-memory threads section in ThreadsPane —
 * the in-memory list is for the active session's threads, the past
 * list is the on-disk record. Click a row to open a read-only viewer
 * inline; future iteration will let us resume a thread by passing its
 * id back to the chat route, but the viewer is the higher-leverage
 * first step (most "where's that thing the AI said yesterday" needs
 * are about reading, not continuing).
 */

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const d = Math.floor(hr / 24)
  return `${d}d`
}

export function PastThreads() {
  const params = useParams<{ workspace: string }>()
  const workspaceSlug = params?.workspace ?? ""
  const [open, setOpen] = useState(false)
  const [threads, setThreads] = useState<ThreadListItem[] | null>(null)
  const [active, setActive] = useState<{
    title: string
    messages: { id: string; role: string; content: string }[]
  } | null>(null)
  const [loading, setLoading] = useState(false)

  async function refresh() {
    if (!workspaceSlug) return
    setLoading(true)
    const res = await listMyThreads(workspaceSlug, 30)
    setLoading(false)
    if (res.ok) setThreads(res.threads)
  }

  useEffect(() => {
    if (open && threads === null) void refresh()
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  async function openThread(id: string) {
    const res = await loadThread(workspaceSlug, id)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    setActive({
      title: res.thread.title,
      messages: res.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
      })),
    })
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this thread? The conversation can't be recovered.")) return
    const res = await deleteThread(workspaceSlug, id)
    if (!res.ok) {
      toast.error(res.error ?? "Delete failed")
      return
    }
    setThreads((cur) => (cur ?? []).filter((t) => t.id !== id))
    toast.success("Thread deleted")
  }

  if (!workspaceSlug) return null

  return (
    <section className="mb-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-1.5 font-display tracking-[0.22em] text-[9px] text-text-dim hover:text-gold-400 transition-colors"
      >
        <span>{open ? "▾" : "▸"}</span>
        <span className="flex-1 text-left">PAST · ON DISK</span>
        {threads && (
          <span className="font-mono text-[9px]">{threads.length}</span>
        )}
      </button>
      {open && (
        <div className="px-1">
          {loading && threads === null ? (
            <p className="text-[11px] text-text-muted px-3 py-2">Loading…</p>
          ) : threads === null || threads.length === 0 ? (
            <p className="text-[11px] text-text-muted px-3 py-2 leading-relaxed">
              No past threads yet. Anything you ask the implementer is
              automatically saved here.
            </p>
          ) : (
            <ul className="space-y-px">
              {threads.map((t) => (
                <li key={t.id} className="group">
                  <div className="flex items-start gap-1 px-3 py-2 rounded-sm hover:bg-bg-hover transition-colors">
                    <button
                      type="button"
                      onClick={() => void openThread(t.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="text-xs text-text-secondary truncate">
                        {t.title}
                      </div>
                      <div className="text-[10px] text-text-muted mt-0.5 line-clamp-1 leading-snug">
                        {t.preview || "—"}
                      </div>
                    </button>
                    <span className="font-mono text-[9px] text-text-dim shrink-0">
                      {relTime(t.updatedAt)}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleDelete(t.id)}
                      aria-label={`Delete ${t.title}`}
                      className="opacity-0 group-hover:opacity-100 text-text-dim hover:text-danger text-xs font-mono px-1 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {active && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-bg-1/90 backdrop-blur-md p-4"
          onClick={() => setActive(null)}
          role="dialog"
        >
          <div
            className="w-full max-w-2xl max-h-[80vh] flex flex-col bg-bg-2 border border-border-orage rounded-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="px-4 py-3 border-b border-border-orage flex items-center justify-between">
              <h3 className="font-display tracking-[0.06em] text-text-primary text-base">
                {active.title}
              </h3>
              <button
                type="button"
                onClick={() => setActive(null)}
                className="text-text-muted hover:text-text-primary px-2 text-sm"
              >
                ✕
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {active.messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "rounded-sm border px-3 py-2",
                    m.role === "user"
                      ? "border-gold-500/40 bg-gold-500/5"
                      : "border-border-orage bg-bg-3",
                  )}
                >
                  <div className="font-display tracking-[0.18em] text-[9px] uppercase text-text-muted mb-1">
                    {m.role === "user" ? "YOU" : "IMPLEMENTER"}
                  </div>
                  <div className="text-[12px] text-text-primary whitespace-pre-wrap leading-snug">
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
