"use client"

import { TenantLink as Link } from "@/components/tenant-link"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { type MockTask, getUser as userById } from "@/lib/mock-data"
import { OrageAvatar } from "@/components/orage/avatar"
import { dueLabel } from "@/lib/format"
import { cn } from "@/lib/utils"
import { IcCheck } from "@/components/orage/icons"

const ROCK_LINK_LABEL: Record<string, string> = {
  r1: "↗ ROCK · OFFER",
  r2: "↗ CLIENT",
  r3: "↗ ROCK · VSL",
  r6: "↗ ROCK · TOOLKIT",
  r7: "↗ ROCK · OUTBOUND",
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

export function TodayPriorities({ tasks }: { tasks: MockTask[] }) {
  const [done, setDone] = useState<Set<string>>(
    new Set(tasks.filter((t) => t.status === "done").map((t) => t.id)),
  )
  const [showAll, setShowAll] = useState(false)

  const { nearTerm, total } = useMemo(() => {
    const now = Date.now()
    const cutoff = now + THREE_DAYS_MS
    const inWindow = tasks.filter((t) => {
      if (!t.due) return true // tasks without a due date stay visible
      const d = Date.parse(t.due)
      if (Number.isNaN(d)) return true
      return d <= cutoff
    })
    return { nearTerm: inWindow, total: tasks.length }
  }, [tasks])

  const list = showAll ? tasks : nearTerm
  const hidden = total - nearTerm.length

  function toggle(id: string) {
    setDone((s) => {
      const next = new Set(s)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        toast("TASK COMPLETED")
      }
      return next
    })
  }

  return (
    <section className="solid mb-5 overflow-hidden">
      <header className="px-[18px] py-3.5 border-b border-border-orage flex items-center justify-between">
        <div className="font-display text-[13px] tracking-[0.22em] text-gold-400 uppercase">
          MY PRIORITIES · NEXT 3 DAYS
        </div>
        <Link
          href="/tasks"
          className="text-[11px] text-text-muted hover:text-gold-400 transition-colors"
        >
          View All Tasks →
        </Link>
      </header>
      <ul>
        {list.length === 0 && (
          <li className="px-[18px] py-10 text-center">
            <p className="text-sm text-text-secondary leading-relaxed mb-3">
              Nothing on deck for the next 3 days.
            </p>
            <p className="text-xs text-text-muted leading-relaxed mb-4 max-w-xs mx-auto">
              Drop an issue or pick up a rock — the work that matters most will
              surface here automatically.
            </p>
            <div className="flex justify-center gap-2 flex-wrap">
              <Link
                href="/issues"
                className="px-3 py-1.5 rounded-sm border border-border-orage hover:border-gold-500 hover:text-gold-300 text-[11px] font-mono uppercase tracking-[0.16em] text-text-primary transition-colors"
              >
                Drop Issue →
              </Link>
              <Link
                href="/rocks"
                className="px-3 py-1.5 rounded-sm bg-gold-500 hover:bg-gold-400 text-text-on-gold text-[11px] font-mono uppercase tracking-[0.16em] transition-colors"
              >
                New Rock →
              </Link>
            </div>
          </li>
        )}
        {list.map((t) => {
          const owner = userById(t.owner)
          const isDone = done.has(t.id)
          const due = dueLabel(t.due)
          const link =
            t.rockId && ROCK_LINK_LABEL[t.rockId]
              ? ROCK_LINK_LABEL[t.rockId]
              : null
          return (
            <li
              key={t.id}
              className={cn(
                "grid items-center gap-3.5 px-3.5 py-2.5 border-b border-border-orage last:border-b-0 cursor-pointer transition-colors hover:bg-bg-hover",
                isDone && "[&_.task-name]:line-through [&_.task-name]:text-text-muted",
              )}
              style={{
                gridTemplateColumns: "24px 1fr 90px 80px 32px",
              }}
              onClick={() => toggle(t.id)}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  toggle(t.id)
                }}
                aria-pressed={isDone}
                aria-label={isDone ? "Mark incomplete" : "Mark complete"}
                className={cn(
                  "w-4 h-4 rounded-sm flex items-center justify-center transition-all border-[1.5px]",
                  isDone
                    ? "bg-gold-500 border-gold-500"
                    : "border-border-strong hover:border-gold-500",
                )}
              >
                {isDone && (
                  <IcCheck className="w-2.5 h-2.5 text-text-on-gold" />
                )}
              </button>
              <div className="task-name text-[13px] text-text-primary flex items-center gap-2 min-w-0">
                <span className="truncate">{t.title}</span>
                {link && (
                  <span className="font-display text-[9px] tracking-[0.15em] text-gold-500 bg-gold-500/10 px-1.5 py-0.5 rounded-sm shrink-0">
                    {link}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "priority justify-self-start",
                  t.priority === "high" && "priority-high",
                  t.priority === "med" && "priority-med",
                  t.priority === "low" && "priority-low",
                  isDone && "invisible",
                )}
              >
                {t.priority.toUpperCase()}
              </span>
              <span
                className={cn(
                  "text-[11px] font-mono",
                  isDone
                    ? "text-text-muted"
                    : due.tone === "overdue"
                      ? "text-danger"
                      : due.tone === "urgent"
                        ? "text-warning"
                        : "text-text-muted",
                )}
              >
                {isDone ? "DONE" : due.label}
              </span>
              {owner && <OrageAvatar user={owner} size="sm" />}
            </li>
          )
        })}
      </ul>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="w-full px-[18px] py-2.5 border-t border-border-orage text-[11px] font-display tracking-[0.18em] text-text-muted hover:text-gold-400 uppercase transition-colors"
        >
          {showAll ? "Hide backlog" : `Show full backlog (${hidden} more)`}
        </button>
      )}
    </section>
  )
}
