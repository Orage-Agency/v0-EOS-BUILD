"use client"

import { useRouter, useParams } from "next/navigation"
import { TenantLink as Link } from "@/components/tenant-link"
import type { DashboardTask } from "@/lib/dashboard"
import type { ClientTagOption } from "@/lib/client-tags"
import { ClientDot } from "@/components/tasks/client-tag-picker"
import { dueLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

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

  return (
    <section className="solid mb-5 overflow-hidden">
      <header className="px-[18px] py-3.5 border-b border-border-orage flex items-center justify-between">
        <div className="font-display text-[13px] tracking-[0.22em] text-gold-400 uppercase">
          MY STARRED · TOP 3
        </div>
        <Link
          href="/tasks"
          className="text-[11px] text-text-muted hover:text-gold-400 transition-colors"
        >
          All Tasks →
        </Link>
      </header>
      {tasks.length === 0 ? (
        <div className="px-[18px] py-8 text-center">
          <p className="text-sm text-text-secondary leading-relaxed mb-1">
            No starred tasks yet.
          </p>
          <p className="text-xs text-text-muted leading-relaxed max-w-[280px] mx-auto">
            Star up to three tasks from the tasks page (★ icon) to pin them
            here. Use it as your daily focus list.
          </p>
        </div>
      ) : (
        <ul>
          {tasks.map((t) => {
            const due = dueLabel(t.due)
            return (
              <li
                key={t.id}
                onClick={() => openTaskInTasksPage(t.id)}
                className="grid items-center gap-3 px-[18px] py-3 border-b border-border-orage last:border-b-0 cursor-pointer hover:bg-bg-hover transition-colors"
                style={{ gridTemplateColumns: "20px 1fr 80px 70px" }}
              >
                <span
                  aria-hidden
                  className="text-gold-500 text-[14px] leading-none"
                  title="Starred"
                >
                  ★
                </span>
                <div className="text-[13px] text-text-primary flex items-center gap-2 min-w-0">
                  <ClientDot
                    clientWorkspaceId={t.clientWorkspaceId}
                    options={clientTagOptions}
                    size={7}
                  />
                  <span className="truncate uppercase">{t.title}</span>
                </div>
                <span
                  className={cn(
                    "priority justify-self-start",
                    t.priority === "high" && "priority-high",
                    t.priority === "med" && "priority-med",
                    t.priority === "low" && "priority-low",
                  )}
                >
                  {t.priority.toUpperCase()}
                </span>
                <span
                  className={cn(
                    "text-[11px] font-mono justify-self-end",
                    due.tone === "overdue"
                      ? "text-danger"
                      : due.tone === "urgent"
                        ? "text-warning"
                        : "text-text-muted",
                  )}
                >
                  {due.label || "—"}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
