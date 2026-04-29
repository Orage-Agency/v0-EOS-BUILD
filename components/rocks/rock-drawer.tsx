"use client"

import { AnimatePresence, motion } from "framer-motion"
import { toast } from "sonner"
import {
  PARENT_GOALS,
  ROCK_DEPARTMENTS,
  ROCK_OUTCOMES,
  rockProgress,
  useRocksStore,
} from "@/lib/rocks-store"
import { CURRENT_USER, getUser } from "@/lib/mock-data"
import { canEditRocks } from "@/lib/permissions"
import { OrageAvatar } from "@/components/orage/avatar"
import { TenantLink } from "@/components/tenant-link"
import { IcCheck, IcClose } from "@/components/orage/icons"
import { dueLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

const STATUS_TAG: Record<string, { label: string; cls: string }> = {
  on_track: { label: "● ON TRACK", cls: "bg-success/15 text-success border-success/40" },
  in_progress: { label: "◐ IN PROGRESS", cls: "bg-info/15 text-info border-info/40" },
  at_risk: { label: "▲ AT RISK", cls: "bg-warning/15 text-warning border-warning/40" },
  off_track: { label: "● OFF TRACK", cls: "bg-danger/15 text-danger border-danger/40" },
  done: { label: "✓ DONE", cls: "bg-gold-500/15 text-gold-400 border-gold-500/40" },
}

export function RockDrawer() {
  const openId = useRocksStore((s) => s.openRockId)
  const close = useRocksStore((s) => s.closeRock)
  const rocks = useRocksStore((s) => s.rocks)
  const milestones = useRocksStore((s) => s.milestones)
  const linkedTasks = useRocksStore((s) => s.linkedTasks)
  const updates = useRocksStore((s) => s.updates)
  const toggleMilestone = useRocksStore((s) => s.toggleMilestone)
  const allowed = canEditRocks(CURRENT_USER)

  const rock = rocks.find((r) => r.id === openId)
  const owner = rock ? getUser(rock.owner) : null
  const ownMs = rock ? milestones.filter((m) => m.rockId === rock.id) : []
  const ownTasks = rock ? linkedTasks.filter((t) => t.rockId === rock.id) : []
  const ownUpdates = rock ? updates.filter((u) => u.rockId === rock.id) : []
  const pct = rock ? rockProgress(rock.id, milestones, rock.progress) : 0
  const open = Boolean(rock)

  return (
    <AnimatePresence>
      {open && rock && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={close}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />
          <motion.aside
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[560px] flex-col border-l border-border-orage bg-bg-2 shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-border-orage px-5 py-3.5">
              <span
                className={cn(
                  "px-2.5 py-1 rounded-sm border font-display text-[11px] tracking-[0.15em]",
                  STATUS_TAG[rock.status].cls,
                )}
              >
                {STATUS_TAG[rock.status].label}
              </span>
              <button
                onClick={close}
                className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-bg-3 hover:text-text-primary"
                aria-label="Close drawer"
              >
                <IcClose className="w-3.5 h-3.5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <h2 className="mb-5 font-display text-[26px] leading-tight tracking-wide text-text-primary text-balance">
                {rock.title}
              </h2>

              <dl className="mb-6 grid grid-cols-[110px_1fr] gap-x-4 gap-y-3 text-[12px]">
                <dt className="font-mono text-[10px] tracking-[0.1em] text-text-muted self-center">OWNER</dt>
                <dd className="flex items-center gap-2 text-text-secondary">
                  {owner && <OrageAvatar user={owner} size="xs" />} {owner?.name}
                </dd>

                <dt className="font-mono text-[10px] tracking-[0.1em] text-text-muted self-center">DUE</dt>
                <dd className="font-mono text-warning">
                  {dueLabel(rock.due).label} · {weeksRemaining(rock.due)}
                </dd>

                <dt className="font-mono text-[10px] tracking-[0.1em] text-text-muted self-center">PROGRESS</dt>
                <dd className="font-mono text-gold-400 font-semibold text-[14px]">
                  {pct}% · {ownMs.filter((m) => m.done).length}/{ownMs.length || "—"} MILESTONES
                </dd>

                <dt className="font-mono text-[10px] tracking-[0.1em] text-text-muted self-center">DEPARTMENT</dt>
                <dd className="text-text-secondary">{ROCK_DEPARTMENTS[rock.id] ?? "—"}</dd>

                <dt className="font-mono text-[10px] tracking-[0.1em] text-text-muted self-center">PARENT</dt>
                <dd>
                  <span className="font-display text-[10px] tracking-[0.15em] text-gold-400 bg-gold-500/10 px-2 py-1 rounded-sm cursor-pointer hover:bg-gold-500/20">
                    ↑ {PARENT_GOALS[rock.id] ?? "1-YEAR GOAL"}
                  </span>
                </dd>
              </dl>

              <section className="mb-6">
                <div className="mb-2 font-mono text-[10px] tracking-[0.1em] text-text-muted">
                  MEASURABLE OUTCOME
                </div>
                <div className="rounded-md border border-border-orage bg-bg-3 px-3.5 py-3 text-[13px] leading-relaxed text-text-secondary">
                  {ROCK_OUTCOMES[rock.id] ?? "Outcome locked at rock creation."}
                </div>
              </section>

              <section className="mb-6">
                <div className="mb-2 flex items-center justify-between font-mono text-[10px] tracking-[0.1em] text-text-muted">
                  <span>MILESTONES</span>
                  {allowed && (
                    <button
                      type="button"
                      onClick={() => toast("NEW MILESTONE · ADD ROW")}
                      className="text-gold-400 hover:text-gold-500 transition-colors"
                    >
                      + Add milestone
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  {ownMs.length === 0 && (
                    <div className="rounded-md border border-dashed border-border-orage bg-bg-3 px-3 py-4 text-center text-[12px] text-text-muted">
                      No milestones yet.
                    </div>
                  )}
                  {ownMs.map((m) => {
                    const due = dueLabel(m.due)
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => allowed && toggleMilestone(m.id)}
                        disabled={!allowed}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md border border-border-orage bg-bg-3 px-3 py-2.5 text-left transition-colors",
                          allowed ? "hover:border-gold-500/40" : "cursor-default",
                        )}
                      >
                        <span
                          className={cn(
                            "w-4 h-4 rounded-sm border-[1.5px] flex items-center justify-center shrink-0",
                            m.done
                              ? "bg-gold-500 border-gold-500"
                              : "border-border-strong",
                          )}
                        >
                          {m.done && <IcCheck className="w-2.5 h-2.5 text-text-on-gold" />}
                        </span>
                        <span
                          className={cn(
                            "flex-1 text-[13px] text-text-primary",
                            m.done && "line-through text-text-muted",
                          )}
                        >
                          {m.title}
                        </span>
                        <span
                          className={cn(
                            "font-mono text-[10px] shrink-0",
                            due.tone === "overdue"
                              ? "text-danger"
                              : due.tone === "urgent"
                                ? "text-warning"
                                : "text-text-muted",
                          )}
                        >
                          {due.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>

              {ownTasks.length > 0 && (
                <section className="mb-6">
                  <div className="mb-2 flex items-center justify-between font-mono text-[10px] tracking-[0.1em] text-text-muted">
                    <span>LINKED TASKS · {ownTasks.length}</span>
                    <TenantLink href="/tasks" className="text-gold-400 hover:text-gold-500 transition-colors">
                      View all in Tasks →
                    </TenantLink>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {ownTasks.map((t) => {
                      const o = getUser(t.ownerId)
                      const due = dueLabel(t.due)
                      return (
                        <div
                          key={t.id}
                          className="flex items-center gap-2.5 rounded-md border border-border-orage bg-bg-3 px-3 py-2.5"
                        >
                          <span className="w-3.5 h-3.5 rounded-sm border-[1.5px] border-border-strong shrink-0" />
                          <span className="flex-1 text-[12px] text-text-secondary truncate">{t.title}</span>
                          <span className="font-mono text-[10px] text-text-muted shrink-0">{due.label}</span>
                          {o && <OrageAvatar user={o} size="xs" />}
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              {ownUpdates.length > 0 && (
                <section>
                  <div className="mb-2 font-mono text-[10px] tracking-[0.1em] text-text-muted">
                    UPDATE FEED
                  </div>
                  <div className="flex flex-col gap-2">
                    {ownUpdates.map((u) => (
                      <div
                        key={u.id}
                        className="rounded-md border border-border-orage bg-bg-3 px-3 py-2.5"
                      >
                        <div
                          className={cn(
                            "mb-1 font-mono text-[10px] tracking-wider",
                            u.authorId === "AI" ? "text-gold-400" : "text-text-muted",
                          )}
                        >
                          {u.authorLabel} · {u.at}
                        </div>
                        <div className="text-[12px] leading-relaxed text-text-secondary">{u.body}</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function weeksRemaining(due: string | null | undefined): string {
  if (!due) return "—"
  const d = new Date(due + "T00:00:00")
  if (Number.isNaN(d.getTime())) return "—"
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 7))
  if (diff < 0) return "OVERDUE"
  if (diff === 0) return "THIS WEEK"
  return `${diff} ${diff === 1 ? "WEEK" : "WEEKS"}`
}
