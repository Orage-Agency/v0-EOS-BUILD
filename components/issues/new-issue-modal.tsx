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
import { useIssuesStore, type IssueSeverity } from "@/lib/issues-store"
import { useRocksStore } from "@/lib/rocks-store"
import { useUIStore } from "@/lib/store"
import { createIssue } from "@/app/actions/issues"
import { useWorkspaceSlug } from "@/hooks/use-workspace-slug"
import { toast } from "sonner"

export function NewIssueModal() {
  const { newIssueOpen, closeNewIssue, createIssue: createLocal } = useIssuesStore()
  const rocks = useRocksStore((s) => s.rocks)
  const workspaceSlug = useWorkspaceSlug()
  const sessionUser = useUIStore((s) => s.currentUser)

  const [title, setTitle] = useState("")
  const [context, setContext] = useState("")
  const [severity, setSeverity] = useState<IssueSeverity>("normal")
  const [linkedRockId, setLinkedRockId] = useState("")
  const [pin, setPin] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!newIssueOpen) return
    setTitle("")
    setContext("")
    setSeverity("normal")
    setLinkedRockId("")
    setPin(false)
  }, [newIssueOpen])

  async function submit() {
    if (!title.trim()) {
      toast("TITLE REQUIRED")
      return
    }
    setBusy(true)
    try {
      createLocal({
        title,
        context,
        severity,
        linkedRockId: linkedRockId || undefined,
        pinnedForL10: pin,
        ownerId: sessionUser?.id ?? "",
        authorLabel: (sessionUser?.name ?? "User").split(" ")[0],
      })
      await createIssue(workspaceSlug, {
        title,
        context,
        severity,
        linkedRockId: linkedRockId || undefined,
        pinnedForL10: pin,
      })
      toast("ISSUE DROPPED")
      closeNewIssue()
    } catch (err) {
      toast("FAILED", {
        description:
          err instanceof Error ? err.message : "Could not create issue",
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={newIssueOpen} onOpenChange={(o) => !o && closeNewIssue()}>
      <DialogContent className="max-w-[520px] glass-strong border-gold-500 p-0 gap-0 overflow-hidden bg-bg-2">
        <DialogHeader className="px-6 pt-5 pb-3.5 border-b border-border-orage">
          <DialogTitle className="font-display text-[22px] tracking-[0.1em] text-gold-400">
            DROP AN ISSUE
          </DialogTitle>
          <DialogDescription className="text-[12px] text-text-muted">
            Anyone, anything. Don&apos;t filter — just drop. We sort in L10.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 flex flex-col gap-3.5 max-h-[70vh] overflow-y-auto">
          <Field label="Issue (one line)" required>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's blocking, broken, or worth surfacing?"
              autoFocus
              className="bg-bg-3 border border-border-orage rounded-sm px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-dim outline-none focus-visible:border-gold-500 transition-colors"
            />
            <p className="text-[10px] text-text-muted italic mt-1">
              Examples: &quot;Stripe spec is incomplete&quot; · &quot;OKC list quality is poor&quot;
            </p>
          </Field>

          <Field label="Context (optional)">
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="More detail · what you've already tried · why it matters now…"
              className="bg-bg-3 border border-border-orage rounded-sm px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-dim outline-none focus-visible:border-gold-500 transition-colors min-h-[70px] resize-y leading-relaxed"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3.5">
            <Field label="Severity">
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as IssueSeverity)}
                className="bg-bg-3 border border-border-orage rounded-sm px-3 py-2.5 text-[13px] text-text-primary outline-none focus-visible:border-gold-500 transition-colors"
              >
                <option value="normal">Normal</option>
                <option value="low">Low</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </Field>
            <Field label="Linked Rock (optional)">
              <select
                value={linkedRockId}
                onChange={(e) => setLinkedRockId(e.target.value)}
                className="bg-bg-3 border border-border-orage rounded-sm px-3 py-2.5 text-[13px] text-text-primary outline-none focus-visible:border-gold-500 transition-colors"
              >
                <option value="">— None —</option>
                {rocks.map((r) => (
                  <option key={r.id} value={r.id}>
                    ↗ {r.title}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Pin for next L10?">
            <label className="flex items-center gap-2 text-[12px] text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={pin}
                onChange={(e) => setPin(e.target.checked)}
                className="w-4 h-4 accent-[var(--gold-500)]"
              />
              Yes — surface in this Monday&apos;s leadership meeting
            </label>
          </Field>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border-orage flex-row justify-end sm:justify-end gap-2">
          <Button variant="outline" onClick={closeNewIssue} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={busy}
            className="bg-gradient-to-br from-gold-500 to-gold-400 text-text-on-gold hover:opacity-90"
          >
            {busy ? "Dropping…" : "Drop Issue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-display text-[10px] tracking-[0.2em] text-gold-500 uppercase">
        {label}
        {required ? <span className="text-danger ml-0.5">*</span> : null}
      </span>
      {children}
    </label>
  )
}
