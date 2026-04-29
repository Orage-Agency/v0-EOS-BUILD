"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useRocksStore } from "@/lib/rocks-store"
import { createRock } from "@/app/actions/rocks"
import { tBase, easeOut, easeSpring } from "@/lib/motion"
import { cn } from "@/lib/utils"
import type { WorkspaceMember } from "@/lib/tasks-server"

function deriveInitials(name: string, email: string): string {
  const source = name?.trim() || email
  const parts = source.split(/\s+|@/).filter(Boolean)
  if (parts.length === 0) return "??"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

const TAGS = ["OFFER", "CLIENT", "VSL", "PARTNER", "INTERNAL", "PRODUCT", "MARKETING"]

const PARENT_OPTIONS = [
  "↑ 7-Figure Agency · $1.2M ARR",
  "↑ Client Retention · 95%",
  "↑ Product Revenue · $200K from Toolkit",
  "↑ Team Capacity · 2 senior hires",
  "↑ New Client Growth · 12 new clients",
]

type RocksCurrentUser = {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  role: string
  isMaster: boolean
}

export function NewRockModal({
  workspaceSlug,
  members,
  currentUser,
}: {
  workspaceSlug: string
  members: WorkspaceMember[]
  currentUser: RocksCurrentUser
}) {
  const open = useRocksStore((s) => s.newRockOpen)
  const close = useRocksStore((s) => s.closeNewRock)
  const insertRock = useRocksStore((s) => s.insertRock)
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [outcome, setOutcome] = useState("")
  const [ownerId, setOwnerId] = useState(currentUser.id)
  const [due, setDue] = useState("2026-06-30")
  const [tag, setTag] = useState(TAGS[0])
  const [parent, setParent] = useState(PARENT_OPTIONS[0])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Ensure current user always appears in the picker
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
        role: currentUser.role,
      },
      ...members,
    ]
  }, [members, currentUser])

  function reset() {
    setTitle("")
    setOutcome("")
    setOwnerId(currentUser.id)
    setDue("2026-06-30")
    setTag(TAGS[0])
    setParent(PARENT_OPTIONS[0])
    setError(null)
  }

  function submit() {
    const t = title.trim()
    if (!t) return setError("Title is required.")
    if (!outcome.trim()) return setError("Measurable outcome is required.")
    setError(null)
    startTransition(async () => {
      const res = await createRock(workspaceSlug, {
        title: t,
        outcome: outcome.trim(),
        ownerId,
        due,
        tag,
      })
      if (!res.ok) {
        toast.error(`Could not save rock — ${res.error}`)
        setError(res.error)
        return
      }
      insertRock(res.rock)
      toast("ROCK CREATED")
      router.refresh()
      close()
      reset()
      void parent
    })
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: tBase, ease: easeOut }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !pending) {
              close()
              reset()
            }
          }}
          className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Create new rock"
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
                NEW QUARTERLY ROCK
              </h2>
              <p className="text-xs text-text-muted mt-1">
                A 90-day commitment. S.M.A.R.T. outcome required.
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
                  placeholder="e.g. Launch Toolkit T1 · public, paid"
                  className="w-full px-3 py-2 bg-bg-3 border border-border-orage rounded-sm text-text-primary text-[13px] focus:border-gold-500 outline-none"
                />
              </Field>

              <Field label="Measurable Outcome" required hint='Bad: "Improve the offer." · Good: "Tier 2 sales page live with 3+ paying customers by Jun 30."'>
                <textarea
                  value={outcome}
                  onChange={(e) => {
                    setOutcome(e.target.value)
                    if (error) setError(null)
                  }}
                  placeholder="What does 'done' look like? Specific. Measurable. Time-bound."
                  className="w-full min-h-[80px] resize-y px-3 py-2 bg-bg-3 border border-border-orage rounded-sm text-text-primary text-[13px] focus:border-gold-500 outline-none"
                />
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Owner" required>
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
                        >
                          <span
                            className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center font-display text-[9px] tracking-[0.05em] shrink-0",
                              active ? "bg-gold-500/20 text-gold-300" : "bg-bg-active text-text-muted",
                            )}
                          >
                            {m.initials}
                          </span>
                          {m.name.split(" ")[0]}
                          {isYou && <span className="text-[9px] opacity-60">(you)</span>}
                        </button>
                      )
                    })}
                  </div>
                </Field>

                <Field label="Due Date" hint="Locked to end of Q2">
                  <input
                    type="date"
                    value={due}
                    onChange={(e) => setDue(e.target.value)}
                    className="w-full px-3 py-2 bg-bg-3 border border-border-orage rounded-sm text-text-primary text-[13px] focus:border-gold-500 outline-none"
                  />
                </Field>
              </div>

              <Field label="Tag">
                <div className="flex flex-wrap gap-1.5">
                  {TAGS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTag(t)}
                      className={cn(
                        "px-2 py-1 rounded-sm border font-display text-[10px] tracking-[0.15em] transition-colors",
                        tag === t
                          ? "bg-gold-500/10 border-gold-500 text-gold-400"
                          : "bg-bg-3 border-border-orage text-text-secondary hover:border-gold-500/50",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Parent 1-Year Goal (V/TO)">
                <select
                  value={parent}
                  onChange={(e) => setParent(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-3 border border-border-orage rounded-sm text-text-primary text-[13px] focus:border-gold-500 outline-none"
                >
                  {PARENT_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>

              {error && <div className="text-[11px] text-danger">{error}</div>}
            </div>

            <div className="px-6 pt-3.5 pb-5 border-t border-border-orage flex justify-end gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  close()
                  reset()
                }}
                className="px-3.5 py-1.5 bg-bg-3 border border-border-orage rounded-sm text-xs text-text-secondary hover:border-gold-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending}
                className="px-4 py-1.5 bg-gradient-to-br from-gold-500 to-gold-400 text-text-on-gold rounded-sm text-xs font-semibold disabled:opacity-50"
              >
                {pending ? "Creating…" : "Create Rock"}
              </button>
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
      {hint && <span className="text-[10px] text-text-muted italic">{hint}</span>}
    </div>
  )
}
