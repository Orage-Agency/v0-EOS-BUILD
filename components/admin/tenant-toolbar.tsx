"use client"

import {
  TENANTS,
  useTenantsStore,
  type SortKey,
  type StatusFilter,
  type TenantTab,
} from "@/lib/tenants-store"
import { cn } from "@/lib/utils"

const TABS: { id: TenantTab; label: string; danger?: boolean }[] = [
  { id: "all", label: "All Tenants" },
  { id: "healthy", label: "Healthy" },
  { id: "at_risk", label: "At Risk", danger: true },
  { id: "testing", label: "Testing" },
  { id: "activity", label: "By Activity" },
]

const SORT_LABELS: Record<SortKey, string> = {
  health: "Sort: Health",
  activity: "Sort: Activity",
  name: "Sort: Name",
  joined: "Sort: Joined",
}

const SORT_NEXT: Record<SortKey, SortKey> = {
  health: "activity",
  activity: "name",
  name: "joined",
  joined: "health",
}

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "All Statuses",
  master: "Status · Master",
  active: "Status · Active",
  testing: "Status · Testing",
  archived: "Status · Archived",
}

const STATUS_NEXT: Record<StatusFilter, StatusFilter> = {
  all: "active",
  active: "testing",
  testing: "archived",
  archived: "master",
  master: "all",
}

function tabCount(tab: TenantTab) {
  if (tab === "all") return TENANTS.length
  if (tab === "healthy")
    return TENANTS.filter(
      (t) => t.health === "healthy" || t.health === "master",
    ).length
  if (tab === "at_risk")
    return TENANTS.filter(
      (t) => t.health === "at_risk" || t.health === "inactive",
    ).length
  if (tab === "testing")
    return TENANTS.filter((t) => t.status === "testing").length
  return null
}

export function TenantTabs() {
  const activeTab = useTenantsStore((s) => s.tab)
  const setTab = useTenantsStore((s) => s.setTab)

  return (
    <div
      role="tablist"
      aria-label="Tenant filter tabs"
      className="flex gap-0 px-8 border-b border-border-orage"
    >
      {TABS.map((t) => {
        const count = tabCount(t.id)
        const active = activeTab === t.id
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-[18px] py-2.5 text-xs cursor-pointer border-b-2 -mb-px transition-colors flex items-center gap-2 font-medium",
              active
                ? "text-gold-400 border-gold-500"
                : "text-text-muted border-transparent hover:text-text-secondary",
            )}
          >
            {t.label}
            {count !== null && (
              <span
                className={cn(
                  "text-[10px] px-1.5 py-px rounded-sm font-mono",
                  active
                    ? "bg-[rgba(182,128,57,0.15)] text-gold-400"
                    : t.danger
                      ? "bg-[rgba(194,84,80,0.18)] text-danger"
                      : "bg-bg-3 text-text-secondary",
                )}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function TenantToolbar() {
  const sort = useTenantsStore((s) => s.sort)
  const setSort = useTenantsStore((s) => s.setSort)
  const statusFilter = useTenantsStore((s) => s.statusFilter)
  const setStatusFilter = useTenantsStore((s) => s.setStatusFilter)
  const hasFlagsOnly = useTenantsStore((s) => s.hasFlagsOnly)
  const toggleHasFlags = useTenantsStore((s) => s.toggleHasFlags)

  return (
    <div className="px-8 py-3.5 flex items-center gap-2 border-b border-border-orage bg-bg-1 flex-wrap">
      <Chip onClick={() => setSort(SORT_NEXT[sort])}>↕ {SORT_LABELS[sort]}</Chip>
      <Chip
        active={statusFilter !== "all"}
        onClick={() => setStatusFilter(STATUS_NEXT[statusFilter])}
      >
        {STATUS_LABELS[statusFilter]}
      </Chip>
      <Chip>Last 30D Activity</Chip>
      <Chip active={hasFlagsOnly} onClick={toggleHasFlags}>
        ⚠ Has Flags
      </Chip>
      <span className="flex-1" />
      <Chip>⚙ Customize</Chip>
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1 bg-bg-3 border border-border-orage rounded-sm text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors",
        active
          ? "bg-[rgba(182,128,57,0.1)] border-gold-500 text-gold-400"
          : "text-text-secondary hover:border-gold-500 hover:text-gold-400",
      )}
    >
      {children}
    </button>
  )
}
