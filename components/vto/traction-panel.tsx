"use client"

import { TenantLink as Link } from "@/components/tenant-link"
import { useIssuesStore } from "@/lib/issues-store"
import { OneYearPlanEditor } from "./one-year-plan-editor"
import { RocksRollup } from "./rocks-rollup"
import { SectionShell, PermissionBanner } from "./section-shell"
import { useUIStore } from "@/lib/store"
import { canEditVto } from "@/lib/permissions"

export function TractionPanel() {
  const issues = useIssuesStore((s) => s.issues)
  const top = issues.slice(0, 5)
  const sessionUser = useUIStore((s) => s.currentUser)

  const canEdit = canEditVto({
    id: sessionUser?.id ?? "",
    role: sessionUser?.role as import("@/types/permissions").Role ?? "member",
    isMaster: sessionUser?.isMaster ?? false,
  })

  return (
    <>
      <PermissionBanner show={!canEdit} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionShell
          num={6}
          title="1-YEAR PLAN · APR 2027"
          fullWidth
        >
          <OneYearPlanEditor canEdit={canEdit} />
        </SectionShell>

        <SectionShell num={7} title="QUARTERLY ROCKS · Q2 2026" fullWidth>
          <RocksRollup />
        </SectionShell>

        <SectionShell num={8} title="ISSUES LIST · TOP 5" fullWidth>
          {top.length === 0 ? (
            <p className="text-[12px] text-text-muted">No open issues.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {top.map((i, idx) => (
                <li
                  key={i.id}
                  className="grid grid-cols-[28px_1fr_84px] gap-3 items-center px-3.5 py-2.5 bg-bg-2 border border-border-orage rounded-sm hover:border-gold-500 transition-colors"
                >
                  <span className="font-display text-sm text-gold-400 text-center">
                    {idx + 1}
                  </span>
                  <Link
                    href="/issues"
                    className="text-[13px] text-text-primary hover:text-gold-400 transition-colors line-clamp-1"
                  >
                    {i.title}
                  </Link>
                  <span className="font-display text-[9px] tracking-[0.15em] uppercase text-text-muted text-right">
                    {i.severity}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/issues"
            className="mt-3 inline-block font-display text-[10px] tracking-[0.15em] text-gold-400 hover:text-gold-200 transition-colors"
          >
            VIEW ALL ISSUES →
          </Link>
        </SectionShell>
      </div>
    </>
  )
}
