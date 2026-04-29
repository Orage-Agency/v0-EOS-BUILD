"use client"

import { CURRENT_USER, TENANT } from "@/lib/mock-data"
import { UserProfileMenu } from "@/components/user-profile-menu"

export function UserBar() {
  return (
    <UserProfileMenu
      user={{
        id: CURRENT_USER.id,
        fullName: CURRENT_USER.name,
        email: CURRENT_USER.email,
        role: `${CURRENT_USER.role.toUpperCase()}`,
        avatarUrl: null,
      }}
      tenantLabel={TENANT.name.split(" ")[0]}
    />
  )
}
