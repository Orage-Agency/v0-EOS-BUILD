"use client"

import { OrageAvatar } from "@/components/orage/avatar"
import { useOrgChartStore, userBySeat } from "@/lib/orgchart-store"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const CELL_CLS: Record<"yes" | "no" | "pending", string> = {
  yes: "bg-success/15 border-success text-success",
  no: "bg-danger/15 border-danger text-danger",
  pending: "bg-bg-3 border-border-orage text-text-muted",
}

const CELL_LABEL: Record<"yes" | "no" | "pending", string> = {
  yes: "YES",
  no: "NO",
  pending: "?",
}

export function GWCMatrix() {
  const seats = useOrgChartStore((s) => s.filtered())
  const cycle = useOrgChartStore((s) => s.cycleGWC)

  return (
    <div className="px-8 py-6">
      <div className="bg-bg-3 border border-border-orage rounded-md overflow-hidden max-w-[1200px] mx-auto">
        <div
          className="grid gap-4 items-center px-6 py-3 border-b border-border-orage bg-bg-2 font-display text-[10px] tracking-[0.2em] uppercase text-text-muted"
          style={{
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
          }}
        >
          <span>Seat / Person</span>
          <span className="text-center text-gold-400">GET IT</span>
          <span className="text-center text-gold-400">WANT IT</span>
          <span className="text-center text-gold-400">CAPACITY</span>
        </div>

        {seats.map((seat) => {
          const user = userBySeat(seat)
          return (
            <div
              key={seat.id}
              className="grid gap-4 items-center px-6 py-4 border-b border-border-orage last:border-b-0"
              style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr" }}
            >
              <div className="flex items-center gap-3">
                {user ? (
                  <OrageAvatar user={user} size="md" />
                ) : (
                  <span className="w-8 h-8 rounded-full border border-dashed border-border-strong flex items-center justify-center text-text-muted text-base">
                    ?
                  </span>
                )}
                <div className="min-w-0">
                  <div className="font-display text-sm tracking-[0.06em] text-gold-400 uppercase truncate">
                    {seat.title}
                  </div>
                  <div className="text-[11px] text-text-secondary truncate">
                    {user ? user.name : "Vacant"}
                  </div>
                </div>
              </div>
              {(["g", "w", "c"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    if (seat.vacant) return
                    cycle(seat.id, k)
                    toast("GWC UPDATED")
                  }}
                  disabled={seat.vacant}
                  className={cn(
                    "py-3 rounded-sm border-[1.5px] font-display text-[11px] tracking-[0.15em] transition-colors",
                    CELL_CLS[seat.gwc[k]],
                    seat.vacant && "opacity-40 cursor-not-allowed",
                  )}
                >
                  {CELL_LABEL[seat.gwc[k]]}
                </button>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
