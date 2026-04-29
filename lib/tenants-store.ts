"use client"

import { create } from "zustand"

// ============================================================================
// TYPES — mirrors V0-PROMPT TenantSummary + TenantDetail
// ============================================================================

export type TenantStatus = "master" | "active" | "testing" | "archived"

export type HealthBand = "green" | "yellow" | "red"

export type FlagKind = "warn" | "danger" | "info" | "success"

export type LogoVariant = "default" | "bl" | "gr" | "rd" | "pr"

export type TenantHealth = "healthy" | "at_risk" | "inactive" | "master"

export type TenantFlag = {
  label: string
  kind: FlagKind
  /** AI-suggested action shown inside the drawer */
  recommendation?: string
}

export type TenantStat = {
  label: string
  value: string
  meta: string
  trend?: "up" | "down" | null
}

export type UsageMetric = {
  label: string
  value: string
  trend: string
  trendKind: "success" | "warning" | "danger" | null
  /** 0..100 */
  percent: number
  fillKind: "default" | "green" | "red"
}

export type AuditEntry = {
  actor: "GEORGE" | "BROOKLYN" | "SYSTEM"
  when: string
  text: string
}

export type RiskNote = {
  kind: "warn" | "info" | "danger"
  label: string
  text: string
}

export type Tenant = {
  id: string
  slug: string
  name: string
  domain: string
  initials: string
  logoVariant: LogoVariant
  status: TenantStatus
  health: TenantHealth
  healthScore: number
  healthLabel: string
  joined: string
  ownerName: string
  ownerEmail: string
  provisionedBy: string
  seatsUsed: number
  seatsTotal: number
  daysAgo: number
  stats: TenantStat[]
  flags: TenantFlag[]
  usage: UsageMetric[]
  risks: RiskNote[]
  audit: AuditEntry[]
}

// ============================================================================
// MOCK CATALOGUE — matches the eight cards in 13-tenants.html
// ============================================================================

export const TENANTS: Tenant[] = [
  {
    id: "orage",
    slug: "orage",
    name: "ORAGE AGENCY LLC",
    domain: "orage.agency · master",
    initials: "OR",
    logoVariant: "default",
    status: "master",
    health: "master",
    healthScore: 94,
    healthLabel: "HEALTH",
    joined: "JOINED JAN 2026 · OWNER · GEORGE",
    ownerName: "George Moffat",
    ownerEmail: "george@orage.agency",
    provisionedBy: "Self · master",
    seatsUsed: 4,
    seatsTotal: 4,
    daysAgo: 110,
    stats: [],
    flags: [{ label: "FOUNDER ACTIVE", kind: "success" }],
    usage: [],
    risks: [],
    audit: [],
  },
]

// ============================================================================
// VIEWS / TABS / SORT / FILTERS
// ============================================================================

export type TenantTab = "all" | "healthy" | "at_risk" | "testing" | "activity"
export type SortKey = "health" | "activity" | "name" | "joined"
export type StatusFilter = "all" | TenantStatus

// ============================================================================
// STORE
// ============================================================================

type TenantsStore = {
  // Selection
  drawerTenantId: string | null
  openDrawer: (id: string) => void
  closeDrawer: () => void

  // Provisioning
  provisionOpen: boolean
  openProvision: () => void
  closeProvision: () => void

  // Filters
  tab: TenantTab
  sort: SortKey
  statusFilter: StatusFilter
  hasFlagsOnly: boolean
  setTab: (t: TenantTab) => void
  setSort: (s: SortKey) => void
  setStatusFilter: (s: StatusFilter) => void
  toggleHasFlags: () => void

  // Impersonation (mock — would set a cookie + redirect server-side)
  impersonatingId: string | null
  startImpersonation: (id: string) => void
  endImpersonation: () => void

  // Master audit log (mock cross-tenant feed)
  globalAudit: AuditEntry[]
}

const GLOBAL_AUDIT: AuditEntry[] = [
  {
    actor: "GEORGE",
    when: "APR 25 · 08:42",
    text: "Reviewed Boomer AI risk flags · scheduled onboarding refresher with Mike",
  },
  {
    actor: "GEORGE",
    when: "APR 23 · 09:14",
    text: "Impersonated Boomer AI for 8 minutes · viewed Rocks + Issues",
  },
  {
    actor: "BROOKLYN",
    when: "APR 22 · 10:15",
    text: "Sent check-in DM to Atlas Legal owner",
  },
  {
    actor: "BROOKLYN",
    when: "APR 18 · 16:30",
    text: "Sent direct message to Boomer AI owner re: support ticket #42 escalation",
  },
  {
    actor: "GEORGE",
    when: "APR 09 · 11:22",
    text: "Adjusted Boomer AI seat limit · 100 → 200 · tenant request",
  },
  {
    actor: "SYSTEM",
    when: "APR 21 · 14:00",
    text: "Provisioned Prime Landscaping · testing tenant · 5 seats",
  },
  {
    actor: "SYSTEM",
    when: "MAR 14 · 02:00",
    text: "Provisioned Boomer AI · founder invite sent",
  },
]

export const useTenantsStore = create<TenantsStore>((set) => ({
  drawerTenantId: null,
  openDrawer: (id) => set({ drawerTenantId: id }),
  closeDrawer: () => set({ drawerTenantId: null }),

  provisionOpen: false,
  openProvision: () => set({ provisionOpen: true }),
  closeProvision: () => set({ provisionOpen: false }),

  tab: "all",
  sort: "health",
  statusFilter: "all",
  hasFlagsOnly: false,
  setTab: (t) => set({ tab: t }),
  setSort: (s) => set({ sort: s }),
  setStatusFilter: (s) => set({ statusFilter: s }),
  toggleHasFlags: () => set((s) => ({ hasFlagsOnly: !s.hasFlagsOnly })),

  impersonatingId: null,
  startImpersonation: (id) => set({ impersonatingId: id, drawerTenantId: null }),
  endImpersonation: () => set({ impersonatingId: null }),

  globalAudit: GLOBAL_AUDIT,
}))

// ============================================================================
// SELECTORS / DERIVED
// ============================================================================

export function getTenant(id: string): Tenant | undefined {
  return TENANTS.find((t) => t.id === id)
}

export function filterTenants(
  tab: TenantTab,
  sort: SortKey,
  statusFilter: StatusFilter,
  hasFlagsOnly: boolean,
): Tenant[] {
  let list = [...TENANTS]
  if (tab === "healthy") list = list.filter((t) => t.health === "healthy" || t.health === "master")
  else if (tab === "at_risk")
    list = list.filter((t) => t.health === "at_risk" || t.health === "inactive")
  else if (tab === "testing") list = list.filter((t) => t.status === "testing")

  if (statusFilter !== "all") list = list.filter((t) => t.status === statusFilter)
  if (hasFlagsOnly)
    list = list.filter((t) =>
      t.flags.some((f) => f.kind === "warn" || f.kind === "danger"),
    )

  switch (sort) {
    case "health":
      list.sort((a, b) => b.healthScore - a.healthScore)
      break
    case "activity":
      list.sort((a, b) => a.daysAgo - b.daysAgo)
      break
    case "name":
      list.sort((a, b) => a.name.localeCompare(b.name))
      break
    case "joined":
      list.sort((a, b) => a.daysAgo - b.daysAgo)
      break
  }
  if (tab === "activity") list.sort((a, b) => a.daysAgo - b.daysAgo)
  return list
}

export type GlobalKpis = {
  totalTenants: number
  active: number
  testing: number
  archived: number
  newLast30: number
  inactiveLast30: number
  activeUsers7d: number
  activeUsers7dDelta: number
  healthy: number
  atRisk: number
  inactive: number
  newNames: string[]
}

/**
 * Reset-to-Zero: Bird's Eye admin starts with a single master tenant (Orage)
 * and zero customer tenants. Customer rows appear here only after a real
 * provisioning event.
 */
export const GLOBAL_KPIS: GlobalKpis = {
  totalTenants: 1,
  active: 0,
  testing: 0,
  archived: 0,
  newLast30: 0,
  inactiveLast30: 0,
  activeUsers7d: 1,
  activeUsers7dDelta: 0,
  healthy: 0,
  atRisk: 0,
  inactive: 0,
  newNames: [],
}

