import { TenantLink as Link } from "@/components/tenant-link"
import type { UpcomingEvent } from "@/lib/dashboard"
import { cn } from "@/lib/utils"

export function Upcoming({ events }: { events: UpcomingEvent[] }) {
  return (
    <section className="solid mb-5 overflow-hidden">
      <header className="px-[18px] py-3.5 border-b border-border-orage">
        <div className="font-display text-[13px] tracking-[0.22em] text-gold-400 uppercase">
          UPCOMING · 7 DAYS
        </div>
      </header>
      <ul className="px-[18px] py-3.5">
        {events.length === 0 && (
          <li className="text-center py-6 text-xs">
            <p className="text-text-secondary mb-1">Calendar&apos;s clear.</p>
            <p className="text-text-muted leading-relaxed max-w-[260px] mx-auto">
              Schedule your first L10 to start the weekly leadership rhythm.
            </p>
            <Link
              href="/l10"
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-border-orage hover:border-gold-500 hover:text-gold-300 font-mono uppercase tracking-[0.16em] text-text-primary transition-colors"
            >
              Schedule L10 →
            </Link>
          </li>
        )}
        {events.map((e, i) => (
          <li
            key={i}
            className={cn(
              "flex gap-3 p-2.5 bg-bg-3 rounded-sm mb-2 last:mb-0 border-l-2 cursor-pointer transition-colors hover:bg-bg-4",
              e.isToday ? "border-gold-500" : "border-transparent",
            )}
          >
            <div className="min-w-[42px] text-center font-display leading-none">
              <div className="text-[10px] tracking-[0.15em] text-text-muted">
                {e.dow}
              </div>
              <div className="text-[22px] text-gold-400 mt-0.5">{e.day}</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-text-primary font-medium mb-0.5">
                {e.title}
              </div>
              <div className="text-[10px] text-text-muted font-mono">
                {e.meta}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
