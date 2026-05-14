"use client"

/**
 * Recursive accountability chart. Each parent's children sit directly
 * underneath it with classic org-chart connectors. Layout follows the
 * `parentId` graph rather than a flat tier-by-tier row.
 */

import { toast } from "sonner"
import { SeatNode } from "./seat-node"
import { useOrgChartStore, type Seat } from "@/lib/orgchart-store"
import { cn } from "@/lib/utils"

export function TreeView() {
  const seats = useOrgChartStore((s) => s.seats)
  const filter = useOrgChartStore((s) => s.filter)
  const zoom = useOrgChartStore((s) => s.zoom)
  const addSeat = useOrgChartStore((s) => s.addSeat)
  const openDrawer = useOrgChartStore((s) => s.openDrawer)

  const visible = seats.filter((seat) => {
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

  const visibleIds = new Set(visible.map((s) => s.id))
  const roots = visible.filter(
    (s) => s.parentId === null || !visibleIds.has(s.parentId),
  )

  return (
    <div
      className="overflow-auto p-10"
      style={{ minHeight: "calc(100vh - 280px)" }}
    >
      <div
        className="flex flex-col items-center origin-top transition-transform gap-10"
        style={{
          minWidth: 1200,
          transform: `scale(${zoom / 100})`,
        }}
      >
        {roots.map((root) => (
          <SubTree key={root.id} seat={root} seats={visible} />
        ))}

        <div className="mt-4">
          <button
            type="button"
            onClick={() => {
              const id = addSeat({ title: "NEW SEAT", parentId: null })
              toast("NEW SEAT")
              openDrawer(id)
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

function SubTree({ seat, seats }: { seat: Seat; seats: Seat[] }) {
  const children = seats.filter((s) => s.parentId === seat.id)

  return (
    <div className="flex flex-col items-center">
      <SeatNode seat={seat} />

      {children.length > 0 ? (
        <>
          {/* trunk from this seat down to the children's connector bar */}
          <div className="w-px h-8 bg-border-strong" aria-hidden />

          {children.length === 1 ? (
            <SubTree seat={children[0]} seats={seats} />
          ) : (
            <div className="flex items-start">
              {children.map((child, i) => {
                const isFirst = i === 0
                const isLast = i === children.length - 1
                return (
                  <div
                    key={child.id}
                    className="flex flex-col items-center px-4"
                  >
                    {/* connector zone: horizontal bar + vertical drop */}
                    <div className="relative w-full h-8" aria-hidden>
                      {!isFirst ? (
                        <div className="absolute top-0 left-0 right-1/2 h-px bg-border-strong" />
                      ) : null}
                      {!isLast ? (
                        <div className="absolute top-0 left-1/2 right-0 h-px bg-border-strong" />
                      ) : null}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-8 bg-border-strong" />
                    </div>
                    <SubTree seat={child} seats={seats} />
                  </div>
                )
              })}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
