"use client"

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { useTasksStore } from "@/lib/tasks-store"
import { TaskRow } from "./task-row"
import { QuickAddRow, type QuickAddHandle } from "./quick-add-row"
import { isToday } from "@/lib/format"
import type { MockTask } from "@/lib/mock-data"
import {
  filterTasks,
  isTaskFilter,
  TASK_FILTERS,
  type TaskFilter,
} from "@/lib/tasks-filter"
import type { SortKey, StatusKey } from "./tasks-toolbar"

const PRIORITY_RANK: Record<string, number> = { high: 0, med: 1, low: 2 }

function applyStatusFilter(tasks: MockTask[], status: StatusKey): MockTask[] {
  if (status === "all") return tasks
  if (status === "open") return tasks.filter((t) => t.status === "open" || t.status === "in_progress")
  if (status === "done") return tasks.filter((t) => t.status === "done")
  if (status === "cancelled") return tasks.filter((t) => t.status === "cancelled")
  return tasks
}

function applySort(tasks: MockTask[], sort: SortKey): MockTask[] {
  const list = tasks.slice()
  switch (sort) {
    case "priority":
      return list.sort((a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9))
    case "due":
      return list.sort((a, b) => {
        const aHas = !!a.due
        const bHas = !!b.due
        if (!aHas && !bHas) return 0
        if (!aHas) return 1
        if (!bHas) return -1
        return a.due.localeCompare(b.due)
      })
    case "title":
      return list.sort((a, b) => a.title.localeCompare(b.title))
    case "created":
    default:
      return list
  }
}

export function TaskListView({
  quickAddRef,
}: {
  quickAddRef: React.RefObject<QuickAddHandle | null>
}) {
  const tasks = useTasksStore((s) => s.tasks)
  const reorder = useTasksStore((s) => s.reorder)
  const currentUserId = useTasksStore((s) => s.currentUserId) ?? ""
  const params = useSearchParams()
  const raw = params.get("filter")
  const filter: TaskFilter = isTaskFilter(raw) ? raw : "my"
  const sort = (params.get("sort") as SortKey) ?? "priority"
  const status = (params.get("status") as StatusKey) ?? "open"

  const filteredTasks = useMemo(() => {
    const scoped = filterTasks(tasks, filter, currentUserId)
    const statused = applyStatusFilter(scoped, status)
    return applySort(statused, sort)
  }, [tasks, filter, currentUserId, sort, status])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const groups = useMemo(() => groupTasks(filteredTasks), [filteredTasks])

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const ids = tasks.map((t) => t.id)
    const oldIndex = ids.indexOf(active.id as string)
    const newIndex = ids.indexOf(over.id as string)
    if (oldIndex < 0 || newIndex < 0) return
    reorder(arrayMove(ids, oldIndex, newIndex))
  }

  const filterMeta = TASK_FILTERS.find((f) => f.id === filter)
  const isEmpty = filteredTasks.length === 0

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div
        className="grid items-center gap-3.5 px-[18px] py-2.5 bg-bg-2 border-b border-border-orage font-display text-[10px] tracking-[0.18em] text-text-muted uppercase shrink-0"
        style={{
          gridTemplateColumns:
            "30px 24px minmax(0,1fr) 130px 100px 110px 60px 40px",
        }}
      >
        <div />
        <div />
        <div>TASK</div>
        <div>LINKED ROCK</div>
        <div>PRIORITY</div>
        <div>DUE</div>
        <div>OWNER</div>
        <div />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={filteredTasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {isEmpty ? (
              <EmptyState filterLabel={filterMeta?.label ?? "tasks"} />
            ) : (
              groups.map((g) => (
                <div key={g.label}>
                  <div className="px-[18px] pt-3.5 pb-2 flex items-center gap-2.5 bg-bg-2 border-b border-border-orage sticky top-0 z-[1]">
                    <span className="font-display text-[11px] tracking-[0.2em] text-gold-400 uppercase">
                      {g.label}
                    </span>
                    <span className="text-[10px] text-text-muted bg-bg-base px-1.5 py-px rounded-sm font-mono">
                      {g.items.length}
                    </span>
                  </div>
                  {g.items.map((t) => (
                    <TaskRow key={t.id} task={t} />
                  ))}
                </div>
              ))
            )}
          </SortableContext>
        </DndContext>

        <QuickAddRow ref={quickAddRef} />
      </div>
    </div>
  )
}

function EmptyState({ filterLabel }: { filterLabel: string }) {
  return (
    <div className="px-8 py-16 text-center">
      <p className="font-display tracking-[0.22em] text-gold-400 text-sm mb-2">
        NO TASKS MATCH
      </p>
      <p className="text-[12px] text-text-muted">
        Nothing in <span className="text-text-primary">{filterLabel}</span> right now.
      </p>
    </div>
  )
}

function groupTasks(tasks: MockTask[]): { label: string; items: MockTask[] }[] {
  const today: MockTask[] = []
  const week: MockTask[] = []
  const done: MockTask[] = []
  for (const t of tasks) {
    if (t.status === "done") {
      done.push(t)
    } else if (isToday(t.due)) {
      today.push(t)
    } else {
      week.push(t)
    }
  }
  const groups: { label: string; items: MockTask[] }[] = []
  if (today.length) groups.push({ label: "TODAY · APR 25", items: today })
  if (week.length) groups.push({ label: "THIS WEEK", items: week })
  if (done.length) groups.push({ label: "COMPLETED", items: done })
  return groups
}
