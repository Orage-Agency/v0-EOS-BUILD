"use client"

import { useEffect, useMemo, useRef } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { IcPlus } from "@/components/orage/icons"
import { useTasksStore } from "@/lib/tasks-store"
import { CURRENT_USER } from "@/lib/mock-data"
import {
  filterTasks,
  isTaskFilter,
  TASK_FILTERS,
  type TaskFilter,
} from "@/lib/tasks-filter"

export function TasksHeader({
  onQuickAddFocus,
  onNewTask,
}: {
  onQuickAddFocus: () => void
  onNewTask: () => void
}) {
  const tasks = useTasksStore((s) => s.tasks)
  const params = useSearchParams()
  const raw = params.get("filter")
  const isNew = params.get("new") === "1"
  const filter: TaskFilter = isTaskFilter(raw) ? raw : "my"
  const router = useRouter()
  const pathname = usePathname()
  const handledNew = useRef(false)

  useEffect(() => {
    if (!isNew || handledNew.current) return
    handledNew.current = true
    // Deep-link `?new=1` opens the full New Task modal so the user
    // immediately gets the high-fidelity capture form.
    onNewTask()
    const next = new URLSearchParams(params)
    next.delete("new")
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [isNew, onNewTask, params, pathname, router])

  const { headline, openCount, todayCount, weekCount } = useMemo(() => {
    const scoped = filterTasks(tasks, filter, CURRENT_USER.id)
    const open = scoped.filter((t) => t.status !== "done").length
    const todayKey = new Date().toISOString().slice(0, 10)
    const today = scoped.filter(
      (t) => t.status !== "done" && t.due === todayKey,
    ).length
    const week = Math.max(open - today, 0)
    const meta = TASK_FILTERS.find((f) => f.id === filter)
    const head = (meta?.label ?? "Tasks").toUpperCase()
    return { headline: head, openCount: open, todayCount: today, weekCount: week }
  }, [tasks, filter])

  return (
    <div className="px-8 pt-6 flex items-start justify-between gap-5 shrink-0">
      <div>
        <h1 className="font-display text-[36px] tracking-[0.08em] text-gold-400 leading-none mb-1 text-balance">
          {headline}
        </h1>
        <p className="text-xs text-text-muted">
          {openCount} open · {todayCount} due today · {weekCount} this week · drag to reorder · drag onto person to reassign
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onQuickAddFocus}
          className="px-3 py-2 bg-bg-3 border border-border-orage text-text-secondary rounded-sm text-xs hover:border-gold-500 hover:text-gold-400 transition-colors"
        >
          Quick Add
        </button>
        <button
          type="button"
          onClick={onNewTask}
          className="px-4 py-2 bg-gradient-to-br from-gold-500 to-gold-400 text-text-on-gold rounded-sm text-xs font-semibold flex items-center gap-1.5 hover:-translate-y-px transition-transform shadow-[0_2px_8px_rgba(182,128,57,0.3)]"
        >
          <IcPlus className="w-3 h-3" />
          New Task
        </button>
      </div>
    </div>
  )
}
