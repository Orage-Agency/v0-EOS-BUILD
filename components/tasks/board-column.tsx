"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { cn } from "@/lib/utils"
import { BoardCard } from "./board-card"
import type { MockTask, TaskStatus } from "@/lib/mock-data"

const STATUS_META: Record<TaskStatus, { label: string; mark: string; accent: string }> = {
  open: { label: "OPEN", mark: "○", accent: "text-text-muted" },
  in_progress: { label: "IN PROGRESS", mark: "◐", accent: "text-info" },
  done: { label: "DONE", mark: "✓", accent: "text-success" },
  cancelled: { label: "CANCELLED", mark: "✕", accent: "text-text-muted" },
}

export function BoardColumn({ status, tasks }: { status: TaskStatus; tasks: MockTask[] }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${status}`,
    data: { type: "column", status },
  })

  const meta = STATUS_META[status]

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full min-h-[480px] flex-col rounded-lg border border-border-orage bg-bg-2 transition-all",
        isOver && "drop-zone-active",
      )}
    >
      <header className="flex items-center justify-between border-b border-border-orage px-3.5 py-3">
        <div className={cn("flex items-center gap-2 font-display text-[11px] tracking-[0.18em]", meta.accent)}>
          <span>{meta.mark}</span>
          <span>{meta.label}</span>
          <span className="rounded-sm bg-bg-3 px-1.5 py-0.5 font-mono text-[9px] text-text-muted">
            {tasks.length}
          </span>
        </div>
        <button
          className="flex h-5 w-5 items-center justify-center rounded text-text-muted hover:bg-bg-3 hover:text-gold-400"
          aria-label={`Add task to ${meta.label}`}
        >
          +
        </button>
      </header>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
          {tasks.map((t) => (
            <BoardCard key={t.id} task={t} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
