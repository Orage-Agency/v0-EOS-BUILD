"use client"

import { OrageAvatar } from "@/components/orage/avatar"
import {
  useOrgChartStore,
  userBySeat,
  rockCountForUser,
  openTaskCountForUser,
} from "@/lib/orgchart-store"
import { cn } from "@/lib/utils"

const GWC_DOT: Record<"yes" | "no" | "pending", string> = {
  yes: "bg-success",
  no: "bg-danger",
  pending: "bg-text-muted",
}

export function ListView() {
  const seats = useOrgChartStore((s) => s.filtered())
  const openDrawer = useOrgChartStore((s) => s.openDrawer)
  const openHire = useOrgChartStore((s) => s.openHire)

  return (
    <div className="px-8 py-6">
      <div className="bg-bg-3 border border-border-orage rounded-md overflow-hidden">
        <div
          className="grid items-center gap-4 px-5 py-3 border-b border-border-orage bg-bg-2 font-display text-[10px] tracking-[0.18em] text-text-muted uppercase"
          style={{
            gridTemplateColumns: "1.5fr 1.2fr 1.2fr 0.8fr 1fr 1fr 0.6fr",
          }}
        >
          <span>Seat</span>
          <span>Department</span>
          <span>Person</span>
          <span>Status</span>
          <span>GWC</span>
          <span>Reports To</span>
          <span className="text-right">Stats</span>
        </div>
        {seats.map((seat) => {
          const user = userBySeat(seat)
          return (
            <button
              key={seat.id}
              type="button"
              onClick={() =>
                seat.vacant ? openHire(seat.id) : openDrawer(seat.id)
              }
              className={cn(
                "grid w-full items-center gap-4 px-5 py-3 border-b border-border-orage last:border-b-0 text-left transition-colors hover:bg-bg-4",
                seat.kind === "visionary" || seat.kind === "integrator"
                  ? "bg-gold-500/[0.04]"
                  : "",
              )}
              style={{
                gridTemplateColumns: "1.5fr 1.2fr 1.2fr 0.8fr 1fr 1fr 0.6fr",
              }}
            >
              <span className="font-display text-[12px] tracking-[0.06em] text-gold-400 uppercase">
                {seat.title}
              </span>
              <span className="text-[12px] text-text-secondary">
                {seat.department}
              </span>
              <span className="text-[12px] text-text-primary flex items-center gap-2">
                {user ? (
                  <>
                    <OrageAvatar user={user} size="xs" />
                    {user.name}
                  </>
                ) : (
                  <span className="italic text-text-muted">VACANT</span>
                )}
              </span>
              <span
                className={cn(
                  "font-display text-[10px] tracking-[0.15em] uppercase",
                  seat.vacant ? "text-info" : "text-success",
                )}
              >
                {seat.vacant
                  ? `Hiring · ${seat.hiringQuarter}`
                  : "Filled"}
              </span>
              <span className="flex gap-1.5">
                {(["g", "w", "c"] as const).map((k) => (
                  <span
                    key={k}
                    className={cn(
                      "w-2 h-2 rounded-full",
                      GWC_DOT[seat.gwc[k]],
                    )}
                    aria-label={`${k.toUpperCase()} ${seat.gwc[k]}`}
                  />
                ))}
              </span>
              <span className="text-[11px] text-text-muted">
                {seat.reportsToLabel ?? "—"}
              </span>
              <span className="text-right font-mono text-[11px] text-text-muted">
                {user
                  ? `${rockCountForUser(user.id)}r · ${openTaskCountForUser(user.id)}t`
                  : seat.candidates
                    ? `${seat.candidates} cand`
                    : "—"}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
