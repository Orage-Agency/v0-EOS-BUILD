"use client"

import { useOrgChartStore } from "@/lib/orgchart-store"
import { cn } from "@/lib/utils"

const FILTERS: {
  id: ReturnType<typeof useOrgChartStore.getState>["filter"]
  label: string
}[] = [
  { id: "all", label: "All Departments" },
  { id: "filled", label: "Filled Only" },
  { id: "empty", label: "Empty Only" },
  { id: "gwc-issues", label: "GWC Issues" },
]

export function OrgChartToolbar() {
  const filter = useOrgChartStore((s) => s.filter)
  const setFilter = useOrgChartStore((s) => s.setFilter)
  const view = useOrgChartStore((s) => s.view)
  const zoom = useOrgChartStore((s) => s.zoom)
  const setZoom = useOrgChartStore((s) => s.setZoom)

  return (
    <div className="px-8 py-3.5 flex items-center gap-2 border-b border-border-orage bg-bg-1 flex-wrap">
      {FILTERS.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => setFilter(f.id)}
          className={cn(
            "px-3 py-1.5 rounded-sm border text-[11px] transition-colors",
            filter === f.id
              ? "bg-gold-500/10 border-gold-500 text-gold-400"
              : "bg-bg-3 border-border-orage text-text-secondary hover:border-gold-500 hover:text-gold-400",
          )}
        >
          {f.label}
        </button>
      ))}

      <span className="flex-1" />

      {view === "tree" ? (
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-bg-3 border border-border-orage rounded-sm">
          <button
            type="button"
            onClick={() => setZoom(zoom - 10)}
            aria-label="Zoom out"
            className="w-[22px] h-[22px] rounded-sm flex items-center justify-center text-text-muted hover:bg-bg-4 hover:text-gold-400 transition-colors"
          >
            −
          </button>
          <span className="font-mono text-[11px] text-text-secondary min-w-[42px] text-center">
            {zoom}%
          </span>
          <button
            type="button"
            onClick={() => setZoom(zoom + 10)}
            aria-label="Zoom in"
            className="w-[22px] h-[22px] rounded-sm flex items-center justify-center text-text-muted hover:bg-bg-4 hover:text-gold-400 transition-colors"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setZoom(100)}
            aria-label="Fit to screen"
            className="w-[22px] h-[22px] rounded-sm flex items-center justify-center text-text-muted hover:bg-bg-4 hover:text-gold-400 transition-colors"
          >
            ⛶
          </button>
        </div>
      ) : null}
    </div>
  )
}
