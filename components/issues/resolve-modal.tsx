"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { OrageAvatar } from "@/components/orage/avatar"
import { CURRENT_USER, USERS } from "@/lib/mock-data"
import { useRocksStore } from "@/lib/rocks-store"
import {
  type ResolvePath,
  useIssuesStore,
} from "@/lib/issues-store"
import { resolveIssue } from "@/app/actions/issues"
import { useWorkspaceSlug } from "@/hooks/use-workspace-slug"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { IcArchive, IcCheck, IcRock, IcTask } from "@/components/orage/icons"

const PATHS: {
  path: ResolvePath
  name: string
  description: string
  Icon: React.ComponentType<{ className?: string }>
}[] = [
  { path: "rock", name: "NEW ROCK", description: "90-day commitment", Icon: IcRock },
  { path: "task", name: "TASK", description: "Single action item", Icon: IcTask },
  {
    path: "decision",
    name: "DECISION",
    description: "Record decision",
    Icon: IcCheck,
  },
  {
    path: "archive",
    name: "ARCHIVE",
    description: "Tabled · no longer relevant",
    Icon: IcArchive,
  },
]

const ARCHIVE_REASONS = [
  "Duplicate of another issue",
  "Not actually an issue",
  "No longer relevant",
] as const

export function ResolveModal() {
  const { resolveIssueId, issues, closeResolve, resolveIssue: resolveLocal } = useIssuesStore()
  const issue = issues.find((i) => i.id === resolveIssueId)
  const rocks = useRocksStore((s) => s.rocks)
  const workspaceSlug = useWorkspaceSlug()

  const [path, setPath] = useState<ResolvePath>("rock")
  const [submitting, setSubmitting] = useState(false)

  // Form fields per path
  const [title, setTitle] = useState("")
  const [outcome, setOutcome] = useState("")
  const [ownerId, setOwnerId] = useState(CURRENT_USER.id)
  const [due, setDue] = useState("")
  const [notes, setNotes] = useState("")
  const [parentRockId, setParentRockId] = useState<string>("")
  const [decisionText, setDecisionText] = useState("")
  const [decidedBy, setDecidedBy] = useState(CURRENT_USER.id)
  const [archiveReason, setArchiveReason] = useState<string>(ARCHIVE_REASONS[0])

  useEffect(() => {
    if (!issue) return
    setPath("rock")
    setTitle(issue.title)
    setOutcome("")
    setOwnerId(issue.ownerId)
    setDue("")
    setNotes("")
    setParentRockId(issue.linkedRockId ?? "")
    setDecisionText("")
    setDecidedBy(CURRENT_USER.id)
    setArchiveReason(ARCHIVE_REASONS[0])
  }, [issue])

  if (!issue) return null

  async function submit() {
    if (!issue) return
    setSubmitting(true)
    try {
      let payload: Record<string, unknown> = {}
      let reason: string | undefined
      if (path === "rock") {
        if (!title.trim()) throw new Error("Title required.")
        payload = { title, outcome, ownerId, due, parentRockId }
      } else if (path === "task") {
        if (!title.trim()) throw new Error("Title required.")
        payload = { title, ownerId, due, notes }
      } else if (path === "decision") {
        if (!decisionText.trim()) throw new Error("Decision required.")
        payload = { decision: decisionText, decidedBy, notes }
      } else if (path === "archive") {
        reason = archiveReason
        payload = { reason }
      }

      resolveLocal(issue.id, {
        path,
        payload,
        resolvedBy: CURRENT_USER.name.split(" ")[0],
        resolvedAt: new Date().toISOString(),
        reason,
      })

      await resolveIssue(workspaceSlug, {
        issueId: issue.id,
        path,
        payload,
        reason,
      })

      const map: Record<ResolvePath, string> = {
        rock: "CONVERTED TO ROCK",
        task: "TO-DO CREATED",
        decision: "DECISION RECORDED",
        archive: "ARCHIVED",
        headline: "MARKED HEADLINE",
      }
      toast(map[path])
      closeResolve()
    } catch (err) {
      toast("FAILED", {
        description:
          err instanceof Error ? err.message : "Could not resolve",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={!!resolveIssueId} onOpenChange={(o) => !o && closeResolve()}>
      <DialogContent className="max-w-[640px] glass-strong border-gold-500 p-0 gap-0 overflow-hidden bg-bg-2">
        <DialogHeader className="px-7 pt-6 pb-4 border-b border-border-orage">
          <DialogTitle className="font-display text-[22px] tracking-[0.1em] text-gold-400">
            RESOLVE ISSUE
          </DialogTitle>
          <DialogDescription className="text-[12px] text-text-muted">
            Choose where this issue goes — Rock, Task, Decision, or Archive.
          </DialogDescription>
        </DialogHeader>

        <div className="px-7 py-6 max-h-[60vh] overflow-y-auto">
          <p className="text-[13px] text-text-secondary leading-relaxed mb-4 px-3 py-2.5 bg-bg-3 border-l-2 border-gold-500 rounded-r-sm">
            {issue.title}
          </p>

          <div className="grid grid-cols-4 gap-2 mb-5">
            {PATHS.map((p) => (
              <button
                key={p.path}
                type="button"
                onClick={() => setPath(p.path)}
                className={cn(
                  "px-3 py-3 rounded-sm text-left border transition-all",
                  path === p.path
                    ? "bg-bg-4 border-gold-500 shadow-gold"
                    : "bg-bg-3 border-border-orage hover:border-gold-500",
                )}
                aria-pressed={path === p.path}
              >
                <p.Icon className="w-[18px] h-[18px] text-gold-400 mb-1.5" />
                <div className="font-display text-[11px] tracking-[0.18em] text-gold-400 mb-0.5">
                  {p.name}
                </div>
                <div className="text-[10px] text-text-muted leading-snug">
                  {p.description}
                </div>
              </button>
            ))}
          </div>

          {path === "rock" && (
            <div className="flex flex-col gap-3.5">
              <Field label="Rock Title">
                <Input
                  value={title}
                  onChange={(v) => setTitle(v)}
                  placeholder="What's the 90-day commitment?"
                />
              </Field>
              <Field label="Outcome (what does done look like?)">
                <TextArea
                  value={outcome}
                  onChange={(v) => setOutcome(v)}
                  placeholder="Specific, measurable end state…"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3.5">
                <Field label="Owner">
                  <OwnerPicker value={ownerId} onChange={setOwnerId} />
                </Field>
                <Field label="Due (EOQ)">
                  <Input type="date" value={due} onChange={setDue} />
                </Field>
              </div>
              {rocks.length > 0 && (
                <Field label="Parent V/TO Goal (optional)">
                  <Select value={parentRockId} onChange={setParentRockId}>
                    <option value="">— None —</option>
                    {rocks.map((r) => (
                      <option key={r.id} value={r.id}>
                        ↗ {r.title}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>
          )}

          {path === "task" && (
            <div className="flex flex-col gap-3.5">
              <Field label="Task Title">
                <Input value={title} onChange={setTitle} />
              </Field>
              <div className="grid grid-cols-2 gap-3.5">
                <Field label="Owner">
                  <OwnerPicker value={ownerId} onChange={setOwnerId} />
                </Field>
                <Field label="Due">
                  <Input type="date" value={due} onChange={setDue} />
                </Field>
              </div>
              <Field label="Notes (optional)">
                <TextArea
                  value={notes}
                  onChange={setNotes}
                  placeholder="Context for the owner…"
                />
              </Field>
            </div>
          )}

          {path === "decision" && (
            <div className="flex flex-col gap-3.5">
              <Field label="Decision">
                <TextArea
                  value={decisionText}
                  onChange={setDecisionText}
                  placeholder="What did we decide?"
                />
              </Field>
              <Field label="Decided By">
                <OwnerPicker value={decidedBy} onChange={setDecidedBy} />
              </Field>
              <Field label="Follow-up Note (optional)">
                <TextArea
                  value={notes}
                  onChange={setNotes}
                  placeholder="Any context worth keeping…"
                />
              </Field>
            </div>
          )}

          {path === "archive" && (
            <div className="flex flex-col gap-3.5">
              <Field label="Reason">
                <Select value={archiveReason} onChange={setArchiveReason}>
                  {ARCHIVE_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </Field>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Archived issues stay in the audit trail and can be reopened from
                the Tabled queue.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="px-7 py-4 border-t border-border-orage flex-row justify-between sm:justify-between gap-2">
          <Button
            variant="outline"
            onClick={closeResolve}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={submitting}
            className="bg-gradient-to-br from-gold-500 to-gold-400 text-text-on-gold hover:opacity-90"
          >
            {submitting ? "Saving…" : "RESOLVE"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-display text-[10px] tracking-[0.2em] text-gold-500 uppercase">
        {label}
      </span>
      {children}
    </label>
  )
}

function Input({
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="bg-bg-3 border border-border-orage rounded-sm px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-dim outline-none focus-visible:border-gold-500 transition-colors"
    />
  )
}

function TextArea({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="bg-bg-3 border border-border-orage rounded-sm px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-dim outline-none focus-visible:border-gold-500 transition-colors min-h-[80px] resize-y leading-relaxed"
    />
  )
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-bg-3 border border-border-orage rounded-sm px-3 py-2.5 text-[13px] text-text-primary outline-none focus-visible:border-gold-500 transition-colors"
    >
      {children}
    </select>
  )
}

function OwnerPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {USERS.map((u) => {
        const active = u.id === value
        return (
          <button
            key={u.id}
            type="button"
            onClick={() => onChange(u.id)}
            className={cn(
              "px-2 py-1.5 rounded-sm border flex items-center gap-1.5 text-[11px] transition-colors",
              active
                ? "bg-bg-4 border-gold-500 text-gold-400"
                : "bg-bg-3 border-border-orage text-text-secondary hover:border-gold-500",
            )}
            aria-pressed={active}
          >
            <OrageAvatar user={u} size="xs" />
            {u.initials}
          </button>
        )
      })}
    </div>
  )
}
