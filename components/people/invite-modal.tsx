"use client"

import { useEffect, useState } from "react"
import { usePeopleStore } from "@/lib/people-store"
import { USERS } from "@/lib/mock-data"
import { IcClose } from "@/components/orage/icons"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { sendWorkspaceInvite, generateInviteLink } from "@/app/actions/people"
import { useWorkspaceSlug } from "@/hooks/use-workspace-slug"

type Role = "founder" | "admin" | "leader" | "member" | "viewer" | "field"

const ROLES: {
  value: Role
  label: string
  caps: string[]
}[] = [
  {
    value: "leader",
    label: "Leader",
    caps: ["Owns Rocks", "Drops Issues", "Runs L10s for owned teams"],
  },
  {
    value: "member",
    label: "Member",
    caps: ["Owns Tasks", "Drops Issues", "Updates Scorecard"],
  },
  {
    value: "admin",
    label: "Admin",
    caps: ["Manages people, billing, integrations", "Cannot edit VTO"],
  },
  {
    value: "viewer",
    label: "Viewer",
    caps: ["Read-only access to assigned modules"],
  },
  {
    value: "field",
    label: "Field",
    caps: ["Mobile-first task execution", "No L10 access"],
  },
]

export function InviteModal() {
  const open = usePeopleStore((s) => s.inviteOpen)
  const close = usePeopleStore((s) => s.closeInvite)
  const role = usePeopleStore((s) => s.selectedRole)
  const setRole = usePeopleStore((s) => s.setInviteRole)
  const workspaceSlug = useWorkspaceSlug()

  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [reportsToId, setReportsToId] = useState("")
  const [note, setNote] = useState("")
  const [sending, setSending] = useState(false)
  const [linking, setLinking] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setEmail("")
    setFullName("")
    setReportsToId("")
    setNote("")
    setSending(false)
    setLinking(false)
    setGeneratedLink(null)
    setRole("member")
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, close, setRole])

  if (!open) return null

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      toast("EMAIL REQUIRED")
      return
    }
    setSending(true)
    const result = await sendWorkspaceInvite(workspaceSlug, {
      email: email.trim(),
      fullName: fullName.trim() || undefined,
      role,
      note: note.trim() || undefined,
    })
    setSending(false)
    if (!result.ok) {
      toast("INVITE FAILED", { description: result.error })
      return
    }
    toast("INVITE SENT", { description: email.trim() })
    close()
  }

  async function handleGenerateLink() {
    if (!email.trim()) {
      toast("EMAIL REQUIRED to generate a link")
      return
    }
    setLinking(true)
    setGeneratedLink(null)
    const result = await generateInviteLink(workspaceSlug, {
      email: email.trim(),
      fullName: fullName.trim() || undefined,
      role,
    })
    setLinking(false)
    if (!result.ok) {
      toast("LINK FAILED", { description: result.error })
      return
    }
    setGeneratedLink(result.url)
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(result.url).catch(() => {})
      toast("INVITE LINK COPIED", { description: "Paste it into Slack / DM." })
    } else {
      toast("INVITE LINK READY")
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-40 fade-in"
        onClick={close}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Invite Person"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none overflow-y-auto"
      >
        <form
          onSubmit={onSubmit}
          className="bg-bg-2 border border-border-orage rounded-md w-full max-w-2xl shadow-2xl pointer-events-auto my-auto"
        >
          <header className="flex items-center justify-between px-6 h-[60px] border-b border-border-orage">
            <h2 className="font-display text-text-primary text-base tracking-[0.1em] uppercase">
              Invite Person
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="w-8 h-8 rounded-sm hover:bg-bg-hover flex items-center justify-center text-text-muted"
            >
              <IcClose className="w-4 h-4" />
            </button>
          </header>

          <div className="px-6 py-5 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Email" required>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@quintessa.com"
                  required
                  autoFocus
                  className="h-9 w-full bg-bg-3 border border-border-orage rounded-sm px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-500 focus:outline-none"
                />
              </Field>
              <Field label="Full Name">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Optional"
                  className="h-9 w-full bg-bg-3 border border-border-orage rounded-sm px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-500 focus:outline-none"
                />
              </Field>
            </div>

            <Field label="Role">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {ROLES.map((r) => {
                  const active = role === r.value
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={cn(
                        "text-left p-3 rounded-sm border transition-colors",
                        active
                          ? "bg-gold-500/10 border-gold-500"
                          : "bg-bg-3 border-border-orage hover:bg-bg-hover",
                      )}
                    >
                      <div
                        className={cn(
                          "font-display text-xs tracking-[0.1em] uppercase",
                          active ? "text-gold-400" : "text-text-primary",
                        )}
                      >
                        {r.label}
                      </div>
                      <ul className="mt-1.5 flex flex-col gap-0.5">
                        {r.caps.map((c) => (
                          <li
                            key={c}
                            className="text-[11px] text-text-secondary leading-relaxed"
                          >
                            · {c}
                          </li>
                        ))}
                      </ul>
                    </button>
                  )
                })}
              </div>
            </Field>

            <Field label="Reports To">
              <select
                value={reportsToId}
                onChange={(e) => setReportsToId(e.target.value)}
                className="h-9 w-full bg-bg-3 border border-border-orage rounded-sm px-3 text-sm text-text-primary focus:border-gold-500 focus:outline-none"
              >
                <option value="">Unassigned</option>
                {USERS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.role}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Personal Note">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Welcome message that will go in the invite email…"
                className="w-full bg-bg-3 border border-border-orage rounded-sm px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-500 focus:outline-none resize-none"
              />
            </Field>
          </div>

          {generatedLink && (
            <div className="px-6 pt-3 pb-1">
              <div className="rounded-sm border border-gold-500/40 bg-gold-500/5 p-3 flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-display text-[10px] tracking-[0.18em] text-gold-400 mb-1">
                    INVITE LINK · COPIED TO CLIPBOARD
                  </div>
                  <code className="block text-[11px] text-text-secondary font-mono truncate">
                    {generatedLink}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!generatedLink) return
                    navigator.clipboard.writeText(generatedLink).then(() => toast("Copied"))
                  }}
                  className="h-7 px-2 bg-bg-2 border border-border-orage rounded-sm text-[10px] font-mono uppercase text-text-secondary hover:text-gold-400"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          <footer className="border-t border-border-orage px-6 py-3 flex items-center justify-between gap-2">
            <p className="text-[11px] font-mono text-text-muted">
              Invite expires in 7 days · revoke anytime from Admin
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={close}
                className="h-9 px-4 bg-bg-3 border border-border-orage hover:bg-bg-hover text-text-secondary text-xs font-semibold tracking-wider uppercase rounded-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateLink}
                disabled={linking || sending}
                className="h-9 px-4 bg-bg-3 border border-border-orage hover:border-gold-500 hover:text-gold-400 disabled:opacity-50 text-text-secondary text-xs font-semibold tracking-wider uppercase rounded-sm"
              >
                {linking ? "Linking..." : "Copy Link"}
              </button>
              <button
                type="submit"
                disabled={sending || linking}
                className="h-9 px-4 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-text-on-gold text-xs font-semibold tracking-wider uppercase rounded-sm"
              >
                {sending ? "Sending..." : "Send Invite"}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </>
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
      <span className="font-display text-[10px] tracking-[0.2em] text-text-muted uppercase">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </span>
      {children}
    </label>
  )
}
