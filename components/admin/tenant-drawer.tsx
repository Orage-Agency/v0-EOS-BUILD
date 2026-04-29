"use client"

import { useEffect } from "react"
import { useTenantsStore, getTenant, type Tenant } from "@/lib/tenants-store"
import { HealthScoreBadge } from "./health-score-badge"
import {
  IcClose,
  IcChevronRight,
  IcMessage,
  IcLink,
  IcMore,
} from "@/components/orage/icons"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

function StatusPill({ status }: { status: Tenant["status"] }) {
  const tone =
    status === "master"
      ? "bg-gold-500/15 text-gold-400 border-gold-500/40"
      : status === "active"
      ? "bg-success/15 text-success border-success/40"
      : status === "testing"
      ? "bg-warning/15 text-warning border-warning/40"
      : "bg-bg-4 text-text-muted border-border-orage"
  return (
    <span
      className={cn(
        "px-2 py-1 text-[10px] font-semibold tracking-[0.1em] uppercase border rounded-sm",
        tone,
      )}
    >
      {status}
    </span>
  )
}

function FlagPill({ kind, children }: { kind: "warn" | "danger" | "info" | "success"; children: React.ReactNode }) {
  const tone =
    kind === "success"
      ? "bg-success/15 text-success border-success/40"
      : kind === "warn"
      ? "bg-warning/15 text-warning border-warning/40"
      : kind === "danger"
      ? "bg-danger/15 text-danger border-danger/40"
      : "bg-bg-4 text-text-secondary border-border-orage"
  return (
    <span
      className={cn(
        "px-2 py-1 text-[10px] font-semibold tracking-[0.1em] uppercase border rounded-sm",
        tone,
      )}
    >
      {children}
    </span>
  )
}

export function TenantDrawer() {
  const tenantId = useTenantsStore((s) => s.drawerTenantId)
  const closeDrawer = useTenantsStore((s) => s.closeDrawer)
  const startImpersonation = useTenantsStore((s) => s.startImpersonation)

  useEffect(() => {
    if (!tenantId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [tenantId, closeDrawer])

  if (!tenantId) return null
  const tenant = getTenant(tenantId)
  if (!tenant) return null

  return (
    <>
      <button
        type="button"
        aria-label="Close drawer"
        onClick={closeDrawer}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 fade-in"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="tenant-drawer-title"
        className="fixed right-0 top-0 bottom-0 w-[640px] max-w-[92vw] bg-bg-2 border-l border-border-orage z-50 overflow-y-auto"
        style={{ animation: "slideInRight 0.32s cubic-bezier(0.16,1,0.3,1)" }}
      >
        <header className="px-7 pt-7 pb-5 border-b border-border-orage flex items-start gap-4 sticky top-0 bg-bg-2 z-10">
          <div
            className={cn(
              "w-14 h-14 flex-shrink-0 grid place-items-center rounded-sm font-display tracking-[0.04em] text-xl",
              tenant.logoVariant === "default"
                ? "bg-gold-500 text-text-on-gold"
                : tenant.logoVariant === "bl"
                ? "bg-info/20 text-info"
                : tenant.logoVariant === "gr"
                ? "bg-success/20 text-success"
                : tenant.logoVariant === "rd"
                ? "bg-danger/20 text-danger"
                : "bg-purple-500/20 text-purple-400",
            )}
          >
            {tenant.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2
                id="tenant-drawer-title"
                className="font-display tracking-[0.06em] uppercase text-lg text-text-primary text-balance"
              >
                {tenant.name}
              </h2>
              <StatusPill status={tenant.status} />
            </div>
            <p className="font-mono text-[11px] text-text-muted mt-1">
              {tenant.domain} · {tenant.joined}
            </p>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close"
            className="p-2 -mr-2 text-text-muted hover:text-text-primary"
          >
            <IcClose className="w-5 h-5" />
          </button>
        </header>

        <div className="px-7 py-6 space-y-7">
          <div className="flex items-center gap-4">
            <div className="w-32">
              <HealthScoreBadge score={tenant.healthScore} label={tenant.healthLabel} />
            </div>
            <div className="flex-1 grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-text-muted uppercase tracking-wider text-[10px]">
                  Owner
                </div>
                <div className="text-text-primary mt-0.5">{tenant.ownerName}</div>
                <div className="font-mono text-[11px] text-text-muted">
                  {tenant.ownerEmail}
                </div>
              </div>
              <div>
                <div className="text-text-muted uppercase tracking-wider text-[10px]">
                  Provisioned
                </div>
                <div className="text-text-primary mt-0.5">{tenant.provisionedBy}</div>
                <div className="font-mono text-[11px] text-text-muted">
                  {tenant.seatsUsed} / {tenant.seatsTotal} seats
                </div>
              </div>
            </div>
          </div>

          {tenant.flags.length > 0 && (
            <div>
              <h3 className="font-display tracking-[0.08em] uppercase text-[11px] text-text-muted mb-3">
                Signals
              </h3>
              <div className="flex flex-wrap gap-2">
                {tenant.flags.map((f) => (
                  <FlagPill key={f.label} kind={f.kind}>
                    {f.label}
                  </FlagPill>
                ))}
              </div>
            </div>
          )}

          {tenant.usage.length > 0 && (
            <div>
              <h3 className="font-display tracking-[0.08em] uppercase text-[11px] text-text-muted mb-3">
                Usage · Last 30 days
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {tenant.usage.map((m) => (
                  <div
                    key={m.label}
                    className="border border-border-orage rounded-sm p-3"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="text-[10px] uppercase tracking-wider text-text-muted">
                        {m.label}
                      </div>
                      <div
                        className={cn(
                          "text-[10px] font-mono",
                          m.trendKind === "success" && "text-success",
                          m.trendKind === "warning" && "text-warning",
                          m.trendKind === "danger" && "text-danger",
                          !m.trendKind && "text-text-muted",
                        )}
                      >
                        {m.trend}
                      </div>
                    </div>
                    <div className="font-display text-lg tracking-[0.04em] text-text-primary mt-1">
                      {m.value}
                    </div>
                    <div className="h-1 bg-bg-4 rounded-full mt-2 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          m.fillKind === "green" && "bg-success",
                          m.fillKind === "red" && "bg-danger",
                          m.fillKind === "default" && "bg-gold-500",
                        )}
                        style={{ width: `${Math.max(0, Math.min(100, m.percent))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tenant.risks.length > 0 && (
            <div>
              <h3 className="font-display tracking-[0.08em] uppercase text-[11px] text-text-muted mb-3">
                Risks &amp; recommendations
              </h3>
              <ul className="space-y-2">
                {tenant.risks.map((r, i) => (
                  <li
                    key={i}
                    className={cn(
                      "border-l-2 pl-3 py-1",
                      r.kind === "warn" && "border-warning",
                      r.kind === "danger" && "border-danger",
                      r.kind === "info" && "border-info",
                    )}
                  >
                    <div
                      className={cn(
                        "text-[10px] font-semibold tracking-[0.1em] uppercase",
                        r.kind === "warn" && "text-warning",
                        r.kind === "danger" && "text-danger",
                        r.kind === "info" && "text-info",
                      )}
                    >
                      {r.label}
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed mt-1">
                      {r.text}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tenant.audit.length > 0 && (
            <div>
              <h3 className="font-display tracking-[0.08em] uppercase text-[11px] text-text-muted mb-3">
                Master audit log · this tenant
              </h3>
              <ul className="space-y-2">
                {tenant.audit.map((a, i) => (
                  <li
                    key={i}
                    className="border border-border-orage rounded-sm px-3 py-2 flex items-start gap-3 text-xs"
                  >
                    <span className="font-display text-[10px] tracking-[0.1em] text-gold-400 uppercase min-w-[80px]">
                      {a.actor}
                    </span>
                    <span className="font-mono text-[10px] text-text-muted min-w-[110px]">
                      {a.when}
                    </span>
                    <span className="text-text-secondary leading-relaxed flex-1 text-pretty">
                      {a.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="border-t border-border-orage pt-5 flex flex-wrap gap-2">
            {tenant.status !== "master" && (
              <button
                type="button"
                onClick={() => {
                  startImpersonation(tenant.id)
                  toast(`IMPERSONATING ${tenant.name}`, {
                    description: "Read-only · 30 minutes",
                  })
                }}
                className="inline-flex items-center gap-2 h-9 px-4 bg-gold-500 hover:bg-gold-400 text-text-on-gold text-[11px] font-semibold tracking-[0.1em] uppercase rounded-sm"
              >
                <IcChevronRight className="w-3.5 h-3.5" />
                Impersonate
              </button>
            )}
            <button
              type="button"
              onClick={() => toast("MESSAGE OWNER", { description: tenant.ownerEmail })}
              className="inline-flex items-center gap-2 h-9 px-4 bg-bg-4 hover:bg-bg-3 text-text-primary text-[11px] font-semibold tracking-[0.1em] uppercase border border-border-orage rounded-sm"
            >
              <IcMessage className="w-3.5 h-3.5" />
              Message Owner
            </button>
            <button
              type="button"
              onClick={() => toast("LINK COPIED")}
              className="inline-flex items-center gap-2 h-9 px-4 bg-bg-4 hover:bg-bg-3 text-text-primary text-[11px] font-semibold tracking-[0.1em] uppercase border border-border-orage rounded-sm"
            >
              <IcLink className="w-3.5 h-3.5" />
              Copy URL
            </button>
            <button
              type="button"
              aria-label="More actions"
              onClick={() => toast("MORE ACTIONS")}
              className="ml-auto p-2 text-text-muted hover:text-text-primary border border-border-orage rounded-sm"
            >
              <IcMore className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
