"use client"

import { useRouter, useParams } from "next/navigation"
import { TenantLink as Link } from "@/components/tenant-link"
import type { DashboardTask } from "@/lib/dashboard"
import type { ClientTagOption } from "@/lib/client-tags"
import { ClientDot } from "@/components/tasks/client-tag-picker"
import { dueLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

const SLOT_LABELS = ["NORTH STAR", "SECOND", "THIRD"] as const

export function MyStarred({
  tasks,
  clientTagOptions = [],
}: {
  tasks: DashboardTask[]
  clientTagOptions?: ClientTagOption[]
}) {
  const router = useRouter()
  const params = useParams<{ workspace: string }>()
  const slug = params?.workspace ?? ""

  function openTaskInTasksPage(taskId: string) {
    if (!slug) return
    router.push(`/${slug}/tasks?task=${taskId}`)
  }

  // Always render 3 slots so the layout is stable as the user stars
  // their way to a full focus set. Missing slots are dimmed placeholders.
  const slots: (DashboardTask | null)[] = [
    tasks[0] ?? null,
    tasks[1] ?? null,
    tasks[2] ?? null,
  ]

  return (
    <section className="mb-5 rounded-md border border-gold-500/40 bg-gradient-to-br from-gold-500/10 via-bg-2 to-bg-3 shadow-orage-lg shadow-gold/20 overflow-hidden">
      <header className="px-6 py-4 border-b border-gold-500/30 flex items-center justify-between bg-gold-500/5">
        <div className="flex items-center gap-3">
          <span aria-hidden className="text-gold-400 text-[20px] leading-none">
            ★
          </span>
          <div>
            <div className="font-display text-[15px] tracking-[0.22em] text-gold-300 uppercase">
              My Focus · 3 Tasks Max
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">
              The only tasks that matter today. Star up to three on the tasks page.
            </div>
          </div>
        </div>
        <Link
          href="/tasks"
          className="text-[11px] font-display tracking-[0.18em] uppercase text-gold-400 hover:text-gold-300 transition-colors"
        >
          Manage →
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-5">
        {slots.map((t, idx) => {
          if (!t) {
            return (
              <div
                key={`empty-${idx}`}
                className="rounded-md border border-dashed border-border-orage bg-bg-3/40 px-5 py-7 flex flex-col items-center justify-center text-center min-h-[140px]"
              >
                <span
                  aria-hidden
                  className="text-text-dim text-[18px] leading-none mb-2"
                >
                  ☆
                </span>
                <div className="font-display text-[10px] tracking-[0.2em] text-text-muted uppercase mb-1">
                  Slot {idx + 1} · {SLOT_LABELS[idx]}
                </div>
                <div className="text-[11px] text-text-dim leading-relaxed max-w-[180px]">
                  Empty — star a task to claim this slot.
                </div>
              </div>
            )
          }
          const due = dueLabel(t.due)
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => openTaskInTasksPage(t.id)}
              className={cn(
                "group relative rounded-md border bg-bg-3 hover:bg-bg-4 transition-all text-left p-4 min-h-[140px] flex flex-col gap-2.5",
                idx === 0
                  ? "border-gold-500 shadow-orage-md shadow-gold/30 hover:shadow-gold/50"
                  : "border-border-orage hover:border-gold-500/60",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    aria-hidden
                    className={cn(
                      "text-[14px] leading-none shrink-0",
                      idx === 0 ? "text-gold-300" : "text-gold-400",
                    )}
                  >
                    ★
                  </span>
                  <span className="font-display text-[9px] tracking-[0.2em] uppercase text-gold-400">
                    {SLOT_LABELS[idx]}
                  </span>
                </div>
                <ClientDot
                  clientWorkspaceId={t.clientWorkspaceId}
                  options={clientTagOptions}
                  size={8}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    "uppercase leading-snug text-text-primary line-clamp-3",
                    idx === 0
                      ? "text-[17px] font-semibold tracking-[0.02em]"
                      : "text-[14px] font-medium",
                  )}
                >
                  {t.title}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-border-orage/50">
                <span
                  className={cn(
                    "priority",
                    t.priority === "high" && "priority-high",
                    t.priority === "med" && "priority-med",
                    t.priority === "low" && "priority-low",
                  )}
                >
                  {t.priority.toUpperCase()}
                </span>
                <span
                  className={cn(
                    "text-[11px] font-mono",
                    due.tone === "overdue"
                      ? "text-danger font-semibold"
                      : due.tone === "urgent"
                        ? "text-warning font-semibold"
                        : "text-text-muted",
                  )}
                >
                  {due.label || "no due date"}
                </span>
              </div>

              <span
                aria-hidden
                className="absolute top-3 right-3 text-text-dim group-hover:text-gold-400 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                OPEN →
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
