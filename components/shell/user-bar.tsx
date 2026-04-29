"use client"

import { useUIStore } from "@/lib/store"
import { CURRENT_USER, TENANT } from "@/lib/mock-data"
import { UserProfileMenu } from "@/components/user-profile-menu"

export function UserBar() {
  const sessionUser = useUIStore((s) => s.currentUser)

  const id = sessionUser?.id ?? CURRENT_USER.id
  const fullName = sessionUser?.name ?? CURRENT_USER.name
  const email = sessionUser?.email ?? CURRENT_USER.email
  const role = (sessionUser?.role ?? CURRENT_USER.role).toUpperCase()
  const avatarUrl = sessionUser?.avatarUrl ?? null
  const tenantLabel = sessionUser?.workspaceName?.split(" ")[0] ?? TENANT.name.split(" ")[0]

  return (
    <UserProfileMenu
      user={{ id, fullName, email, role, avatarUrl }}
      tenantLabel={tenantLabel}
    />
  )
}
