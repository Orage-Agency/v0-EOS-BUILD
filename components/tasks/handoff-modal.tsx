"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useTasksStore } from "@/lib/tasks-store"
import { getUser } from "@/lib/mock-data"
import { OrageAvatar } from "@/components/orage/avatar"
import { reassignTaskWithHandoff } from "@/app/actions/tasks"
import { useWorkspaceSlug } from "@/hooks/use-workspace-slug"
import { tBase, easeOut, easeSpring } from "@/lib/motion"
import { cn } from "@/lib/utils"

const CONTEXT_TEMPLATES = [
  "Why now",
  "Last steps taken",
  "Blockers",
  "Expected next move",
]

export function HandoffModal() {
  const pending = useTasksStore((s) => s.handoffPending)
  const cancel = useTasksStore((s) => s.cancelHandoff)
  const confirm = useTasksStore((s) => s.confirmHandoff)
  const tasks = useTasksStore((s) => s.tasks)

  const workspaceSlug = useWorkspaceSlug()
  const [context, setContext] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (pending) {
      setContext("")
      setError(null)
      setSubmitting(false)
    }
  }, [pending])

  useEffect(() => {
    if (!pending) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel()
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        void submit()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [pending])

  async function submit() {
    if (!pending) return
    if (!context.trim()) {
      setError("Context is required — the Santa chain stays unbroken.")
      return
    }
    setSubmitting(true)
    setError(null)
    const result = await reassignTaskWithHandoff(workspaceSlug, {
      taskId: pending.taskId,
      fromUserId: pending.fromUserId,
      toUserId: pending.toUserId,
      context,
    })
    if (!result.ok) {
      setError(result.error ?? "Could not save handoff.")
      setSubmitting(false)
      return
    }
    await confirm(context)
    const toUser = getUser(pending.toUserId)
    toast(`HANDOFF · ${toUser?.name.split(" ")[0].toUpperCase() ?? "ASSIGNED"}`)
    setSubmitting(false)
  }

  const from = pending ? getUser(pending.fromUserId) : null
  const to = pending ? getUser(pending.toUserId) : null
  const task = pending ? tasks.find((t) => t.id === pending.taskId) : null

  return (
    <AnimatePresence>
      {pending && from && to && task && (
        <motion.div
          key="handoff-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: tBase, ease: easeOut }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) cancel()
          }}
          className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-center justify-center p-10"
          role="dialog"
          aria-modal="true"
          aria-label="Reassign task with handoff"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: tBase, ease: easeSpring }}
            className="glass-strong border-gold-500 rounded-md shadow-orage-lg shadow-gold max-w-[520px] w-full flex flex-col"
          >
            <div className="px-6 pt-5 pb-3.5 border-b border-border-orage">
              <h2 className="font-display text-[20px] tracking-[0.1em] text-gold-400">
                THE HANDOFF
              </h2>
              <p className="text-xs text-text-muted mt-1">
                Reassign &quot;{task.title}&quot; · context required so the chain stays unbroken.
              </p>
            </div>

            <div className="px-6 py-5 flex flex-col gap-3.5">
              <div className="flex items-center gap-3.5 p-3.5 bg-bg-3 rounded-sm border border-border-orage">
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <OrageAvatar user={from} size="lg" />
                  <span className="text-xs text-text-primary font-medium">
                    {from.name}
                  </span>
                  <span className="font-display text-[9px] tracking-[0.18em] text-text-muted">
                    HANDING OFF
                  </span>
                </div>
                <span
                  className="text-2xl text-gold-500"
                  aria-hidden
                  style={{ animation: "ai-pulse 1.6s ease-in-out infinite" }}
                >
                  →
                </span>
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <OrageAvatar user={to} size="lg" />
                  <span className="text-xs text-text-primary font-medium">
                    {to.name}
                  </span>
                  <span className="font-display text-[9px] tracking-[0.18em] text-gold-500">
                    RECEIVING
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-display text-[10px] tracking-[0.2em] text-gold-500 uppercase">
                  Context Note <span className="text-danger">*</span>
                </label>
                <textarea
                  autoFocus
                  value={context}
                  onChange={(e) => {
                    setContext(e.target.value)
                    if (error) setError(null)
                  }}
                  placeholder="Why are you handing this off? What's done? What's blocking? What's next?"
                  className={cn(
                    "bg-bg-3 border rounded-sm px-3 py-2.5 text-text-primary text-[13px] leading-relaxed min-h-[110px] resize-y outline-none",
                    error
                      ? "border-danger focus:border-danger"
                      : "border-border-orage focus:border-gold-500",
                  )}
                />
                <span className="text-[10px] text-text-muted italic">
                  Cmd+Enter to save · the recipient will see this in their drawer.
                </span>
                {error && (
                  <span className="text-[11px] text-danger">{error}</span>
                )}
              </div>

              <div>
                <div className="font-display text-[10px] tracking-[0.2em] text-gold-500 uppercase mb-2">
                  Quick Templates
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CONTEXT_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl}
                      type="button"
                      onClick={() =>
                        setContext((c) =>
                          (c ? c + "\n\n" : "") + `${tmpl}: `,
                        )
                      }
                      className="px-2.5 py-1 bg-bg-3 border border-border-orage rounded-sm text-[10px] text-text-secondary hover:border-gold-500 hover:text-gold-400"
                    >
                      + {tmpl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 pt-3.5 pb-5 border-t border-border-orage flex justify-end gap-2">
              <button
                type="button"
                onClick={cancel}
                className="px-3.5 py-1.5 bg-bg-3 border border-border-orage rounded-sm text-xs text-text-secondary hover:border-gold-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="px-4 py-1.5 bg-gradient-to-br from-gold-500 to-gold-400 text-text-on-gold rounded-sm text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "SAVING…" : "CONFIRM HANDOFF"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
