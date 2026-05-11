"use client"

import { useRouter, useParams } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import { TenantLink as Link } from "@/components/tenant-link"
import type { DashboardTask } from "@/lib/dashboard"
import type { ClientTagOption } from "@/lib/client-tags"
import { ClientDot } from "@/components/tasks/client-tag-picker"
import { dueLabel } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  updateTaskStatus,
  updateTaskTitle,
  updateTaskPriority,
  updateTaskDueDate,
  toggleTaskStar,
} from "@/app/actions/tasks"
import type { TaskPriority, TaskStatus } from "@/lib/mock-data"
import { toast } from "sonner"

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
  const [flipped, setFlipped] = useState<Set<string>>(new Set())

  function toggleFlip(id: string) {
    setFlipped((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
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
              Tap a card to flip it — edit right there, no jumping pages.
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
                className="rounded-md border border-dashed border-border-orage bg-bg-3/40 px-5 py-7 flex flex-col items-center justify-center text-center min-h-[200px]"
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
          return (
            <FlipCard
              key={t.id}
              task={t}
              slotIdx={idx}
              clientTagOptions={clientTagOptions}
              flipped={flipped.has(t.id)}
              onFlip={() => toggleFlip(t.id)}
              onRefresh={() => router.refresh()}
              workspaceSlug={slug}
            />
          )
        })}
      </div>
    </section>
  )
}

function FlipCard({
  task,
  slotIdx,
  clientTagOptions,
  flipped,
  onFlip,
  onRefresh,
  workspaceSlug,
}: {
  task: DashboardTask
  slotIdx: number
  clientTagOptions: ClientTagOption[]
  flipped: boolean
  onFlip: () => void
  onRefresh: () => void
  workspaceSlug: string
}) {
  return (
    <div
      className="relative min-h-[200px]"
      style={{ perspective: "1200px" }}
    >
      <div
        className={cn(
          "relative w-full h-full transition-transform duration-500 ease-out",
        )}
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        <CardFront
          task={task}
          slotIdx={slotIdx}
          clientTagOptions={clientTagOptions}
          onFlip={onFlip}
        />
        <CardBack
          task={task}
          slotIdx={slotIdx}
          onFlip={onFlip}
          onRefresh={onRefresh}
          workspaceSlug={workspaceSlug}
        />
      </div>
    </div>
  )
}

function CardFront({
  task,
  slotIdx,
  clientTagOptions,
  onFlip,
}: {
  task: DashboardTask
  slotIdx: number
  clientTagOptions: ClientTagOption[]
  onFlip: () => void
}) {
  const due = dueLabel(task.due)
  return (
    <button
      type="button"
      onClick={onFlip}
      className={cn(
        "absolute inset-0 group rounded-md border bg-bg-3 hover:bg-bg-4 transition-colors text-left p-4 min-h-[200px] flex flex-col gap-2.5",
        slotIdx === 0
          ? "border-gold-500 shadow-orage-md shadow-gold/30 hover:shadow-gold/50"
          : "border-border-orage hover:border-gold-500/60",
      )}
      style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
      aria-label={`${SLOT_LABELS[slotIdx]}: ${task.title}. Tap to flip and edit.`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            aria-hidden
            className={cn(
              "text-[14px] leading-none shrink-0",
              slotIdx === 0 ? "text-gold-300" : "text-gold-400",
            )}
          >
            ★
          </span>
          <span className="font-display text-[9px] tracking-[0.2em] uppercase text-gold-400">
            {SLOT_LABELS[slotIdx]}
          </span>
        </div>
        <ClientDot
          clientWorkspaceId={task.clientWorkspaceId}
          options={clientTagOptions}
          size={8}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "uppercase leading-snug text-text-primary line-clamp-3",
            slotIdx === 0
              ? "text-[17px] font-semibold tracking-[0.02em]"
              : "text-[14px] font-medium",
          )}
        >
          {task.title}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border-orage/50">
        <span
          className={cn(
            "priority",
            task.priority === "high" && "priority-high",
            task.priority === "med" && "priority-med",
            task.priority === "low" && "priority-low",
          )}
        >
          {task.priority.toUpperCase()}
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
        className="absolute top-3 right-3 text-text-dim group-hover:text-gold-400 text-[10px] opacity-60 group-hover:opacity-100 transition-opacity"
      >
        TAP TO FLIP ↻
      </span>
    </button>
  )
}

function CardBack({
  task,
  slotIdx,
  onFlip,
  onRefresh,
  workspaceSlug,
}: {
  task: DashboardTask
  slotIdx: number
  onFlip: () => void
  onRefresh: () => void
  workspaceSlug: string
}) {
  const [pending, startTransition] = useTransition()
  const [title, setTitle] = useState(task.title)
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [due, setDue] = useState(task.due || "")
  const [starred, setStarred] = useState(true)
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync from props when the upstream task changes (e.g., after router.refresh()).
  useEffect(() => {
    setTitle(task.title)
    setStatus(task.status)
    setPriority(task.priority)
    setDue(task.due || "")
  }, [task.id, task.title, task.status, task.priority, task.due])

  function persistTitle(next: string) {
    if (titleTimerRef.current) clearTimeout(titleTimerRef.current)
    titleTimerRef.current = setTimeout(() => {
      startTransition(async () => {
        const r = await updateTaskTitle(workspaceSlug, task.id, next)
        if (!r.ok) toast.error(`Title: ${r.error ?? "save failed"}`)
        else onRefresh()
      })
    }, 600)
  }

  function persistStatus(next: TaskStatus) {
    setStatus(next)
    startTransition(async () => {
      const r = await updateTaskStatus(workspaceSlug, task.id, next)
      if (!r.ok) {
        toast.error(`Status: ${r.error ?? "save failed"}`)
        setStatus(task.status)
      } else {
        onRefresh()
      }
    })
  }

  function persistPriority(next: TaskPriority) {
    setPriority(next)
    startTransition(async () => {
      const r = await updateTaskPriority(workspaceSlug, task.id, next)
      if (!r.ok) {
        toast.error(`Priority: ${r.error ?? "save failed"}`)
        setPriority(task.priority)
      } else {
        onRefresh()
      }
    })
  }

  function persistDue(next: string) {
    setDue(next)
    startTransition(async () => {
      const r = await updateTaskDueDate(workspaceSlug, task.id, next)
      if (!r.ok) {
        toast.error(`Due date: ${r.error ?? "save failed"}`)
        setDue(task.due || "")
      } else {
        onRefresh()
      }
    })
  }

  function persistStar() {
    setStarred(false)
    startTransition(async () => {
      const r = await toggleTaskStar(workspaceSlug, task.id)
      if (!r.ok) {
        toast.error(`Star: ${r.error ?? "save failed"}`)
        setStarred(true)
      } else {
        toast("UNSTARRED")
        onRefresh()
      }
    })
  }

  const isDone = status === "done"

  return (
    <div
      className={cn(
        "absolute inset-0 rounded-md border bg-bg-2 p-4 min-h-[200px] flex flex-col gap-3 overflow-y-auto",
        slotIdx === 0 ? "border-gold-500" : "border-gold-500/60",
      )}
      style={{
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: "rotateY(180deg)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onFlip}
          className="font-display text-[10px] tracking-[0.18em] uppercase text-text-muted hover:text-gold-400 inline-flex items-center gap-1"
        >
          ← Flip back
        </button>
        <span className="font-display text-[9px] tracking-[0.2em] uppercase text-gold-400">
          Editing · {SLOT_LABELS[slotIdx]}
        </span>
      </div>

      <textarea
        value={title}
        onChange={(e) => {
          setTitle(e.target.value)
          persistTitle(e.target.value)
        }}
        rows={2}
        className="w-full bg-bg-3 border border-border-orage rounded-sm px-2.5 py-2 text-[13px] text-text-primary uppercase font-semibold leading-snug focus:outline-none focus:border-gold-500 resize-none"
        aria-label="Task title"
      />

      <div className="grid grid-cols-3 gap-1.5">
        <PriorityChip
          label="HIGH"
          tone="priority-high"
          active={priority === "high"}
          onClick={() => persistPriority("high")}
          disabled={pending}
        />
        <PriorityChip
          label="MED"
          tone="priority-med"
          active={priority === "med"}
          onClick={() => persistPriority("med")}
          disabled={pending}
        />
        <PriorityChip
          label="LOW"
          tone="priority-low"
          active={priority === "low"}
          onClick={() => persistPriority("low")}
          disabled={pending}
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="font-display text-[9px] tracking-[0.18em] uppercase text-text-muted shrink-0">
          Due
        </label>
        <input
          type="date"
          value={due}
          onChange={(e) => persistDue(e.target.value)}
          className="flex-1 bg-bg-3 border border-border-orage rounded-sm px-2 py-1.5 text-[12px] font-mono text-text-primary focus:outline-none focus:border-gold-500"
          aria-label="Due date"
        />
      </div>

      <div className="flex items-center gap-2 mt-auto">
        <button
          type="button"
          onClick={() => persistStatus(isDone ? "open" : "done")}
          disabled={pending}
          className={cn(
            "flex-1 font-display text-[10px] tracking-[0.18em] uppercase px-3 py-2 rounded-sm border transition-colors",
            isDone
              ? "bg-success/10 border-success/60 text-success"
              : "border-border-orage text-text-muted hover:border-gold-500 hover:text-gold-400",
          )}
        >
          {isDone ? "✓ Done" : "Mark done"}
        </button>
        <button
          type="button"
          onClick={persistStar}
          disabled={pending || !starred}
          className="font-display text-[10px] tracking-[0.18em] uppercase px-3 py-2 rounded-sm border border-border-orage text-text-muted hover:border-gold-500 hover:text-gold-400 transition-colors"
          title="Remove from focus"
        >
          ★ Unstar
        </button>
      </div>
    </div>
  )
}

function PriorityChip({
  label,
  tone,
  active,
  onClick,
  disabled,
}: {
  label: string
  tone: string
  active: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "priority text-center transition-all",
        tone,
        active ? "ring-1 ring-gold-500 scale-[1.02]" : "opacity-60 hover:opacity-100",
      )}
    >
      {label}
    </button>
  )
}
