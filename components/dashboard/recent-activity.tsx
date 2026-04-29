import { TenantLink as Link } from "@/components/tenant-link"
import type { ActivityRow } from "@/lib/dashboard"

export function RecentActivity({ rows }: { rows: ActivityRow[] }) {
  const top = rows.slice(0, 3)
  return (
    <section className="solid mb-5 overflow-hidden">
      <header className="px-[18px] py-3.5 border-b border-border-orage flex items-center justify-between">
        <div className="font-display text-[13px] tracking-[0.22em] text-gold-400 uppercase">
          RECENT ACTIVITY
        </div>
        {rows.length > top.length && (
          <Link
            href="/settings/notifications"
            className="text-[11px] text-text-muted hover:text-gold-400 transition-colors"
          >
            View all →
          </Link>
        )}
      </header>
      <ul className="px-[18px] py-3.5">
        {top.length === 0 && (
          <li className="text-center py-6 text-xs">
            <p className="text-text-secondary mb-1">Quiet on the wire.</p>
            <p className="text-text-muted leading-relaxed max-w-[260px] mx-auto">
              Rock updates, completed tasks, scorecard drops, and issues solved
              will scroll here as the team works.
            </p>
          </li>
        )}
        {top.map((r) => (
          <li
            key={r.id}
            className="flex gap-2.5 py-2.5 border-b border-border-orage last:border-b-0 text-xs cursor-pointer transition-[padding] hover:pl-1"
          >
            <span className="dot dot-gold mt-1.5 shrink-0" aria-hidden />
            <div>
              <div
                className="text-text-secondary leading-relaxed [&_strong]:text-gold-400 [&_strong]:font-semibold"
                dangerouslySetInnerHTML={{ __html: r.html }}
              />
              <div className="text-[10px] text-text-dim mt-0.5 font-mono">
                {r.time}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
