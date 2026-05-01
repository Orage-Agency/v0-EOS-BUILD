"use client"

import { useRef, useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { getUser, type MockTask } from "@/lib/mock-data"
import { useTasksStore } from "@/lib/tasks-store"
import { useUIStore } from "@/lib/store"
import { OrageAvatar } from "@/components/orage/avatar"
import { AssignPopover } from "./assign-popover"
import { InlineDateEditor } from "./inline-date-editor"
import { RowActionMenu } from "./row-action-menu"
import { dueLabel } from "@/lib/format"
import { canDragTask } from "@/lib/permissions"
import { IcArchive, IcCheck, IcGrip } from "@/components/orage/icons"
import { cn } from "@/lib/utils"
import { toast } from "sonner"


const COLS =
  "30px 24px minmax(0,1fr) 130px 100px 110px 60px 40px"

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return "??"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function TaskRow({ task }: { task: MockTask }) {
  const selected = useTasksStore((s) => s.selected)
  const toggleSelected = useTasksStore((s) => s.toggleSelected)
  const openTask = useTasksStore((s) => s.openTask)
  const toggleStatus = useTasksStore((s) => s.toggleStatus)
  const startHandoff = useTasksStore((s) => s.startHandoff)
  const reassign = useTasksStore((s) => s.reassign)
  const rockOptions = useTasksStore((s) => s.rockOptions)
  const updateDue = useTasksStore((s) => s.updateDue)
  const archiveOne = useTasksStore((s) => s.archiveOne)
  const members = useTasksStore((s) => s.members)

  // Resolve owner: prefer real DB member, fall back to USERS mock for
  // legacy seeded ids. Display nothing if neither matches (better than
  // showing a wrong/random avatar).
  const mockOwner = getUser(task.owner)
  const memberOwner = members.find((m) => m.id === task.owner)
  const owner =
    mockOwner ??
    (memberOwner
      ? {
          id: memberOwner.id,
          name: memberOwner.name,
          initials: memberOwner.initials || deriveInitials(memberOwner.name),
        }
      : null)

  const [assignOpen, setAssignOpen] = useState(false)
  const avatarBtnRef = useRef<HTMLButtonElement>(null)
  const sessionUser = useUIStore((s) => s.currentUser)

  const isSelected = selected.has(task.id)
  const isDone = task.status === "done"
  const due = dueLabel(task.due)
  const rockOpt = task.rockId ? rockOptions.find((r) => r.id === task.rockId) : null
  const rockTag = rockOpt?.tag?.toUpperCase() ?? (task.rockId ? "ROCK" : "—")
  const rockLink = rockOpt ? `↗ ROCK · ${rockOpt.title.toUpperCase()}` : null
  const actor = sessionUser
    ? { id: sessionUser.id, role: sessionUser.role as import("@/types/permissions").Role, isMaster: sessionUser.isMaster }
    : { id: "", role: "member" as import("@/types/permissions").Role, isMaster: false }
  const canDrag = canDragTask(actor, task.owner)

  const sortable = useSortable({ id: task.id, disabled: !canDrag || isDone })
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  }

  function onRowClick(e: React.MouseEvent) {
    if (e.shiftKey) {
      toggleSelected(task.id, { range: true })
      return
    }
    if (e.metaKey || e.ctrlKey) {
      toggleSelected(task.id, { toggle: true })
      return
    }
    openTask(task.id)
  }

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      onClick={onRowClick}
      className={cn(
        "task-row group grid items-center gap-3.5 px-4.5 py-2.5 border-b border-border-orage cursor-pointer transition-colors relative bg-bg-3 hover:bg-bg-4",
        isSelected && "selected",
        sortable.isDragging && "dragging",
        !canDrag && "draggable-locked",
      )}
      data-id={task.id}
    >
      <style jsx>{`
        .task-row {
          grid-template-columns: ${COLS};
          padding-left: 18px;
          padding-right: 18px;
        }
        .task-row.selected {
          background: rgba(182, 128, 57, 0.08);
        }
        .task-row.selected::before {
          content: "";
          position: absolute;
          inset: 0 auto 0 0;
          width: 2px;
          background: var(--gold-500);
        }
      `}</style>

      <button
        type="button"
        aria-label="Drag to reorder"
        {...(canDrag ? sortable.listeners : {})}
        {...sortable.attributes}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "opacity-0 group-hover:opacity-60 text-text-dim flex items-center justify-center",
          canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-not-allowed",
        )}
        disabled={!canDrag}
      >
        <IcGrip className="w-3 h-3" />
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          toggleSelected(task.id, { toggle: true })
        }}
        aria-label={isSelected ? "Unselect" : "Select"}
        aria-pressed={isSelected}
        className={cn(
          "w-3.5 h-3.5 rounded-sm border-[1.5px] cursor-pointer transition-colors flex items-center justify-center",
          isSelected
            ? "bg-gold-500 border-gold-500"
            : "border-border-strong hover:border-gold-500",
        )}
      >
        {isSelected && <IcCheck className="w-2 h-2 text-text-on-gold" />}
      </button>

      <div
        className={cn(
          "text-[13px] text-text-primary flex items-center gap-2 min-w-0",
          isDone && "line-through text-text-muted",
        )}
      >
        <button
          type="button"
          aria-label={isDone ? "Mark open" : "Mark done"}
          onClick={(e) => {
            e.stopPropagation()
            toggleStatus(task.id)
          }}
          className={cn(
            "shrink-0 w-4 h-4 rounded-sm border-[1.5px] cursor-pointer transition-colors flex items-center justify-center mr-1",
            isDone
              ? "bg-gold-500 border-gold-500"
              : "border-border-strong hover:border-gold-500",
          )}
        >
          {isDone && <IcCheck className="w-2.5 h-2.5 text-text-on-gold" />}
        </button>
        <span className="truncate">{task.title}</span>
        {rockLink && (
          <span className="font-display text-[9px] tracking-[0.15em] text-gold-500 bg-gold-500/10 px-1.5 py-0.5 rounded-sm shrink-0">
            {rockLink}
          </span>
        )}
      </div>

      <span className="font-display text-[9px] tracking-[0.18em] text-gold-500 bg-bg-active px-1.5 py-0.5 rounded-sm justify-self-start">
        {rockTag}
      </span>

      <span
        className={cn(
          "priority justify-self-start",
          task.priority === "high" && "priority-high",
          task.priority === "med" && "priority-med",
          task.priority === "low" && "priority-low",
          isDone && "invisible",
        )}
      >
        {task.priority.toUpperCase()}
      </span>

      {isDone && task.completed ? (
        <span className="text-[11px] font-mono text-text-muted px-1.5 py-0.5">
          {`DONE ${task.completed.slice(5).replace("-", "/")}`}
        </span>
      ) : (
        <InlineDateEditor
          value={task.due}
          onChange={(next) => {
            updateDue(task.id, next)
            toast(next ? `Due ${next}` : "Due date cleared")
          }}
          className={cn(
            "text-[11px] font-mono",
            due.tone === "overdue"
              ? "text-danger font-semibold"
              : due.tone === "urgent"
                ? "text-warning font-semibold"
                : "text-text-muted",
          )}
          display={due.label || <span className="opacity-60">+ date</span>}
        />
      )}

      <div className="relative">
        {owner && (
          <OrageAvatar
            asButton
            user={owner}
            size="sm"
            title={`Click to reassign · ${owner.name}`}
            onClick={(e) => {
              e.stopPropagation()
              setAssignOpen((v) => !v)
            }}
          />
        )}
        <AssignPopover
          open={assignOpen}
          anchorRef={avatarBtnRef as never}
          currentOwnerId={task.owner}
          onClose={() => setAssignOpen(false)}
          onSelect={(u) => {
            setAssignOpen(false)
            if (u.id === task.owner) return
            startHandoff({
              taskId: task.id,
              fromUserId: task.owner,
              toUserId: u.id,
            })
            // optimistic reassign happens after handoff confirm; if the
            // owner is the same, we fast-path with no modal:
            void reassign
          }}
        />
      </div>

      <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
        <button
          type="button"
          aria-label="Archive task"
          title="Archive (mark cancelled)"
          onClick={(e) => {
            e.stopPropagation()
            archiveOne(task.id)
            toast(`Archived "${task.title}"`)
          }}
          className="w-6 h-6 rounded-sm flex items-center justify-center text-text-muted hover:bg-bg-2 hover:text-gold-400"
        >
          <IcArchive className="w-3 h-3" />
        </button>
        <RowActionMenu task={task} />
      </div>
    </div>
  )
}
