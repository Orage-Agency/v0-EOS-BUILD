import { TenantLink as Link } from "@/components/tenant-link"
import type { Kpi } from "@/lib/dashboard"
import { cn } from "@/lib/utils"

export function KpiGrid({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6 stagger">
      {kpis.map((k) => (
        <KpiCard key={k.label} kpi={k} />
      ))}
    </div>
  )
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  const inner = (
    <>
      <span
        aria-hidden
        className={cn(
          "absolute top-0 left-0 h-full w-[3px] opacity-70",
          kpi.tone === "warning"
            ? "bg-warning"
            : kpi.tone === "danger"
              ? "bg-danger"
              : "bg-gold-500",
        )}
      />
      <div className="font-display text-[9px] tracking-[0.25em] text-text-muted uppercase mb-1.5">
        {kpi.label}
      </div>
      <div className="font-display text-[36px] tracking-[0.05em] text-gold-400 leading-none">
        {kpi.value}
      </div>
      <div className="text-[11px] text-text-muted mt-1.5 flex items-center gap-1">
        <span
          className={cn(
            "font-semibold",
            kpi.metaTone === "up" && "text-success",
            kpi.metaTone === "down" && "text-danger",
            kpi.metaTone === "neutral" && "text-warning",
          )}
        >
          {kpi.metaTone === "up" && "↑ "}
          {kpi.metaTone === "down" && "↓ "}
          {kpi.metaTone === "neutral" && ""}
          {kpi.meta}
        </span>
      </div>
    </>
  )

  const cls =
    "group relative bg-bg-3 border border-border-orage rounded-sm px-[18px] py-4 cursor-pointer overflow-hidden transition-all hover:border-gold-500 hover:-translate-y-0.5 hover:shadow-gold"

  return kpi.href ? (
    <Link href={kpi.href} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  )
}
