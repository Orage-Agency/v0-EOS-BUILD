/**
 * Orage Core · Mock tenant catalogue
 * Mirrors the tenants table — replace with real query once Supabase is wired.
 */

export type MockTenant = {
  id: string
  slug: string
  name: string
  initials: string
  /** CSS color (hex). Tenants don't follow the per-user gradient palette. */
  color: string
  role: string
  tier: "master" | "client" | "partner"
  isMaster?: boolean
}

export const TENANTS: MockTenant[] = [
  {
    id: "t_orage",
    slug: "orage",
    name: "Orage Agency LLC",
    initials: "OR",
    color: "#B68039",
    role: "FOUNDER",
    tier: "master",
    isMaster: true,
  },
  {
    id: "t_quintessa",
    slug: "quintessa",
    name: "Quintessa Marketing",
    initials: "QM",
    color: "#5A8FAA",
    role: "CLIENT · TIER 3",
    tier: "client",
  },
  {
    id: "t_boomer",
    slug: "boomer",
    name: "Boomer AI",
    initials: "BA",
    color: "#C25450",
    role: "PARTNERSHIP",
    tier: "partner",
  },
]

export const DEFAULT_TENANT_ID = TENANTS[0].id

export function getTenant(id: string): MockTenant | undefined {
  return TENANTS.find((t) => t.id === id)
}
