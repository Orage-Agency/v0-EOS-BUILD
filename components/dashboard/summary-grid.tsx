import { TenantLink as Link } from "@/components/tenant-link"
import type { Kpi } from "@/lib/dashboard"
import { cn } from "@/lib/utils"

/**
 * 2-up morning-glance summary replacing the previous 4 KPI tiles.
 *
 *   Card 1 — "YOUR DAY":     OPEN TASKS  + due-today subline
 *   Card 2 — "COMPANY PULSE": ROCKS health + SCORECARD% + ISSUES count
 *
 * Reuses the same `Kpi[]` shape returned by getKpis() so the data layer
 * is unchanged.
 */
export function SummaryGrid({ kpis }: { kpis: Kpi[] }) {
  const tasks = kpis.find((k) => k.label === "OPEN TASKS")
  const rocks = kpis.find((k) => k.label === "QUARTER ROCKS")
  const score = kpis.find((k) => k.label === "SCORECARD HEALTH")
  const issues = kpis.find((k) => k.label === "ISSUES IN IDS")

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 stagger">
      <SummaryCard
        title="YOUR DAY"
        href={tasks?.href ?? "/tasks"}
        primary={{
          label: "OPEN TASKS",
          value: tasks?.value ?? "—",
          meta: tasks?.meta ?? "no tasks today",
          tone: tasks?.metaTone ?? "neutral",
        }}
        sub={[
          {
            label: "Priorities flagged",
            value: tasks?.value ?? "0",
          },
          {
            label: "Up next",
            value: (tasks?.meta ?? "").toUpperCase(),
          },
        ]}
      />
      <SummaryCard
        title="COMPANY PULSE"
        href={rocks?.href ?? "/rocks"}
        accent={(issues?.tone === "warning" || issues?.tone === "danger") ? "warning" : "default"}
        primary={{
          label: "QUARTER ROCKS",
          value: rocks?.value ?? "—",
          meta: rocks?.meta ?? "",
          tone: rocks?.metaTone ?? "neutral",
        }}
        sub={[
          {
            label: "Scorecard health",
            value: score?.value ?? "—",
          },
          {
            label: "Issues in IDS",
            value: issues?.value ?? "0",
            tone: issues?.tone === "warning" || issues?.tone === "danger" ? "warning" : undefined,
          },
        ]}
      />
    </div>
  )
}

type Tone = "up" | "down" | "neutral"

function SummaryCard({
  title,
  href,
  primary,
  sub,
  accent = "default",
}: {
  title: string
  href: string
  accent?: "default" | "warning"
  primary: { label: string; value: string; meta: string; tone: Tone }
  sub: { label: string; value: string; tone?: "warning" }[]
}) {
  return (
    <Link
      href={href}
      className="group relative bg-bg-3 border border-border-orage rounded-sm overflow-hidden cursor-pointer transition-all hover:border-gold-500 hover:-translate-y-0.5 hover:shadow-gold flex flex-col"
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-0 left-0 h-full w-[3px]",
          accent === "warning" ? "bg-warning" : "bg-gold-500",
        )}
      />
      <div className="px-5 pt-4 pb-3 border-b border-border-orage flex items-center justify-between">
        <span className="font-display text-[11px] tracking-[0.25em] text-gold-400 uppercase">
          {title}
        </span>
        <span className="font-mono text-[10px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
          OPEN →
        </span>
      </div>
      <div className="px-5 py-5 flex items-end justify-between gap-4">
        <div>
          <div className="font-display text-[9px] tracking-[0.25em] text-text-muted uppercase mb-1.5">
            {primary.label}
          </div>
          <div className="font-display text-[56px] tracking-[0.04em] text-gold-400 leading-none">
            {primary.value}
          </div>
        </div>
        <div className="text-right pb-1">
          <div
            className={cn(
              "text-[11px] font-semibold",
              primary.tone === "up" && "text-success",
              primary.tone === "down" && "text-danger",
              primary.tone === "neutral" && "text-warning",
            )}
          >
            {primary.tone === "up" && "↑ "}
            {primary.tone === "down" && "↓ "}
            {primary.meta}
          </div>
        </div>
      </div>
      <div className="px-5 pb-4 grid grid-cols-2 gap-3">
        {sub.map((s) => (
          <div key={s.label} className="bg-bg-2 border border-border-orage rounded-sm px-3 py-2">
            <div className="text-[9px] tracking-[0.2em] font-display text-text-muted uppercase">
              {s.label}
            </div>
            <div
              className={cn(
                "text-[15px] font-semibold mt-0.5",
                s.tone === "warning" ? "text-warning" : "text-text-primary",
              )}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </Link>
  )
}
