"use client"

/**
 * One seat card in the accountability chart. Renders both filled
 * and vacant states. Click filled → drawer; click empty → hire modal.
 */

import { OrageAvatar } from "@/components/orage/avatar"
import {
  type Seat,
  useOrgChartStore,
  userBySeat,
  rockCountForUser,
  openTaskCountForUser,
} from "@/lib/orgchart-store"
import { cn } from "@/lib/utils"

const GWC_CLS: Record<"yes" | "no" | "pending", string> = {
  yes: "bg-success/15 border-success text-success",
  no: "bg-danger/15 border-danger text-danger",
  pending: "bg-bg-2 text-text-muted",
}

const GWC_LABEL: Record<"yes" | "no" | "pending", string> = {
  yes: "y",
  no: "n",
  pending: "?",
}

export function SeatNode({ seat }: { seat: Seat }) {
  const openDrawer = useOrgChartStore((s) => s.openDrawer)
  const openHire = useOrgChartStore((s) => s.openHire)
  const user = userBySeat(seat)

  function onClick() {
    if (seat.vacant) openHire(seat.id)
    else openDrawer(seat.id)
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={seat.vacant ? `Fill empty seat: ${seat.title}` : `Open ${seat.title}`}
      className={cn(
        "group relative w-[240px] text-left rounded-md border-[1.5px] overflow-hidden transition-all bg-bg-3",
        seat.vacant
          ? "border-dashed border-border-orage bg-transparent hover:bg-gold-500/5 hover:border-gold-500"
          : "border-border-orage hover:border-gold-500 hover:-translate-y-0.5 hover:shadow-gold",
        seat.kind === "visionary" &&
          "border-gold-500 bg-gradient-to-br from-gold-500/10 to-gold-300/[0.04]",
        seat.kind === "integrator" &&
          "border-gold-500 bg-gradient-to-br from-gold-300/[0.08] to-gold-500/[0.04]",
      )}
    >
      <header className="flex items-center gap-2.5 px-3.5 pt-3 pb-2.5 border-b border-border-orage">
        {user ? (
          <OrageAvatar user={user} size="md" online />
        ) : (
          <span
            aria-hidden
            className="w-9 h-9 rounded-full bg-bg-2 border-[1.5px] border-dashed border-border-strong text-text-muted flex items-center justify-center text-base font-bold"
          >
            ?
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              "font-display text-sm tracking-[0.05em] leading-none mb-0.5 truncate",
              seat.vacant
                ? "text-text-muted italic font-normal text-[11px] font-sans"
                : "text-gold-400 uppercase",
            )}
          >
            {seat.vacant ? "VACANT · OPEN" : user?.name.toUpperCase()}
          </div>
          <div
            className={cn(
              "text-[10px] tracking-wide truncate",
              seat.vacant ? "text-text-muted" : "text-text-secondary",
            )}
          >
            {seat.title}
          </div>
        </div>
      </header>

      <div className="px-3.5 py-2.5 flex flex-col gap-1">
        {seat.roles.slice(0, 3).map((r, i) => (
          <p
            key={i}
            className="flex items-start gap-1.5 text-[11px] text-text-secondary leading-snug"
          >
            <span aria-hidden className="text-gold-500 leading-snug">
              ▸
            </span>
            <span className="line-clamp-1">{r}</span>
          </p>
        ))}
        {seat.roles.length > 3 ? (
          <p className="text-[9px] text-text-muted text-center pt-1 font-display tracking-[0.15em]">
            + {seat.roles.length - 3} MORE {seat.roles.length - 3 === 1 ? "ROLE" : "ROLES"}
          </p>
        ) : null}
      </div>

      <footer className="flex items-center gap-2 px-3.5 py-2 border-t border-border-orage">
        {seat.vacant ? (
          <>
            <span className="font-display text-[10px] tracking-[0.18em] text-info">
              {seat.hiringStatus === "hiring" ? "▲ HIRING" : "▲ HIRE"} ·{" "}
              {seat.hiringQuarter}
            </span>
            <span className="ml-auto font-mono text-[10px]">
              {seat.candidates ? (
                <span className="text-info">{seat.candidates} CANDIDATES</span>
              ) : (
                <span className="text-text-muted">SOURCING</span>
              )}
            </span>
          </>
        ) : (
          <>
            <div className="flex gap-0.5">
              {(["g", "w", "c"] as const).map((k) => (
                <span
                  key={k}
                  className={cn(
                    "w-3.5 h-3.5 rounded-[2px] font-display text-[8px] font-bold flex items-center justify-center border",
                    GWC_CLS[seat.gwc[k]],
                    seat.gwc[k] === "pending" && "border-border-orage",
                  )}
                  aria-label={`${k.toUpperCase()} ${GWC_LABEL[seat.gwc[k]]}`}
                >
                  {k.toUpperCase()}
                </span>
              ))}
            </div>
            {user ? (
              <div className="ml-auto flex items-center gap-1.5 font-mono">
                <span className="flex items-center gap-1 text-[10px] text-text-muted">
                  <span className="text-gold-400 font-semibold">
                    {rockCountForUser(user.id)}
                  </span>{" "}
                  ROCKS
                </span>
                <span className="flex items-center gap-1 text-[10px] text-text-muted">
                  <span className="text-gold-400 font-semibold">
                    {openTaskCountForUser(user.id)}
                  </span>{" "}
                  TASKS
                </span>
              </div>
            ) : null}
          </>
        )}
      </footer>
    </button>
  )
}
