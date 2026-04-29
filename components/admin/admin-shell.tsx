"use client"

import { TenantLink as Link } from "@/components/tenant-link"
import { useTenantsStore } from "@/lib/tenants-store"
import { CURRENT_USER } from "@/lib/mock-data"
import { OrageAvatar } from "@/components/orage/avatar"
import { MasterBanner } from "./master-banner"
import { GlobalKPIs } from "./global-kpis"
import { TenantTabs, TenantToolbar } from "./tenant-toolbar"
import { TenantGrid } from "./tenant-grid"
import { TenantDrawer } from "./tenant-drawer"
import { ProvisionModal } from "./provision-modal"
import { IcChevronLeft, IcPlus } from "@/components/orage/icons"

export function AdminShell() {
  const openProvision = useTenantsStore((s) => s.openProvision)

  return (
    <div className="min-h-screen bg-bg-1 text-text-primary atmosphere">
      <MasterBanner />

      <header className="border-b border-border-orage bg-bg-2/80 backdrop-blur-md sticky top-0 z-30">
        <div className="px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.1em] uppercase text-text-muted hover:text-text-primary"
            >
              <IcChevronLeft className="w-3.5 h-3.5" />
              Back to Orage
            </Link>
            <span className="text-text-muted">·</span>
            <span className="font-display tracking-[0.08em] uppercase text-text-primary">
              Bird&apos;s Eye View
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openProvision}
              className="inline-flex items-center gap-1.5 h-8 px-3 bg-gold-500 hover:bg-gold-400 text-text-on-gold text-[11px] font-semibold tracking-[0.1em] uppercase rounded-sm"
            >
              <IcPlus className="w-3.5 h-3.5" />
              Provision tenant
            </button>
            <OrageAvatar user={CURRENT_USER} size="sm" />
          </div>
        </div>
      </header>

      <main>
        <GlobalKPIs />
        <TenantTabs />
        <TenantToolbar />
        <TenantGrid />
      </main>

      <TenantDrawer />
      <ProvisionModal />
    </div>
  )
}
