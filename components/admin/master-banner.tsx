"use client"

import { TenantLink as Link } from "@/components/tenant-link"
import { useTenantsStore, getTenant } from "@/lib/tenants-store"
import { useUIStore } from "@/lib/store"
import { cn } from "@/lib/utils"

/**
 * Sticky banner for /admin/* routes. Two states:
 * 1. Default — gold gradient "Master · Bird's Eye View"
 * 2. Impersonating — different palette + "Exit" button to return to bird's eye
 */
export function MasterBanner() {
  const impersonatingId = useTenantsStore((s) => s.impersonatingId)
  const endImpersonation = useTenantsStore((s) => s.endImpersonation)
  const sessionUser = useUIStore((s) => s.currentUser)
  const target = impersonatingId ? getTenant(impersonatingId) : undefined

  if (target) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="px-4 py-2 flex items-center gap-2.5 border-b border-gold-500"
        style={{
          background:
            "linear-gradient(135deg, rgba(228,175,122,0.15), rgba(182,128,57,0.05))",
        }}
      >
        <span
          aria-hidden
          className="w-[18px] h-[18px] rounded-full bg-gold-500 flex items-center justify-center text-[10px] text-text-on-gold"
        >
          ◆
        </span>
        <span className="font-display text-[11px] tracking-[0.18em] font-bold text-gold-400">
          MASTER · IMPERSONATING {target.name}
        </span>
        <span className="font-sans text-[11px] text-text-secondary">
          ({target.domain})
        </span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={endImpersonation}
          className="font-display text-[10px] tracking-[0.2em] px-3 py-1 rounded-sm border border-gold-500 text-gold-400 hover:bg-gold-500/10 transition-colors"
        >
          ◀ EXIT IMPERSONATION
        </button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "px-4 py-2 flex items-center gap-2.5 border-b border-gold-400",
        "bg-gradient-to-br from-gold-500 to-gold-700",
      )}
    >
      <span
        aria-hidden
        className="w-[18px] h-[18px] rounded-full bg-black/20 flex items-center justify-center text-[11px] text-text-on-gold"
      >
        ◆
      </span>
      <span className="font-display text-[11px] tracking-[0.18em] font-bold text-text-on-gold">
        MASTER · BIRD&apos;S EYE VIEW
      </span>
      <span className="flex-1" />
      <span className="font-sans text-[11px] text-text-on-gold/80">
        Logged in as {sessionUser?.name ?? "Master"} · master role · all tenants visible
      </span>
      <Link
        href="/"
        className="ml-3 inline-flex items-center gap-1 font-display text-[10px] tracking-[0.2em] px-2.5 py-1 rounded-sm border border-text-on-gold/40 text-text-on-gold hover:bg-black/15 transition-colors"
      >
        ← BACK TO DASHBOARD
      </Link>
    </div>
  )
}
