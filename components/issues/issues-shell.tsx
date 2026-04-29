"use client"

import { useIssuesStore, queueCounts, type IssueQueue } from "@/lib/issues-store"
import { IcPlus } from "@/components/orage/icons"
import { cn } from "@/lib/utils"
import { AIIssueSuggestions } from "./ai-issue-suggestions"
import { IssuesList } from "./issues-list"
import { IssuesRightRail } from "./right-rail"
import { IssueDrawer } from "./issue-drawer"
import { ResolveModal } from "./resolve-modal"
import { NewIssueModal } from "./new-issue-modal"

const TABS: { queue: IssueQueue; label: string }[] = [
  { queue: "open", label: "Open Queue" },
  { queue: "this_week", label: "This Week's L10" },
  { queue: "solved", label: "Solved" },
  { queue: "tabled", label: "Tabled" },
]

export function IssuesShell() {
  const { issues, activeQueue, setActiveQueue, openNewIssue } = useIssuesStore()
  const counts = queueCounts(issues)
  const open = counts.open
  const pinned = counts.this_week

  return (
    <div className="relative z-[1] pb-16">
      <header className="px-8 pt-6 flex items-start justify-between gap-5">
        <div>
          <h1 className="h-page" style={{ fontSize: 36 }}>
            ISSUES
          </h1>
          <p className="text-[12px] text-text-muted mt-1">
            {open} open · {pinned} pinned for Monday&apos;s L10 · drag to reorder
            priority · top 3 surface in meeting
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-3.5 py-2 bg-bg-3 text-text-primary border border-border-orage rounded-sm text-[12px] hover:bg-bg-4 hover:border-gold-500 transition-colors"
          >
            Export to L10
          </button>
          <button
            type="button"
            onClick={openNewIssue}
            className="px-4 py-2 rounded-sm text-[12px] font-semibold flex items-center gap-1.5 bg-gradient-to-br from-gold-500 to-gold-400 text-text-on-gold hover:-translate-y-px transition-transform"
            style={{ boxShadow: "0 2px 8px rgba(182,128,57,0.3)" }}
          >
            <IcPlus className="w-3 h-3" />
            Drop Issue
          </button>
        </div>
      </header>

      <nav
        role="tablist"
        aria-label="Issue queues"
        className="flex gap-0 px-8 mt-4 border-b border-border-orage"
      >
        {TABS.map((t) => {
          const active = activeQueue === t.queue
          const count = counts[t.queue]
          return (
            <button
              key={t.queue}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveQueue(t.queue)}
              className={cn(
                "px-4 py-2.5 text-[12px] font-medium flex items-center gap-2 border-b-2 -mb-px transition-colors",
                active
                  ? "text-gold-400 border-gold-500"
                  : "text-text-muted border-transparent hover:text-text-secondary",
              )}
            >
              {t.label}
              <span
                className={cn(
                  "text-[10px] px-1.5 py-px rounded-pill font-mono",
                  active ? "bg-[rgba(182,128,57,0.15)] text-gold-400" : "bg-bg-3 text-text-secondary",
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </nav>

      <div className="px-8 py-3.5 border-b border-border-orage bg-bg-1 flex items-center gap-2 flex-wrap">
        <Chip label="↕ Sort: Rank" />
        <Chip label="⚠ Severity: All" active />
        <Chip label="👤 Owner: All" />
        <Chip label="↗ Source: All" />
        <Chip label="⌗ Department: All" />
        <span className="ml-auto text-[10px] text-text-muted font-mono">
          ⇧+CLICK = MOVE TO L10 · DRAG = REORDER RANK
        </span>
      </div>

      <div
        className="px-8 py-5 grid gap-5"
        style={{ gridTemplateColumns: "minmax(0, 1fr) 320px" }}
      >
        <div className="flex flex-col gap-4 min-w-0">
          <AIIssueSuggestions />
          <IssuesList />
        </div>
        <IssuesRightRail />
      </div>

      <IssueDrawer />
      <ResolveModal />
      <NewIssueModal />
    </div>
  )
}

function Chip({ label, active }: { label: string; active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "px-3 py-1.5 rounded-sm border text-[11px] transition-colors flex items-center gap-1.5",
        active
          ? "bg-[rgba(182,128,57,0.1)] border-gold-500 text-gold-400"
          : "bg-bg-3 border-border-orage text-text-secondary hover:border-gold-500 hover:text-gold-400",
      )}
    >
      {label}
    </button>
  )
}
