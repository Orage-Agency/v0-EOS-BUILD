import { TenantLink as Link } from "@/components/tenant-link"
import type { ScorecardMetric } from "@/lib/dashboard"
import { cn } from "@/lib/utils"

export function ScorecardPulse({ metrics }: { metrics: ScorecardMetric[] }) {
  return (
    <section className="solid mb-5 overflow-hidden">
      <header className="px-[18px] py-3.5 border-b border-border-orage flex items-center justify-between">
        <div className="font-display text-[13px] tracking-[0.22em] text-gold-400 uppercase">
          SCORECARD PULSE
        </div>
        <Link
          href="/scorecard"
          className="text-[11px] text-text-muted hover:text-gold-400 transition-colors"
        >
          Full View →
        </Link>
      </header>
      <div className="px-[18px] py-3.5">
        {metrics.map((m) => (
          <div
            key={m.name}
            className="grid items-center gap-2.5 py-2.5 border-b border-border-orage last:border-b-0 text-xs"
            style={{ gridTemplateColumns: "1fr auto auto" }}
          >
            <div>
              <div className="text-text-secondary">{m.name}</div>
              <div className="text-[10px] text-text-muted">{m.goal}</div>
            </div>
            <div
              className={cn(
                "font-mono text-xs",
                m.status === "green" && "text-success",
                m.status === "yellow" && "text-warning",
                m.status === "red" && "text-danger",
              )}
            >
              {m.value}
            </div>
            <div
              className="flex gap-0.5 items-end h-5"
              role="img"
              aria-label={`${m.name} 8-week trend`}
            >
              {m.spark.map((bar, i) => (
                <span
                  key={i}
                  className={cn(
                    "w-[3px] rounded-[1px] opacity-60",
                    bar.tone === "danger"
                      ? "bg-danger opacity-90"
                      : bar.tone === "warning"
                        ? "bg-warning"
                        : "bg-gold-500",
                  )}
                  style={{ height: `${bar.height}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
