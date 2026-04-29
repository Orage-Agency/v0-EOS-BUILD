"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useTasksStore } from "@/lib/tasks-store"
import { getUser, ROCKS } from "@/lib/mock-data"
import { OrageAvatar } from "@/components/orage/avatar"
import { IcClose, IcNote } from "@/components/orage/icons"
import { dueLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

const STATUS_LABEL = {
  open: "OPEN",
  in_progress: "IN PROGRESS",
  done: "DONE",
  cancelled: "CANCELLED",
} as const

export function TaskDrawer() {
  const openTaskId = useTasksStore((s) => s.openTaskId)
  const tasks = useTasksStore((s) => s.tasks)
  const handoffs = useTasksStore((s) => s.handoffs)
  const closeTask = useTasksStore((s) => s.closeTask)

  const task = tasks.find((t) => t.id === openTaskId)
  const owner = task ? getUser(task.owner) : null
  const rock = task?.rockId ? ROCKS.find((r) => r.id === task.rockId) : null
  const taskHandoffs = task ? handoffs.filter((h) => h.taskId === task.id) : []
  const due = task ? dueLabel(task.due) : null
  const open = Boolean(task)

  return (
    <AnimatePresence>
      {open && task && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={closeTask}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />
          <motion.aside
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[520px] flex-col border-l border-border-orage bg-bg-2 shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-border-orage px-5 py-3.5">
              <div className="font-mono text-[10px] tracking-[0.12em] text-text-muted">
                TASK DETAIL
              </div>
              <button
                onClick={closeTask}
                className="flex h-7 w-7 items-center justify-center rounded text-text-muted transition-colors hover:bg-bg-3 hover:text-text-primary"
                aria-label="Close drawer"
              >
                <IcClose className="w-3.5 h-3.5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <h2 className="mb-5 font-display text-[28px] leading-tight tracking-wide text-text-primary text-balance">
                {task.title}
              </h2>

              <dl className="mb-6 grid grid-cols-[110px_1fr] gap-x-4 gap-y-3 text-[12px]">
                <dt className="font-mono text-[10px] tracking-[0.1em] text-text-muted self-center">STATUS</dt>
                <dd>
                  <span
                    className={cn(
                      "priority",
                      task.status === "done" && "bg-success/15 text-success",
                      task.status === "in_progress" && "bg-info/15 text-info",
                      task.status === "open" && "bg-info/15 text-info",
                      task.status === "cancelled" && "bg-bg-3 text-text-muted",
                    )}
                  >
                    {STATUS_LABEL[task.status]}
                  </span>
                </dd>

                <dt className="font-mono text-[10px] tracking-[0.1em] text-text-muted self-center">PRIORITY</dt>
                <dd>
                  <span
                    className={cn(
                      "priority",
                      task.priority === "high" && "priority-high",
                      task.priority === "med" && "priority-med",
                      task.priority === "low" && "priority-low",
                    )}
                  >
                    {task.priority.toUpperCase()}
                  </span>
                </dd>

                <dt className="font-mono text-[10px] tracking-[0.1em] text-text-muted self-center">DUE</dt>
                <dd
                  className={cn(
                    "font-mono",
                    due?.tone === "overdue"
                      ? "text-danger"
                      : due?.tone === "urgent"
                        ? "text-warning"
                        : "text-text-secondary",
                  )}
                >
                  {due?.label}
                </dd>

                <dt className="font-mono text-[10px] tracking-[0.1em] text-text-muted self-center">OWNER</dt>
                <dd className="flex items-center gap-2 text-text-secondary">
                  {owner && <OrageAvatar user={owner} size="xs" />} {owner?.name}
                </dd>

                {rock && (
                  <>
                    <dt className="font-mono text-[10px] tracking-[0.1em] text-text-muted self-center">LINKED ROCK</dt>
                    <dd>
                      <span className="font-display text-[10px] tracking-[0.15em] text-gold-400 bg-gold-500/10 px-2 py-1 rounded-sm cursor-pointer hover:bg-gold-500/20">
                        ↗ {rock.title.toUpperCase()}
                      </span>
                    </dd>
                  </>
                )}
              </dl>

              <section className="mb-6">
                <div className="mb-2 font-mono text-[10px] tracking-[0.1em] text-text-muted">DESCRIPTION</div>
                <textarea
                  placeholder="Add a description…"
                  className="w-full min-h-[88px] resize-none rounded-md border border-border-orage bg-bg-3 px-3 py-2 text-[13px] leading-relaxed text-text-primary outline-none transition-colors focus:border-gold-500/50"
                />
              </section>

              {taskHandoffs.length > 0 && (
                <section className="mb-6">
                  <div className="mb-2 font-mono text-[10px] tracking-[0.1em] text-text-muted">
                    HANDOFF HISTORY · &quot;SANTA CHAIN&quot;
                  </div>
                  <div className="flex flex-col gap-2">
                    {taskHandoffs
                      .slice()
                      .reverse()
                      .map((h) => {
                        const from = getUser(h.fromUserId)
                        const to = getUser(h.toUserId)
                        return (
                          <div
                            key={h.id}
                            className="rounded-md border border-border-orage bg-bg-3 px-3 py-2.5"
                          >
                            <div className="mb-1.5 font-mono text-[10px] tracking-wider text-gold-400">
                              {from?.name.split(" ")[0].toUpperCase()} → {to?.name.split(" ")[0].toUpperCase()} ·{" "}
                              {new Date(h.createdAt).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </div>
                            <div className="text-[12px] leading-relaxed text-text-secondary">{h.context}</div>
                          </div>
                        )
                      })}
                  </div>
                </section>
              )}

              <section className="mb-6">
                <div className="mb-2 font-mono text-[10px] tracking-[0.1em] text-text-muted">
                  ATTACHED NOTES
                </div>
                <div className="flex flex-col gap-1.5">
                  {[
                    { title: "Hormozi Offer Notes · Module 7", meta: "3 BACKLINKS" },
                    { title: "Tier 2 Pricing & Positioning", meta: "UPDATED 2D" },
                  ].map((n, i) => (
                    <button
                      key={i}
                      type="button"
                      className="flex items-center gap-2 rounded-md border border-border-orage bg-bg-3 px-3 py-2.5 text-left text-[12px] text-text-secondary transition-colors hover:border-gold-500/40"
                    >
                      <IcNote className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                      <span className="flex-1 truncate">{n.title}</span>
                      <span className="font-mono text-[9px] text-text-muted shrink-0">{n.meta}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
