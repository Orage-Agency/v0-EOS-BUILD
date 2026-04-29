import { GLOBAL_KPIS } from "@/lib/tenants-store"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

type Variant = "default" | "active" | "new" | "churn" | "health"

const STRIPE: Record<Variant, string> = {
  default: "bg-gold-500",
  active: "bg-success",
  new: "bg-warning",
  churn: "bg-danger",
  health: "bg-info",
}

export function GlobalKPIs() {
  const k = GLOBAL_KPIS
  const total = k.healthy + k.atRisk + k.inactive
  const greenPct = (k.healthy / total) * 100
  const yellowPct = (k.atRisk / total) * 100
  const redPct = (k.inactive / total) * 100

  return (
    <div className="grid gap-3.5 px-8 py-5 border-b border-border-orage" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
      <KpiCard label="TOTAL TENANTS" variant="default">
        <KpiValue>{k.totalTenants}</KpiValue>
        <KpiMeta>
          {k.active} active · {k.testing} testing
        </KpiMeta>
      </KpiCard>
      <KpiCard label="ACTIVE USERS · 7D" variant="active">
        <KpiValue>{k.activeUsers7d}</KpiValue>
        <KpiMeta>
          <span className="text-success">↑ {k.activeUsers7dDelta} from last week</span>
        </KpiMeta>
      </KpiCard>
      <KpiCard label="NEW · 30D" variant="new">
        <KpiValue>{k.newLast30}</KpiValue>
        <KpiMeta>{k.newNames.join(" · ")}</KpiMeta>
      </KpiCard>
      <KpiCard label="INACTIVE · 30D" variant="churn">
        <KpiValue>{k.inactiveLast30}</KpiValue>
        <KpiMeta>{k.inactiveLast30 === 0 ? "100% engagement" : "↓ check drawer"}</KpiMeta>
      </KpiCard>
      <KpiCard label="HEALTH · DISTRIBUTION" variant="health">
        <KpiValue className="text-[18px]">
          {k.healthy} · {k.atRisk} · {k.inactive}
        </KpiValue>
        <div className="flex h-1.5 rounded-[3px] overflow-hidden mt-2.5 bg-bg-base">
          <div className="bg-success h-full" style={{ width: `${greenPct}%` }} />
          <div className="bg-warning h-full" style={{ width: `${yellowPct}%` }} />
          <div className="bg-danger h-full" style={{ width: `${redPct}%` }} />
        </div>
        <div className="flex justify-between mt-1.5 font-mono text-[9px] text-text-muted">
          <span className="text-success">{k.healthy} HEALTHY</span>
          <span className="text-warning">{k.atRisk} AT RISK</span>
          <span className="text-danger">{k.inactive} INACTIVE</span>
        </div>
      </KpiCard>
    </div>
  )
}

function KpiCard({
  label,
  variant,
  children,
}: {
  label: string
  variant: Variant
  children: ReactNode
}) {
  return (
    <div className="bg-bg-3 border border-border-orage rounded-sm px-4 py-3.5 cursor-pointer transition-colors hover:border-gold-500 relative overflow-hidden">
      <span
        aria-hidden
        className={cn("absolute top-0 left-0 w-[3px] h-full", STRIPE[variant])}
      />
      <div className="font-display text-[9px] tracking-[0.22em] text-text-muted uppercase mb-1.5">
        {label}
      </div>
      {children}
    </div>
  )
}

function KpiValue({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "font-display text-[32px] leading-none text-gold-400",
        className,
      )}
    >
      {children}
    </div>
  )
}

function KpiMeta({ children }: { children: ReactNode }) {
  return <div className="text-[10px] text-text-muted mt-1">{children}</div>
}
