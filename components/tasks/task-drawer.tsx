"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { toast } from "sonner"
import { useTasksStore } from "@/lib/tasks-store"
import { getUser, type TaskPriority, type TaskStatus } from "@/lib/mock-data"
import { OrageAvatar } from "@/components/orage/avatar"
import { IcArchive, IcClose, IcNote } from "@/components/orage/icons"
import { dueLabel } from "@/lib/format"
import { cn } from "@/lib/utils"
import { AssignPopover } from "./assign-popover"
import { InlineDateEditor } from "./inline-date-editor"

const STATUS_LABEL: Record<TaskStatus, string> = {
  open: "OPEN",
  in_progress: "IN PROGRESS",
  done: "DONE",
  cancelled: "CANCELLED",
}

const STATUS_OPTIONS: TaskStatus[] = ["open", "in_progress", "done", "cancelled"]
const PRIORITY_OPTIONS: TaskPriority[] = ["high", "med", "low"]

export function TaskDrawer() {
  const openTaskId = useTasksStore((s) => s.openTaskId)
  const tasks = useTasksStore((s) => s.tasks)
  const handoffs = useTasksStore((s) => s.handoffs)
  const closeTask = useTasksStore((s) => s.closeTask)

  const rockOptions = useTasksStore((s) => s.rockOptions)
  const members = useTasksStore((s) => s.members)
  const updateTitle = useTasksStore((s) => s.updateTitle)
  const updateDescription = useTasksStore((s) => s.updateDescription)
  const updateStatus = useTasksStore((s) => s.updateStatus)
  const updatePriority = useTasksStore((s) => s.updatePriority)
  const updateDue = useTasksStore((s) => s.updateDue)
  const updateRock = useTasksStore((s) => s.updateRock)
  const startHandoff = useTasksStore((s) => s.startHandoff)
  const archiveOne = useTasksStore((s) => s.archiveOne)
  const deleteOne = useTasksStore((s) => s.deleteOne)

  const task = tasks.find((t) => t.id === openTaskId)
  const ownerMock = task ? getUser(task.owner) : null
  const ownerMember = task ? members.find((m) => m.id === task.owner) : null
  const owner =
    ownerMock ??
    (ownerMember
      ? { name: ownerMember.name, initials: ownerMember.initials, color: undefined }
      : null)
  const rock = task?.rockId ? rockOptions.find((r) => r.id === task.rockId) : null
  const taskHandoffs = task ? handoffs.filter((h) => h.taskId === task.id) : []
  const due = task ? dueLabel(task.due) : null
  const open = Boolean(task)

  const [titleDraft, setTitleDraft] = useState("")
  const [descDraft, setDescDraft] = useState("")
  const [statusOpen, setStatusOpen] = useState(false)
  const [priorityOpen, setPriorityOpen] = useState(false)
  const [rockMenuOpen, setRockMenuOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const ownerBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (task) {
      setTitleDraft(task.title)
      setDescDraft(task.description ?? "")
      setStatusOpen(false)
      setPriorityOpen(false)
      setRockMenuOpen(false)
      setAssignOpen(false)
      setConfirmDelete(false)
    }
  }, [task?.id])

  function commitTitle() {
    if (!task) return
    const next = titleDraft.trim()
    if (!next || next === task.title) {
      setTitleDraft(task.title)
      return
    }
    updateTitle(task.id, next)
  }

  function commitDescription() {
    if (!task) return
    if ((task.description ?? "") === descDraft) return
    updateDescription(task.id, descDraft)
  }

  return (
    <AnimatePresence>
      {open && task && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={closeTask}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />
          <motion.aside
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[520px] flex-col border-l border-border-orage bg-bg-2 shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-border-orage px-5 py-3.5">
              <div className="font-mono text-[10px] tracking-[0.12em] text-text-muted">
                TASK DETAIL
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    archiveOne(task.id)
                    toast(`Archived "${task.title}"`)
                    closeTask()
                  }}
                  title="Archive task"
                  className="flex h-7 w-7 items-center justify-center rounded text-text-muted transition-colors hover:bg-bg-3 hover:text-gold-400"
                  aria-label="Archive task"
                >
                  <IcArchive className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!confirmDelete) {
                      setConfirmDelete(true)
                      toast("Click delete again to confirm", { duration: 3500 })
                      setTimeout(() => setConfirmDelete(false), 3500)
                      return
                    }
                    deleteOne(task.id)
                    toast(`Deleted "${task.title}"`)
                  }}
                  title={confirmDelete ? "Click again to confirm" : "Delete task"}
                  className={cn(
                    "flex h-7 px-2 items-center justify-center rounded text-[11px] font-mono tracking-wider transition-colors",
                    confirmDelete
                      ? "bg-danger text-white"
                      : "text-text-muted hover:bg-danger/10 hover:text-danger",
                  )}
                  aria-label="Delete task"
                >
                  {confirmDelete ? "CONFIRM" : "DELETE"}
                </button>
                <button
                  onClick={closeTask}
                  className="flex h-7 w-7 items-center justify-center rounded text-text-muted transition-colors hover:bg-bg-3 hover:text-text-primary"
                  aria-label="Close drawer"
                >
                  <IcClose className="w-3.5 h-3.5" />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    ;(e.target as HTMLInputElement).blur()
                  }
                  if (e.key === "Escape") {
                    setTitleDraft(task.title)
                    ;(e.target as HTMLInputElement).blur()
                  }
                }}
                className="mb-5 w-full bg-transparent font-display text-[28px] leading-tight tracking-wide text-text-primary text-balance outline-none rounded px-1 -mx-1 hover:bg-bg-3/40 focus:bg-bg-3 focus:ring-1 focus:ring-gold-500/40"
                aria-label="Edit task title"
              />

              <dl className="mb-6 grid grid-cols-[110px_1fr] gap-x-4 gap-y-3 text-[12px]">
                <dt className="font-mono text-[10px] tracking-[0.1em] text-text-muted self-center">
                  STATUS
                </dt>
                <dd className="relative">
                  <button
                    type="button"
                    onClick={() => setStatusOpen((v) => !v)}
                    className={cn(
                      "priority hover:ring-1 hover:ring-gold-500/40",
                      task.status === "done" && "bg-success/15 text-success",
                      task.status === "in_progress" && "bg-info/15 text-info",
                      task.status === "open" && "bg-info/15 text-info",
                      task.status === "cancelled" && "bg-bg-3 text-text-muted",
                    )}
                  >
                    {STATUS_LABEL[task.status]}
                  </button>
                  {statusOpen && (
                    <ul
                      className="absolute left-0 top-7 z-30 w-44 rounded-md border border-border-orage bg-bg-2 shadow-orage-lg py-1 text-[12px]"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <li key={s}>
                          <button
                            type="button"
                            onClick={() => {
                              updateStatus(task.id, s)
                              setStatusOpen(false)
                              toast(`Status: ${STATUS_LABEL[s]}`)
                            }}
                            className={cn(
                              "w-full text-left px-3 py-1.5 hover:bg-bg-3",
                              task.status === s ? "text-gold-400" : "text-text-secondary",
                            )}
                          >
                            {STATUS_LABEL[s]}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>

                <dt className="font-mono text-[10px] tracking-[0.1em] text-text-muted self-center">
                  PRIORITY
                </dt>
                <dd className="relative">
                  <button
                    type="button"
                    onClick={() => setPriorityOpen((v) => !v)}
                    className={cn(
                      "priority hover:ring-1 hover:ring-gold-500/40",
                      task.priority === "high" && "priority-high",
                      task.priority === "med" && "priority-med",
                      task.priority === "low" && "priority-low",
                    )}
                  >
                    {task.priority.toUpperCase()}
                  </button>
                  {priorityOpen && (
                    <ul className="absolute left-0 top-7 z-30 w-32 rounded-md border border-border-orage bg-bg-2 shadow-orage-lg py-1 text-[12px]">
                      {PRIORITY_OPTIONS.map((p) => (
                        <li key={p}>
                          <button
                            type="button"
                            onClick={() => {
                              updatePriority(task.id, p)
                              setPriorityOpen(false)
                              toast(`Priority: ${p.toUpperCase()}`)
                            }}
                            className={cn(
                              "w-full text-left px-3 py-1.5 hover:bg-bg-3",
                              task.priority === p ? "text-gold-400" : "text-text-secondary",
                            )}
                          >
                            {p.toUpperCase()}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>

                <dt className="font-mono text-[10px] tracking-[0.1em] text-text-muted self-center">
                  DUE
                </dt>
                <dd
                  className={cn(
                    "font-mono",
                    due?.tone === "overdue"
                      ? "text-danger"
                      : due?.tone === "urgent"
                        ? "text-warning"
                        : "text-text-secondary",
                  )}
                >
                  <InlineDateEditor
                    value={task.due}
                    onChange={(next) => {
                      updateDue(task.id, next)
                      toast(next ? `Due ${next}` : "Due date cleared")
                    }}
                    display={due?.label || <span className="opacity-60">+ set due date</span>}
                  />
                </dd>

                <dt className="font-mono text-[10px] tracking-[0.1em] text-text-muted self-center">
                  OWNER
                </dt>
                <dd className="flex items-center gap-2 text-text-secondary relative">
                  {owner && (
                    <OrageAvatar
                      asButton
                      user={owner}
                      size="xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        setAssignOpen((v) => !v)
                      }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setAssignOpen((v) => !v)}
                    className="hover:text-gold-400"
                  >
                    {owner?.name ?? "Unassigned"}
                  </button>
                  <AssignPopover
                    open={assignOpen}
                    anchorRef={ownerBtnRef as never}
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
                    }}
                  />
                </dd>

                <dt className="font-mono text-[10px] tracking-[0.1em] text-text-muted self-center">
                  LINKED ROCK
                </dt>
                <dd className="relative">
                  <button
                    type="button"
                    onClick={() => setRockMenuOpen((v) => !v)}
                    className="font-display text-[10px] tracking-[0.15em] text-gold-400 bg-gold-500/10 px-2 py-1 rounded-sm hover:bg-gold-500/20"
                  >
                    {rock ? `↗ ${rock.title.toUpperCase()}` : "+ LINK ROCK"}
                  </button>
                  {rockMenuOpen && (
                    <ul className="absolute left-0 top-8 z-30 w-72 rounded-md border border-border-orage bg-bg-2 shadow-orage-lg py-1 text-[12px] max-h-64 overflow-y-auto">
                      <li>
                        <button
                          type="button"
                          onClick={() => {
                            updateRock(task.id, null)
                            setRockMenuOpen(false)
                            toast("Rock unlinked")
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-bg-3 text-text-muted italic"
                        >
                          (no rock)
                        </button>
                      </li>
                      {rockOptions.map((r) => (
                        <li key={r.id}>
                          <button
                            type="button"
                            onClick={() => {
                              updateRock(task.id, r.id)
                              setRockMenuOpen(false)
                              toast(`Linked to ${r.title}`)
                            }}
                            className={cn(
                              "w-full text-left px-3 py-1.5 hover:bg-bg-3",
                              task.rockId === r.id ? "text-gold-400" : "text-text-secondary",
                            )}
                          >
                            {r.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>
              </dl>

              <section className="mb-6">
                <div className="mb-2 font-mono text-[10px] tracking-[0.1em] text-text-muted">
                  DESCRIPTION
                </div>
                <textarea
                  value={descDraft}
                  onChange={(e) => {
                    setDescDraft(e.target.value)
                    updateDescription(task.id, e.target.value)
                  }}
                  onBlur={commitDescription}
                  placeholder="Add a description…"
                  className="w-full min-h-[88px] resize-y rounded-md border border-border-orage bg-bg-3 px-3 py-2 text-[13px] leading-relaxed text-text-primary outline-none transition-colors focus:border-gold-500/50"
                />
              </section>

              {taskHandoffs.length > 0 && (
                <section className="mb-6">
                  <div className="mb-2 font-mono text-[10px] tracking-[0.1em] text-text-muted">
                    HANDOFF HISTORY
                  </div>
                  <div className="flex flex-col gap-2">
                    {taskHandoffs
                      .slice()
                      .reverse()
                      .map((h) => {
                        const fromMock = getUser(h.fromUserId)
                        const toMock = getUser(h.toUserId)
                        const from = fromMock ?? members.find((m) => m.id === h.fromUserId)
                        const to = toMock ?? members.find((m) => m.id === h.toUserId)
                        return (
                          <div
                            key={h.id}
                            className="rounded-md border border-border-orage bg-bg-3 px-3 py-2.5"
                          >
                            <div className="mb-1.5 font-mono text-[10px] tracking-wider text-gold-400">
                              {from?.name.split(" ")[0].toUpperCase()} → {to?.name.split(" ")[0].toUpperCase()} ·{" "}
                              {new Date(h.createdAt).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </div>
                            <div className="text-[12px] leading-relaxed text-text-secondary">
                              {h.context}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </section>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
