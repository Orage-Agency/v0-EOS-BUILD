"use client"

import { toast } from "sonner"
import { useOrgChartStore } from "@/lib/orgchart-store"
import { cn } from "@/lib/utils"
import { TreeView } from "./tree-view"
import { ListView } from "./list-view"
import { GWCMatrix } from "./gwc-matrix"
import { SeatDrawer } from "./seat-drawer"
import { HireModal } from "./hire-modal"
import { OrgChartToolbar } from "./orgchart-toolbar"
import { SummaryCards } from "./summary-cards"
import { IcPlus } from "@/components/orage/icons"

const TABS: {
  id: "tree" | "list" | "gwc" | "empty"
  label: string
}[] = [
  { id: "tree", label: "Org Chart" },
  { id: "list", label: "List View" },
  { id: "gwc", label: "GWC Matrix" },
  { id: "empty", label: "Empty Seats" },
]

export function OrgChartShell() {
  const view = useOrgChartStore((s) => s.view)
  const setView = useOrgChartStore((s) => s.setView)
  const setFilter = useOrgChartStore((s) => s.setFilter)
  const seats = useOrgChartStore((s) => s.seats)
  const openNew = useOrgChartStore((s) => s.openNewSeat)

  const filled = seats.filter((s) => !s.vacant).length
  const empty = seats.length - filled
  const allYes = seats.filter(
    (s) =>
      !s.vacant && s.gwc.g === "yes" && s.gwc.w === "yes" && s.gwc.c === "yes",
  ).length

  function onTab(id: typeof TABS[number]["id"]) {
    if (id === "empty") {
      setFilter("empty")
      setView("list")
      return
    }
    setView(id)
  }

  return (
    <div className="relative z-[1] min-h-screen">
      <header className="px-8 pt-6 pb-0 flex items-start justify-between gap-5 flex-wrap">
        <div>
          <h1 className="font-display text-[36px] tracking-[0.08em] text-gold-400 leading-none mb-1">
            ACCOUNTABILITY CHART
          </h1>
          <p className="text-[12px] text-text-muted">
            Designed by seat, not by person ·{" "}
            <strong className="text-text-secondary">{seats.length} seats</strong> ·{" "}
            {filled} filled · {empty} empty (hire needs) ·{" "}
            <strong className="text-text-secondary">{allYes} GWC complete</strong> this quarter
          </p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.print()
            }}
            title="Print or save as PDF (Cmd/Ctrl+P)"
            className="px-3.5 py-2 bg-bg-3 text-text-primary border border-border-orage rounded-sm text-[12px] hover:bg-bg-4 hover:border-gold-500 transition-colors"
          >
            Export Org Chart
          </button>
          <button
            type="button"
            onClick={() => {
              openNew()
              toast("NEW SEAT")
            }}
            className="px-4 py-2 rounded-sm text-[12px] font-semibold flex items-center gap-1.5 transition-shadow text-text-on-gold hover:shadow-gold"
            style={{
              background:
                "linear-gradient(135deg, var(--gold-500), var(--gold-400))",
              boxShadow: "0 2px 8px rgba(182,128,57,0.3)",
            }}
          >
            <IcPlus className="w-3 h-3" />
            New Seat
          </button>
        </div>
      </header>

      <nav role="tablist" className="flex px-8 mt-4 border-b border-border-orage">
        {TABS.map((t) => {
          const active =
            (t.id === "tree" && view === "tree") ||
            (t.id === "list" && view === "list") ||
            (t.id === "gwc" && view === "gwc")
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTab(t.id)}
              className={cn(
                "px-5 py-2.5 text-[12px] border-b-2 -mb-px font-medium transition-colors",
                active
                  ? "text-gold-400 border-gold-500"
                  : "text-text-muted border-transparent hover:text-text-secondary",
              )}
            >
              {t.label}
              {t.id === "empty" && empty > 0 ? (
                <span className="ml-1 text-text-muted font-mono">· {empty}</span>
              ) : null}
            </button>
          )
        })}
      </nav>

      <OrgChartToolbar />
      <SummaryCards />

      {view === "tree" ? <TreeView /> : null}
      {view === "list" ? <ListView /> : null}
      {view === "gwc" ? <GWCMatrix /> : null}

      <SeatDrawer />
      <HireModal />
    </div>
  )
}
