"use client"

import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { useTasksStore } from "@/lib/tasks-store"
import type { MockTask, TaskStatus } from "@/lib/mock-data"
import { BoardColumn } from "./board-column"
import { BoardCard } from "./board-card"

const COLUMNS: TaskStatus[] = ["open", "in_progress", "done"]
const STATUS_LABEL: Record<TaskStatus, string> = {
  open: "OPEN",
  in_progress: "IN PROGRESS",
  done: "DONE",
  cancelled: "CANCELLED",
}

export function BoardView() {
  const tasks = useTasksStore((s) => s.tasks)
  const updateStatus = useTasksStore((s) => s.updateStatus)
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const grouped = useMemo(() => {
    const map: Record<TaskStatus, MockTask[]> = {
      open: [],
      in_progress: [],
      done: [],
      cancelled: [],
    }
    for (const t of tasks) map[t.status].push(t)
    return map
  }, [tasks])

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const overData = over.data.current as { type?: string; status?: TaskStatus; task?: MockTask } | undefined
    const dragged = tasks.find((t) => t.id === active.id)
    if (!dragged) return

    let targetStatus: TaskStatus | undefined
    if (overData?.type === "column") targetStatus = overData.status
    else if (overData?.type === "task" && overData.task) targetStatus = overData.task.status

    if (targetStatus && targetStatus !== dragged.status) {
      updateStatus(dragged.id, targetStatus)
      toast(`MOVED TO ${STATUS_LABEL[targetStatus]}`)
    }
  }

  return (
    <div className="px-8">
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-3">
          {COLUMNS.map((status) => (
            <BoardColumn key={status} status={status} tasks={grouped[status]} />
          ))}
        </div>
        <DragOverlay>{activeTask ? <BoardCard task={activeTask} /> : null}</DragOverlay>
      </DndContext>
    </div>
  )
}
