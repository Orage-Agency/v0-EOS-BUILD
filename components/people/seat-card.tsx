"use client"

import { TenantLink as Link } from "@/components/tenant-link"
import type { PersonProfile } from "@/lib/people-store"

export function SeatCard({ profile }: { profile: PersonProfile }) {
  return (
    <section className="glass rounded-md p-5">
      <header className="flex items-center justify-between mb-4">
        <h3 className="font-display text-gold-400 text-sm tracking-[0.18em] uppercase">
          Accountability Seat
        </h3>
        <Link
          href="/orgchart"
          className="text-[11px] text-text-muted hover:text-gold-400 transition-colors uppercase font-mono"
        >
          View on Org Chart →
        </Link>
      </header>
      <div className="font-display text-text-primary text-base tracking-[0.1em] uppercase mb-4">
        {profile.title}
      </div>
      <ul className="flex flex-col gap-2">
        {profile.seatRoles.map((r, i) => (
          <li
            key={i}
            className="flex items-start gap-3 text-sm text-text-secondary leading-relaxed"
          >
            <span className="text-gold-500 mt-0.5 flex-shrink-0">●</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
