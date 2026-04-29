"use client"

import { filterTenants, useTenantsStore } from "@/lib/tenants-store"
import { TenantCard } from "./tenant-card"

export function TenantGrid() {
  const tab = useTenantsStore((s) => s.tab)
  const sort = useTenantsStore((s) => s.sort)
  const statusFilter = useTenantsStore((s) => s.statusFilter)
  const hasFlagsOnly = useTenantsStore((s) => s.hasFlagsOnly)

  const tenants = filterTenants(tab, sort, statusFilter, hasFlagsOnly)

  if (tenants.length === 0) {
    return (
      <div className="px-8 py-16 text-center text-sm text-text-muted">
        No tenants match the current filters. Adjust the toolbar above to see more.
      </div>
    )
  }

  return (
    <div
      className="grid gap-3.5 px-8 py-6 pb-16"
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
      }}
    >
      {tenants.map((t) => (
        <TenantCard key={t.id} tenant={t} />
      ))}
    </div>
  )
}
