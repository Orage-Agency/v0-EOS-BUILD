"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import { OrageAvatar } from "@/components/orage/avatar"
import { useTasksStore } from "@/lib/tasks-store"
import { getUser, type MockTask } from "@/lib/mock-data"
import { dueLabel } from "@/lib/format"

const ROCK_TAG: Record<string, string> = {
  r1: "OFFER",
  r2: "CLIENT",
  r3: "VSL",
  r4: "OFFER",
  r5: "INTERNAL",
  r6: "PRODUCT",
  r7: "MARKETING",
}

export function BoardCard({ task }: { task: MockTask }) {
  const openTask = useTasksStore((s) => s.openTask)
  const owner = getUser(task.owner)
  const isDone = task.status === "done"
  const tag = task.rockId ? ROCK_TAG[task.rockId] : "TASK"
  const due = dueLabel(task.due)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task", task },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : isDone ? 0.6 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => openTask(task.id)}
      className={cn(
        "group cursor-grab active:cursor-grabbing rounded-md border border-border-orage bg-bg-3 p-3",
        "transition-all hover:border-gold-500/40 hover:bg-bg-4",
        isDragging && "dragging",
      )}
      data-id={task.id}
    >
      <div className="mb-2 flex items-center gap-1.5">
        <span className="font-display text-[9px] tracking-[0.18em] text-gold-500 bg-gold-500/10 px-1.5 py-0.5 rounded-sm">
          {tag}
        </span>
        {!isDone && task.priority !== "low" && (
          <span
            className={cn(
              "priority",
              task.priority === "high" && "priority-high",
              task.priority === "med" && "priority-med",
            )}
          >
            {task.priority.toUpperCase()}
          </span>
        )}
      </div>
      <div
        className={cn(
          "mb-2.5 text-[13px] leading-snug text-text-primary",
          isDone && "line-through text-text-muted",
        )}
      >
        {task.title}
      </div>
      <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
        <span>{isDone && task.completed ? `Done ${task.completed.slice(5)}` : `↗ ${due.label}`}</span>
        {owner && <OrageAvatar user={owner} size="xs" />}
      </div>
    </div>
  )
}
