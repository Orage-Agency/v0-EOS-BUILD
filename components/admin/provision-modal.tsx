"use client"

import { useEffect, useState } from "react"
import { useTenantsStore } from "@/lib/tenants-store"
import { IcClose } from "@/components/orage/icons"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const TIERS = [
  { id: "starter", label: "Starter", seats: "10 seats" },
  { id: "growth", label: "Growth", seats: "25 seats" },
  { id: "enterprise", label: "Enterprise", seats: "100+ seats" },
] as const

export function ProvisionModal() {
  const open = useTenantsStore((s) => s.provisionOpen)
  const close = useTenantsStore((s) => s.closeProvision)

  const [name, setName] = useState("")
  const [domain, setDomain] = useState("")
  const [ownerEmail, setOwnerEmail] = useState("")
  const [tier, setTier] = useState<(typeof TIERS)[number]["id"]>("growth")
  const [type, setType] = useState<"active" | "testing">("active")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, close])

  if (!open) return null

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !ownerEmail) {
      toast("MISSING FIELDS", { description: "Workspace name and owner email are required." })
      return
    }
    setSubmitting(true)
    try {
      await new Promise((r) => setTimeout(r, 600))
      toast("TENANT PROVISIONED", {
        description: `${name} · invite sent to ${ownerEmail}`,
      })
      setName("")
      setDomain("")
      setOwnerEmail("")
      setTier("growth")
      setType("active")
      close()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close modal"
        onClick={close}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 fade-in"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="provision-title"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] max-w-[92vw] bg-bg-2 border border-border-orage rounded-sm z-50 overflow-hidden"
        style={{ animation: "fadeIn 0.24s cubic-bezier(0.16,1,0.3,1)" }}
      >
        <header className="px-6 pt-5 pb-4 border-b border-border-orage flex items-start justify-between">
          <div>
            <h2
              id="provision-title"
              className="font-display tracking-[0.06em] uppercase text-base text-text-primary"
            >
              Provision New Tenant
            </h2>
            <p className="text-xs text-text-muted mt-1">
              Master only · creates an isolated workspace and sends a founder invite
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="text-text-muted hover:text-text-primary p-1"
          >
            <IcClose className="w-4 h-4" />
          </button>
        </header>

        <form onSubmit={onSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.1em] text-text-muted">
                Workspace name
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Quintessa Health"
                className="mt-1 w-full h-9 px-3 bg-bg-3 border border-border-orage rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold-500"
                autoFocus
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.1em] text-text-muted">
                Domain
              </span>
              <input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="quintessahealth.com"
                className="mt-1 w-full h-9 px-3 bg-bg-3 border border-border-orage rounded-sm text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold-500"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.1em] text-text-muted">
              Owner email
            </span>
            <input
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              placeholder="founder@example.com"
              className="mt-1 w-full h-9 px-3 bg-bg-3 border border-border-orage rounded-sm text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold-500"
            />
          </label>

          <fieldset>
            <legend className="text-[10px] uppercase tracking-[0.1em] text-text-muted mb-2">
              Tier
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {TIERS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTier(t.id)}
                  className={cn(
                    "border rounded-sm px-3 py-2 text-left transition-colors",
                    tier === t.id
                      ? "border-gold-500 bg-gold-500/10"
                      : "border-border-orage bg-bg-3 hover:border-text-muted",
                  )}
                >
                  <div className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                    {t.label}
                  </div>
                  <div className="text-[10px] font-mono text-text-muted mt-0.5">
                    {t.seats}
                  </div>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-[10px] uppercase tracking-[0.1em] text-text-muted mb-2">
              Type
            </legend>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("active")}
                className={cn(
                  "flex-1 border rounded-sm px-3 py-2 text-left transition-colors",
                  type === "active"
                    ? "border-gold-500 bg-gold-500/10"
                    : "border-border-orage bg-bg-3 hover:border-text-muted",
                )}
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                  Active
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">
                  Production workspace · billing on
                </div>
              </button>
              <button
                type="button"
                onClick={() => setType("testing")}
                className={cn(
                  "flex-1 border rounded-sm px-3 py-2 text-left transition-colors",
                  type === "testing"
                    ? "border-gold-500 bg-gold-500/10"
                    : "border-border-orage bg-bg-3 hover:border-text-muted",
                )}
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                  Testing
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">
                  60-day auto-archive · feedback only
                </div>
              </button>
            </div>
          </fieldset>

          <footer className="flex items-center justify-end gap-2 border-t border-border-orage pt-4">
            <button
              type="button"
              onClick={close}
              className="h-9 px-4 text-[11px] font-semibold tracking-[0.1em] uppercase text-text-muted hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-9 px-5 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed text-text-on-gold text-[11px] font-semibold tracking-[0.1em] uppercase rounded-sm"
            >
              {submitting ? "Provisioning…" : "Provision"}
            </button>
          </footer>
        </form>
      </div>
    </>
  )
}
