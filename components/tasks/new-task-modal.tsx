"use client"

/**
 * Orage Core · New Task modal
 *
 * Mirrors the visual language of the New Rock and Drop Issue modals
 * (gold accent border, sharp corners, glass-strong panel, Bebas Neue
 * eyebrow). Persists through the `createTask` server action — on
 * success the optimistic insert appears in the list immediately and a
 * router.refresh() pulls the canonical row back from Supabase.
 */

import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { createTask } from "@/app/actions/tasks"
import { useTasksStore } from "@/lib/tasks-store"
import { tBase, easeOut, easeSpring } from "@/lib/motion"
import { cn } from "@/lib/utils"
import type { TaskPriority } from "@/lib/mock-data"
import type { RockOption, WorkspaceMember } from "@/lib/tasks-server"

const PRIORITIES: { id: TaskPriority; label: string; tone: string }[] = [
  { id: "low", label: "Low", tone: "text-text-secondary" },
  { id: "med", label: "Medium", tone: "text-gold-400" },
  { id: "high", label: "High", tone: "text-warning" },
]

export type CurrentUserCard = {
  id: string
  name: string
  email: string
  avatarUrl: string | null
}

function deriveInitials(name: string, email: string): string {
  const source = name?.trim() || email
  const parts = source.split(/\s+|@/).filter(Boolean)
  if (parts.length === 0) return "??"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export function NewTaskModal({
  workspaceSlug,
  members,
  rocks,
  currentUser,
}: {
  workspaceSlug: string
  members: WorkspaceMember[]
  rocks: RockOption[]
  currentUser: CurrentUserCard
}) {
  const open = useTasksStore((s) => s.newTaskOpen)
  const close = useTasksStore((s) => s.closeNewTask)
  const insert = useTasksStore((s) => s.insertTask)
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [ownerId, setOwnerId] = useState<string>(currentUser.id)
  const [priority, setPriority] = useState<TaskPriority>("med")
  const [due, setDue] = useState<string>("")
  const [rockId, setRockId] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Make sure the current user always appears in the picker list, even if
  // their workspace_membership row is filtered out for any reason.
  const memberPool: WorkspaceMember[] = useMemo(() => {
    const has = members.some((m) => m.id === currentUser.id)
    if (has) return members
    return [
      {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        avatarUrl: currentUser.avatarUrl,
        initials: deriveInitials(currentUser.name, currentUser.email),
        role: "member",
      },
      ...members,
    ]
  }, [members, currentUser])

  // Reset form whenever the modal closes.
  useEffect(() => {
    if (!open) {
      setTitle("")
      setDescription("")
      setOwnerId(currentUser.id)
      setPriority("med")
      setDue("")
      setRockId("")
      setError(null)
    }
  }, [open, currentUser.id])

  function submit() {
    const t = title.trim()
    if (!t) {
      setError("Title is required.")
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await createTask(workspaceSlug, {
        title: t,
        description: description.trim() || undefined,
        ownerId: ownerId || undefined,
        priority,
        due: due || undefined,
        rockId: rockId || undefined,
      })
      if (!res.ok) {
        toast.error(`Could not save task — ${res.error}`)
        setError(res.error)
        return
      }
      insert(res.task)
      toast("TASK CREATED")
      router.refresh()
      close()
    })
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="new-task-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: tBase, ease: easeOut }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !pending) close()
          }}
          className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Create new task"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: tBase, ease: easeSpring }}
            className="glass-strong border-gold-500 rounded-md shadow-orage-lg shadow-gold max-w-[600px] w-full flex flex-col max-h-[90vh]"
          >
            <div className="px-6 pt-5 pb-3.5 border-b border-border-orage">
              <h2 className="font-display text-[20px] tracking-[0.1em] text-gold-400">
                NEW TASK
              </h2>
              <p className="text-xs text-text-muted mt-1">
                Capture a single deliverable. Owner and due date make it
                actionable; linked rock keeps it strategic.
              </p>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
              <Field label="Title" required>
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value)
                    if (error) setError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit()
                  }}
                  placeholder="e.g. Draft the Tier 2 sales page hero"
                  className="w-full px-3 py-2 bg-bg-3 border border-border-orage rounded-sm text-text-primary text-[13px] focus:border-gold-500 outline-none"
                />
              </Field>

              <Field
                label="Description"
                hint="Optional — a sentence of context helps the next person pick it up."
              >
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's the outcome? Any links, files, or constraints?"
                  className="w-full min-h-[72px] resize-y px-3 py-2 bg-bg-3 border border-border-orage rounded-sm text-text-primary text-[13px] focus:border-gold-500 outline-none"
                />
              </Field>

              <Field label="Owner" required>
                {memberPool.length === 0 ? (
                  <div className="text-[11px] text-text-muted italic">
                    No active workspace members found — defaulting to you.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {memberPool.map((m) => {
                      const active = ownerId === m.id
                      const isYou = m.id === currentUser.id
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setOwnerId(m.id)}
                          className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded-sm border text-[11px] transition-colors",
                            active
                              ? "bg-gold-500/10 border-gold-500 text-gold-400"
                              : "bg-bg-3 border-border-orage text-text-secondary hover:border-gold-500/50",
                          )}
                          aria-pressed={active}
                        >
                          <span
                            className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center font-display text-[9px] tracking-[0.05em]",
                              active
                                ? "bg-gold-500/20 text-gold-300"
                                : "bg-bg-base text-text-secondary",
                            )}
                          >
                            {m.initials}
                          </span>
                          {m.name.split(/\s+/)[0] || m.email.split("@")[0]}
                          {isYou && (
                            <span className="text-[9px] tracking-[0.18em] text-text-muted uppercase">
                              You
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Priority">
                  <div className="flex gap-1.5">
                    {PRIORITIES.map((p) => {
                      const active = priority === p.id
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPriority(p.id)}
                          className={cn(
                            "flex-1 px-2 py-1.5 rounded-sm border font-display text-[10px] tracking-[0.18em] uppercase transition-colors",
                            active
                              ? "bg-gold-500/10 border-gold-500 text-gold-400"
                              : "bg-bg-3 border-border-orage text-text-secondary hover:border-gold-500/50",
                          )}
                          aria-pressed={active}
                        >
                          {p.label}
                        </button>
                      )
                    })}
                  </div>
                </Field>

                <Field label="Due Date" hint="Optional">
                  <input
                    type="date"
                    value={due}
                    onChange={(e) => setDue(e.target.value)}
                    className="w-full px-3 py-2 bg-bg-3 border border-border-orage rounded-sm text-text-primary text-[13px] focus:border-gold-500 outline-none"
                  />
                </Field>
              </div>

              <Field
                label="Linked Rock"
                hint={
                  rocks.length === 0
                    ? "No active rocks — add one in /rocks to enable linking."
                    : "Optional — connects this task to a quarterly outcome."
                }
              >
                <select
                  value={rockId}
                  onChange={(e) => setRockId(e.target.value)}
                  disabled={rocks.length === 0}
                  className="w-full px-3 py-2 bg-bg-3 border border-border-orage rounded-sm text-text-primary text-[13px] focus:border-gold-500 outline-none disabled:opacity-60"
                >
                  <option value="">— No linked rock —</option>
                  {rocks.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.quarter} · {r.title}
                    </option>
                  ))}
                </select>
              </Field>

              {error && (
                <div className="text-[11px] text-danger">{error}</div>
              )}
            </div>

            <div className="px-6 pt-3.5 pb-5 border-t border-border-orage flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] text-text-muted tracking-[0.15em] uppercase">
                ⌘ + Return to save
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (pending) return
                    close()
                  }}
                  className="px-3.5 py-1.5 bg-bg-3 border border-border-orage rounded-sm text-xs text-text-secondary hover:border-gold-500"
                  disabled={pending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={pending}
                  className="px-4 py-1.5 bg-gradient-to-br from-gold-500 to-gold-400 text-text-on-gold rounded-sm text-xs font-semibold disabled:opacity-60"
                >
                  {pending ? "Saving…" : "Create Task"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-display text-[10px] tracking-[0.2em] text-gold-500 uppercase">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
      {hint && (
        <span className="text-[10px] text-text-muted italic">{hint}</span>
      )}
    </div>
  )
}
