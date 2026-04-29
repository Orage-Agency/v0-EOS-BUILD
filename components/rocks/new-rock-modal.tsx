"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useState } from "react"
import { toast } from "sonner"
import { useRocksStore } from "@/lib/rocks-store"
import { USERS } from "@/lib/mock-data"
import { OrageAvatar } from "@/components/orage/avatar"
import { tBase, easeOut, easeSpring } from "@/lib/motion"
import { cn } from "@/lib/utils"

const PARENT_OPTIONS = [
  "↑ 7-Figure Agency · $1.2M ARR",
  "↑ Client Retention · 95%",
  "↑ Product Revenue · $200K from Toolkit",
  "↑ Team Capacity · 2 senior hires",
  "↑ New Client Growth · 12 new clients",
]

const TAGS = ["OFFER", "CLIENT", "VSL", "PARTNER", "INTERNAL", "PRODUCT", "MARKETING"]

export function NewRockModal() {
  const open = useRocksStore((s) => s.newRockOpen)
  const close = useRocksStore((s) => s.closeNewRock)
  const create = useRocksStore((s) => s.createRock)

  const [title, setTitle] = useState("")
  const [outcome, setOutcome] = useState("")
  const [ownerId, setOwnerId] = useState(USERS[0].id)
  const [due, setDue] = useState("2026-06-30")
  const [tag, setTag] = useState(TAGS[0])
  const [parent, setParent] = useState(PARENT_OPTIONS[0])
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setTitle("")
    setOutcome("")
    setOwnerId(USERS[0].id)
    setDue("2026-06-30")
    setTag(TAGS[0])
    setParent(PARENT_OPTIONS[0])
    setError(null)
  }

  function submit() {
    if (!title.trim()) return setError("Title is required.")
    if (!outcome.trim()) return setError("Measurable outcome is required.")
    create({ title: title.trim(), outcome: outcome.trim(), owner: ownerId, due, tag })
    toast("ROCK CREATED · DRAFT")
    close()
    reset()
    void parent
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
            if (e.target === e.currentTarget) {
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
                    {USERS.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setOwnerId(u.id)}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1 rounded-sm border text-[11px] transition-colors",
                          ownerId === u.id
                            ? "bg-gold-500/10 border-gold-500 text-gold-400"
                            : "bg-bg-3 border-border-orage text-text-secondary hover:border-gold-500/50",
                        )}
                      >
                        <OrageAvatar user={u} size="xs" />
                        {u.name.split(" ")[0]}
                      </button>
                    ))}
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
                onClick={() => {
                  close()
                  reset()
                }}
                className="px-3.5 py-1.5 bg-bg-3 border border-border-orage rounded-sm text-xs text-text-secondary hover:border-gold-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                className="px-4 py-1.5 bg-gradient-to-br from-gold-500 to-gold-400 text-text-on-gold rounded-sm text-xs font-semibold"
              >
                Create Rock
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
