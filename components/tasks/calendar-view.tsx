"use client"

import { useMemo, useState } from "react"
import { DndContext, PointerSensor, useDroppable, useDraggable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { toast } from "sonner"
import { useTasksStore } from "@/lib/tasks-store"
import type { MockTask } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function buildMonth(year: number, monthIdx: number) {
  const first = new Date(year, monthIdx, 1)
  const startDow = first.getDay()
  const start = new Date(year, monthIdx, 1 - startDow)
  const cells: { date: Date; otherMonth: boolean }[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    cells.push({ date: d, otherMonth: d.getMonth() !== monthIdx })
  }
  return cells
}

function CalTask({ task }: { task: MockTask }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  })
  const openTask = useTasksStore((s) => s.openTask)

  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => openTask(task.id)}
      className={cn(
        "block w-full truncate rounded-sm border-l-2 px-1.5 py-1 text-left text-[10px] font-medium transition-all",
        "hover:translate-x-0.5",
        task.priority === "high"
          ? "border-l-danger bg-danger/15 text-danger"
          : task.priority === "med"
            ? "border-l-warning bg-warning/15 text-warning"
            : "border-l-text-muted bg-bg-3 text-text-secondary",
        task.status === "done" && "line-through opacity-50",
        isDragging && "opacity-30",
      )}
    >
      {task.title}
    </button>
  )
}

function CalDay({
  date,
  otherMonth,
  isToday,
  tasks,
}: {
  date: Date
  otherMonth: boolean
  isToday: boolean
  tasks: MockTask[]
}) {
  const id = ymd(date)
  const { setNodeRef, isOver } = useDroppable({ id, data: { date: id } })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[96px] flex-col gap-1 rounded-md border border-border-orage bg-bg-2 p-1.5 transition-all",
        otherMonth && "opacity-30",
        isToday && "border-gold-500/60 bg-bg-active",
        isOver && "drop-zone-active",
      )}
    >
      <div
        className={cn(
          "mb-0.5 font-mono text-[10px]",
          isToday ? "font-bold text-gold-400" : "text-text-muted",
        )}
      >
        {date.getDate()}
      </div>
      <div className="flex flex-col gap-0.5">
        {tasks.map((t) => (
          <CalTask key={t.id} task={t} />
        ))}
      </div>
    </div>
  )
}

export function CalendarView() {
  const tasks = useTasksStore((s) => s.tasks)
  const updateDue = useTasksStore((s) => s.updateDue)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const today = new Date(2026, 3, 25) // April 25, 2026 — locked to mock
  const [cursor, setCursor] = useState({ year: 2026, month: 3 })

  const cells = useMemo(() => buildMonth(cursor.year, cursor.month), [cursor])
  const tasksByDate = useMemo(() => {
    const map = new Map<string, MockTask[]>()
    for (const t of tasks) {
      const key = t.due
      const arr = map.get(key) ?? []
      arr.push(t)
      map.set(key, arr)
    }
    return map
  }, [tasks])

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over) return
    const newDate = String(over.id)
    updateDue(String(active.id), newDate)
    toast(`MOVED TO ${newDate}`)
  }

  const monthLabel = new Date(cursor.year, cursor.month, 1)
    .toLocaleString("en-US", { month: "long", year: "numeric" })
    .toUpperCase()

  return (
    <div className="px-8">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="font-display text-2xl tracking-[0.1em] text-gold-400">{monthLabel}</h2>
          <div className="flex gap-1.5">
            <button
              onClick={() => setCursor((c) => ({ year: c.month === 0 ? c.year - 1 : c.year, month: c.month === 0 ? 11 : c.month - 1 }))}
              className="px-3 py-1 bg-bg-3 border border-border-orage rounded-sm text-[11px] text-text-secondary hover:border-gold-500 hover:text-gold-400"
            >
              ‹ Prev
            </button>
            <button
              onClick={() => setCursor({ year: 2026, month: 3 })}
              className="px-3 py-1 bg-bg-3 border border-border-orage rounded-sm text-[11px] text-text-secondary hover:border-gold-500 hover:text-gold-400"
            >
              Today
            </button>
            <button
              onClick={() => setCursor((c) => ({ year: c.month === 11 ? c.year + 1 : c.year, month: c.month === 11 ? 0 : c.month + 1 }))}
              className="px-3 py-1 bg-bg-3 border border-border-orage rounded-sm text-[11px] text-text-secondary hover:border-gold-500 hover:text-gold-400"
            >
              Next ›
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {DOW.map((d) => (
            <div key={d} className="py-1.5 text-center font-mono text-[10px] tracking-[0.1em] text-text-muted">
              {d}
            </div>
          ))}
          {cells.map((c, i) => {
            const key = ymd(c.date)
            return (
              <CalDay
                key={i}
                date={c.date}
                otherMonth={c.otherMonth}
                isToday={c.date.toDateString() === today.toDateString()}
                tasks={tasksByDate.get(key) ?? []}
              />
            )
          })}
        </div>
      </DndContext>
    </div>
  )
}
