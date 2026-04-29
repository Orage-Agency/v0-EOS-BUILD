"use client"

import { toast } from "sonner"
import { useTenantsStore, type Tenant } from "@/lib/tenants-store"
import { HealthScoreBadge } from "./health-score-badge"
import { cn } from "@/lib/utils"

const LOGO_VARIANT: Record<string, string> = {
  default: "bg-gradient-to-br from-gold-500 to-gold-700 text-text-on-gold",
  bl: "bg-gradient-to-br from-[#5A8FAA] to-[#2c4a5c] text-white",
  gr: "bg-gradient-to-br from-[#6FAA6B] to-[#3a5e37] text-white",
  rd: "bg-gradient-to-br from-[#C25450] to-[#6e2e2c] text-white",
  pr: "bg-gradient-to-br from-[#9a6abf] to-[#4d3361] text-white",
}

const STATUS_PILL: Record<string, string> = {
  active: "bg-[rgba(111,170,107,0.15)] text-success",
  master:
    "bg-gradient-to-br from-gold-500 to-gold-700 text-text-on-gold",
  testing: "bg-[rgba(90,143,170,0.15)] text-info",
  archived: "bg-[rgba(138,120,96,0.2)] text-text-muted",
}

const FLAG_KIND: Record<string, string> = {
  warn: "bg-[rgba(212,162,74,0.15)] text-warning",
  danger: "bg-[rgba(194,84,80,0.15)] text-danger",
  info: "bg-[rgba(90,143,170,0.15)] text-info",
  success: "bg-[rgba(111,170,107,0.15)] text-success",
}

const CARD_VARIANT: Record<Tenant["health"], string> = {
  master:
    "border-l-2 border-l-gold-500 bg-gradient-to-br from-[rgba(182,128,57,0.06)] to-[rgba(228,175,122,0.02)]",
  healthy: "border-l-2 border-l-success",
  at_risk: "border-l-2 border-l-warning",
  inactive: "border-l-2 border-l-danger",
}

export function TenantCard({ tenant }: { tenant: Tenant }) {
  const openDrawer = useTenantsStore((s) => s.openDrawer)
  const startImpersonation = useTenantsStore((s) => s.startImpersonation)

  // P0-3 (Bird's Eye hydration #418): the previous markup had a nested
  // <button> ("ENTER →") inside the outer card <button>, which is invalid
  // HTML. The browser rewrites that during parsing, so the SSR HTML and
  // the React client tree disagreed → hydration error #418 (HTML variant).
  // Switch the outer container to a div with role="button" and keep the
  // ENTER button as a real <button>.
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openDrawer(tenant.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          openDrawer(tenant.id)
        }
      }}
      aria-label={`Inspect ${tenant.name}`}
      className={cn(
        "text-left bg-bg-3 border border-border-orage rounded-md overflow-hidden cursor-pointer transition-all duration-200 hover:border-gold-500 hover:-translate-y-0.5 hover:shadow-gold relative w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500",
        CARD_VARIANT[tenant.health],
      )}
    >
      <header className="px-[18px] py-4 flex items-center gap-3 border-b border-border-orage">
        <div
          className={cn(
            "w-[42px] h-[42px] rounded-sm flex items-center justify-center font-display text-sm font-bold tracking-[0.05em] shrink-0",
            LOGO_VARIANT[tenant.logoVariant] ?? LOGO_VARIANT.default,
          )}
          aria-hidden
        >
          {tenant.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-base tracking-[0.05em] text-gold-400 leading-tight mb-0.5 truncate">
            {tenant.name}
          </div>
          <div className="text-[11px] text-text-muted font-mono truncate">
            {tenant.domain}
          </div>
        </div>
        <span
          className={cn(
            "px-2 py-0.5 font-display text-[9px] tracking-[0.18em] rounded-sm shrink-0",
            STATUS_PILL[tenant.status],
          )}
        >
          {tenant.status.toUpperCase()}
        </span>
      </header>

      <div className="px-[18px] py-3.5 flex flex-col gap-3">
        <HealthScoreBadge
          score={tenant.healthScore}
          label={tenant.healthLabel}
        />
        <div className="grid grid-cols-2 gap-2.5">
          {tenant.stats.map((s) => (
            <div key={s.label} className="flex flex-col gap-0.5">
              <div className="font-display text-[8px] tracking-[0.2em] text-text-muted uppercase">
                {s.label}
              </div>
              <div className="font-display text-[15px] text-text-primary leading-none">
                {s.value}
              </div>
              <div
                className={cn(
                  "text-[9px] font-mono",
                  s.trend === "up"
                    ? "text-success"
                    : s.trend === "down"
                      ? "text-danger"
                      : "text-text-muted",
                )}
              >
                {s.meta}
              </div>
            </div>
          ))}
        </div>
        {tenant.flags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap pt-2.5 border-t border-border-orage">
            {tenant.flags.map((f) => (
              <span
                key={f.label}
                className={cn(
                  "px-2 py-0.5 font-display text-[8px] tracking-[0.18em] rounded-sm",
                  FLAG_KIND[f.kind],
                )}
              >
                {f.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <footer className="px-[18px] py-2.5 border-t border-border-orage bg-bg-2 flex items-center justify-between text-[10px] text-text-muted font-mono">
        <span className="truncate">{tenant.joined}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            startImpersonation(tenant.id)
            toast(`◆ ENTERING ${tenant.name} · BANNER PERSISTENT`)
          }}
          className="px-2.5 py-1 bg-transparent border border-gold-500 rounded-sm font-display text-[9px] tracking-[0.18em] text-gold-400 cursor-pointer transition-colors hover:bg-[rgba(182,128,57,0.12)] font-semibold flex items-center gap-1.5 shrink-0 ml-2"
        >
          ◆ ENTER →
        </button>
      </footer>
    </div>
  )
}
