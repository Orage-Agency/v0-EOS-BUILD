"use client"

/**
 * 3-tier static tree layout. Tier 1 = visionary + integrator,
 * tier 2 = department heads beneath the integrator, tier 3 = ICs.
 */

import { toast } from "sonner"
import { SeatNode } from "./seat-node"
import { useOrgChartStore } from "@/lib/orgchart-store"
import { cn } from "@/lib/utils"

export function TreeView() {
  const seats = useOrgChartStore((s) => s.seats)
  const filter = useOrgChartStore((s) => s.filter)
  const zoom = useOrgChartStore((s) => s.zoom)
  const openNew = useOrgChartStore((s) => s.openNewSeat)

  const filtered = seats.filter((seat) => {
    if (filter === "all") return true
    if (filter === "filled") return !seat.vacant
    if (filter === "empty") return seat.vacant
    if (filter === "gwc-issues")
      return (
        !seat.vacant &&
        (seat.gwc.g !== "yes" || seat.gwc.w !== "yes" || seat.gwc.c !== "yes")
      )
    return true
  })

  const tier1 = filtered.filter((s) => s.tier === 1)
  const tier2 = filtered.filter((s) => s.tier === 2)
  const tier3 = filtered.filter((s) => s.tier === 3)

  return (
    <div
      className="overflow-auto p-10"
      style={{ minHeight: "calc(100vh - 280px)" }}
    >
      <div
        className="flex flex-col items-center origin-top transition-transform"
        style={{
          minWidth: 1200,
          transform: `scale(${zoom / 100})`,
        }}
      >
        <Tier seats={tier1} isFirst />
        <Tier seats={tier2} />
        {tier3.length > 0 ? <Tier seats={tier3} /> : null}

        <div className="mt-8">
          <button
            type="button"
            onClick={() => {
              openNew()
              toast("NEW SEAT")
            }}
            className="px-5 py-3.5 bg-transparent border border-dashed border-border-orage rounded-md text-text-muted font-display text-[11px] tracking-[0.15em] flex items-center justify-center gap-2 w-[240px] hover:border-gold-500 hover:text-gold-400 hover:bg-gold-500/5 transition-colors"
          >
            + ADD SEAT
          </button>
        </div>
      </div>
    </div>
  )
}

function Tier({
  seats,
  isFirst,
}: {
  seats: ReturnType<typeof useOrgChartStore.getState>["seats"]
  isFirst?: boolean
}) {
  if (seats.length === 0) return null
  return (
    <div
      className={cn(
        "relative flex justify-center gap-6 mb-14",
        !isFirst &&
          "before:content-[''] before:absolute before:-top-7 before:left-1/2 before:w-px before:h-7 before:bg-border-strong",
      )}
    >
      {seats.map((s) => (
        <div key={s.id} className="relative flex flex-col items-center">
          <SeatNode seat={s} />
        </div>
      ))}
    </div>
  )
}
