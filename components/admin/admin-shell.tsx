"use client"

import { TenantLink as Link } from "@/components/tenant-link"
import { useTenantsStore, getTenant } from "@/lib/tenants-store"
import { useUIStore } from "@/lib/store"
import { GlobalKPIs } from "./global-kpis"
import { TenantTabs, TenantToolbar } from "./tenant-toolbar"
import { TenantGrid } from "./tenant-grid"
import { TenantDrawer } from "./tenant-drawer"
import { ProvisionModal } from "./provision-modal"
import { IcChevronLeft, IcPlus } from "@/components/orage/icons"
import { cn } from "@/lib/utils"

/**
 * Master "Bird's Eye View". Renders inside the (app) layout slot —
 * does NOT introduce its own sidebar/topbar/min-h-screen wrapper.
 * The thin master banner up top distinguishes the master role from
 * a normal workspace; everything else is plain content.
 */
export function AdminShell() {
  const openProvision = useTenantsStore((s) => s.openProvision)
  const impersonatingId = useTenantsStore((s) => s.impersonatingId)
  const endImpersonation = useTenantsStore((s) => s.endImpersonation)
  const sessionUser = useUIStore((s) => s.currentUser)
  const target = impersonatingId ? getTenant(impersonatingId) : undefined

  return (
    <div>
      {/* Compact master indicator + page header. Sits in the body slot
          so it doesn't overlap the sidebar. */}
      <div
        className={cn(
          "px-8 py-2.5 flex items-center gap-3 border-b",
          target
            ? "border-gold-500"
            : "border-border-orage bg-bg-2/60",
        )}
        style={
          target
            ? {
                background:
                  "linear-gradient(135deg, rgba(228,175,122,0.12), rgba(182,128,57,0.04))",
              }
            : undefined
        }
      >
        <span
          aria-hidden
          className={cn(
            "w-4 h-4 rounded-full flex items-center justify-center text-[10px]",
            target ? "bg-gold-500 text-text-on-gold" : "bg-gold-500/20 text-gold-400",
          )}
        >
          ◆
        </span>
        <span
          className={cn(
            "font-display text-[10px] tracking-[0.18em] font-bold",
            target ? "text-gold-400" : "text-gold-400",
          )}
        >
          {target
            ? `MASTER · IMPERSONATING ${target.name.toUpperCase()}`
            : "MASTER · BIRD'S EYE VIEW"}
        </span>
        {target && (
          <span className="font-sans text-[11px] text-text-secondary">
            ({target.domain})
          </span>
        )}
        <span className="flex-1" />
        {target ? (
          <button
            type="button"
            onClick={endImpersonation}
            className="font-display text-[10px] tracking-[0.2em] px-2.5 py-1 rounded-sm border border-gold-500 text-gold-400 hover:bg-gold-500/10 transition-colors"
          >
            ◀ EXIT IMPERSONATION
          </button>
        ) : (
          <span className="font-sans text-[11px] text-text-muted">
            {sessionUser?.name ?? "Master"} · all tenants visible
          </span>
        )}
      </div>

      {/* Page-level header: back link + provision tenant CTA. */}
      <div className="px-8 pt-6 pb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.12em] text-text-muted hover:text-text-primary transition-colors"
          >
            <IcChevronLeft className="w-3.5 h-3.5" />
            Back to {sessionUser?.workspaceName ?? "Workspace"}
          </Link>
          <span className="text-text-muted">·</span>
          <h1 className="font-display tracking-[0.08em] uppercase text-text-primary text-lg">
            Bird&apos;s Eye View
          </h1>
        </div>
        <button
          type="button"
          onClick={openProvision}
          className="inline-flex items-center gap-1.5 h-8 px-3 bg-gold-500 hover:bg-gold-400 text-text-on-gold text-[11px] font-semibold tracking-[0.1em] uppercase rounded-sm transition-colors"
        >
          <IcPlus className="w-3.5 h-3.5" />
          Provision tenant
        </button>
      </div>

      <GlobalKPIs />
      <TenantTabs />
      <TenantToolbar />
      <TenantGrid />

      <TenantDrawer />
      <ProvisionModal />
    </div>
  )
}
