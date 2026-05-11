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
  updateTaskDescription,
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
  const [openId, setOpenId] = useState<string | null>(null)

  function openCard(id: string) {
    setOpenId(id)
  }

  function closeCard() {
    setOpenId(null)
  }

  // Always render 3 slots so the layout is stable as the user stars
  // their way to a full focus set. Missing slots are dimmed placeholders.
  const slots: (DashboardTask | null)[] = [
    tasks[0] ?? null,
    tasks[1] ?? null,
    tasks[2] ?? null,
  ]

  // Lock body scroll while the fullscreen detail panel is open so the
  // user can't accidentally scroll the dashboard behind it.
  useEffect(() => {
    if (!openId) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [openId])

  const openTask = openId ? tasks.find((t) => t.id === openId) ?? null : null
  const openSlotIdx = openId ? tasks.findIndex((t) => t.id === openId) : -1

  return (
    <>
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
                Tap a card to open full details — edit everything right there.
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
              <CardFront
                key={t.id}
                task={t}
                slotIdx={idx}
                clientTagOptions={clientTagOptions}
                onOpen={() => openCard(t.id)}
              />
            )
          })}
        </div>
      </section>

      {openTask && openSlotIdx >= 0 && (
        <FullscreenDetail
          task={openTask}
          slotIdx={openSlotIdx}
          workspaceSlug={slug}
          onClose={closeCard}
          onRefresh={() => router.refresh()}
        />
      )}
    </>
  )
}

function CardFront({
  task,
  slotIdx,
  clientTagOptions,
  onOpen,
}: {
  task: DashboardTask
  slotIdx: number
  clientTagOptions: ClientTagOption[]
  onOpen: () => void
}) {
  const due = dueLabel(task.due)
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "relative group rounded-md border bg-bg-3 hover:bg-bg-4 transition-colors text-left p-4 min-h-[200px] flex flex-col gap-2.5 active:scale-[0.99]",
        slotIdx === 0
          ? "border-gold-500 shadow-orage-md shadow-gold/30 hover:shadow-gold/50"
          : "border-border-orage hover:border-gold-500/60",
      )}
      aria-label={`${SLOT_LABELS[slotIdx]}: ${task.title}. Tap to open details.`}
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
        OPEN ↻
      </span>
    </button>
  )
}

function FullscreenDetail({
  task,
  slotIdx,
  workspaceSlug,
  onClose,
  onRefresh,
}: {
  task: DashboardTask
  slotIdx: number
  workspaceSlug: string
  onClose: () => void
  onRefresh: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? "")
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [due, setDue] = useState(task.due || "")
  const [stillStarred, setStillStarred] = useState(true)
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const descTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Enter animation: start translated/opacity:0, snap to in-view next frame.
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    setTitle(task.title)
    setDescription(task.description ?? "")
    setStatus(task.status)
    setPriority(task.priority)
    setDue(task.due || "")
  }, [task.id, task.title, task.description, task.status, task.priority, task.due])

  // Escape to close — desktop ergonomics + screen-reader friendly.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [onClose])

  function persistTitle(next: string) {
    if (titleTimer.current) clearTimeout(titleTimer.current)
    titleTimer.current = setTimeout(() => {
      startTransition(async () => {
        const r = await updateTaskTitle(workspaceSlug, task.id, next)
        if (!r.ok) toast.error(`Title: ${r.error ?? "save failed"}`)
        else onRefresh()
      })
    }, 600)
  }
  function persistDescription(next: string) {
    if (descTimer.current) clearTimeout(descTimer.current)
    descTimer.current = setTimeout(() => {
      startTransition(async () => {
        const r = await updateTaskDescription(workspaceSlug, task.id, next)
        if (!r.ok) toast.error(`Description: ${r.error ?? "save failed"}`)
        else onRefresh()
      })
    }, 800)
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
    setStillStarred(false)
    startTransition(async () => {
      const r = await toggleTaskStar(workspaceSlug, task.id)
      if (!r.ok) {
        toast.error(`Star: ${r.error ?? "save failed"}`)
        setStillStarred(true)
      } else {
        toast("Unstarred — slot is open again")
        onRefresh()
        onClose()
      }
    })
  }

  const isDone = status === "done"

  return (
    <div
      className={cn(
        "fixed inset-0 z-[80] flex items-center justify-center p-3 md:p-8 transition-opacity duration-200",
        entered ? "opacity-100" : "opacity-0",
      )}
      role="dialog"
      aria-modal="true"
      aria-label={`Editing ${SLOT_LABELS[slotIdx]} task`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" aria-hidden />

      {/* Panel */}
      <div
        className={cn(
          "relative z-10 w-full max-w-[640px] h-[calc(100dvh-24px)] md:h-auto md:max-h-[88vh] flex flex-col rounded-lg border-2 border-gold-500/80 bg-gradient-to-br from-bg-2 to-bg-3 shadow-orage-lg shadow-gold/30 overflow-hidden transition-transform duration-300 ease-out",
          entered ? "translate-y-0 scale-100" : "translate-y-4 scale-[0.96]",
        )}
      >
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gold-500/30 bg-gold-500/5">
          <div className="flex items-center gap-2 min-w-0">
            <span aria-hidden className="text-gold-300 text-[18px] leading-none shrink-0">
              ★
            </span>
            <span className="font-display text-[11px] tracking-[0.22em] uppercase text-gold-300">
              Editing · {SLOT_LABELS[slotIdx]}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="font-display text-[11px] tracking-[0.18em] uppercase text-text-muted hover:text-gold-400 inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border-orage hover:border-gold-500"
            aria-label="Close details"
          >
            ✕ Close
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
          {/* Title */}
          <Field label="Title">
            <textarea
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                persistTitle(e.target.value)
              }}
              rows={2}
              className="w-full bg-bg-3 border border-border-orage rounded-sm px-3 py-2.5 text-[17px] text-text-primary uppercase font-semibold leading-snug focus:outline-none focus:border-gold-500 resize-none"
              aria-label="Task title"
            />
          </Field>

          {/* Description */}
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                persistDescription(e.target.value)
              }}
              rows={4}
              placeholder="What does done look like? Steps, links, context — anything that helps you focus."
              className="w-full bg-bg-3 border border-border-orage rounded-sm px-3 py-2.5 text-[13px] text-text-primary leading-relaxed focus:outline-none focus:border-gold-500 resize-y min-h-[96px]"
              aria-label="Task description"
            />
          </Field>

          {/* Priority */}
          <Field label="Priority">
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
          </Field>

          {/* Due date */}
          <Field label="Due Date">
            <input
              type="date"
              value={due}
              onChange={(e) => persistDue(e.target.value)}
              className="w-full bg-bg-3 border border-border-orage rounded-sm px-3 py-2.5 text-[14px] font-mono text-text-primary focus:outline-none focus:border-gold-500"
              aria-label="Due date"
            />
          </Field>

          {/* Status */}
          <Field label="Status">
            <div className="grid grid-cols-3 gap-1.5">
              <StatusChip
                label="Open"
                active={status === "open"}
                onClick={() => persistStatus("open")}
                disabled={pending}
              />
              <StatusChip
                label="In Progress"
                active={status === "in_progress"}
                onClick={() => persistStatus("in_progress")}
                disabled={pending}
              />
              <StatusChip
                label="✓ Done"
                tone="success"
                active={isDone}
                onClick={() => persistStatus("done")}
                disabled={pending}
              />
            </div>
          </Field>
        </div>

        <footer className="border-t border-border-orage bg-bg-2/60 px-5 py-3 flex items-center gap-2">
          <button
            type="button"
            onClick={persistStar}
            disabled={pending || !stillStarred}
            className="font-display text-[11px] tracking-[0.18em] uppercase px-3 py-2.5 rounded-sm border border-border-orage text-text-muted hover:border-gold-500 hover:text-gold-400 transition-colors disabled:opacity-40"
            title="Remove from focus"
          >
            ★ Unstar
          </button>
          <Link
            href={`/tasks?task=${task.id}`}
            className="font-display text-[11px] tracking-[0.18em] uppercase px-3 py-2.5 rounded-sm border border-border-orage text-text-muted hover:border-gold-500 hover:text-gold-400 transition-colors"
          >
            Full edit →
          </Link>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="font-display text-[11px] tracking-[0.18em] uppercase px-4 py-2.5 rounded-sm bg-gold-500 hover:bg-gold-400 text-text-on-gold transition-colors"
          >
            Done
          </button>
        </footer>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-display text-[10px] tracking-[0.22em] uppercase text-gold-400">
        {label}
      </span>
      {children}
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
        "priority py-3 text-center transition-all",
        tone,
        active
          ? "ring-2 ring-gold-500 scale-[1.02]"
          : "opacity-60 hover:opacity-100",
      )}
    >
      {label}
    </button>
  )
}

function StatusChip({
  label,
  active,
  onClick,
  tone,
  disabled,
}: {
  label: string
  active: boolean
  onClick: () => void
  tone?: "success"
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "font-display text-[11px] tracking-[0.15em] uppercase py-3 rounded-sm border transition-colors",
        active && tone === "success"
          ? "bg-success/15 border-success text-success"
          : active
            ? "bg-gold-500/15 border-gold-500 text-gold-300"
            : "border-border-orage text-text-muted hover:border-gold-500/60 hover:text-text-primary",
      )}
    >
      {label}
    </button>
  )
}
