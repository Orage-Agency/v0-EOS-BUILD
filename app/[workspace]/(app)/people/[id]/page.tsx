import { ProfileShell } from "@/components/people/profile-shell"
import { listWorkspaceMembers } from "@/lib/people-server"
import { USERS, type MockUser } from "@/lib/mock-data"
import type { Role } from "@/types/permissions"

const AVATAR_COLORS = ["geo", "bro", "bar", "ivy"] as const

function memberToMockUser(m: {
  id: string
  name: string
  email: string
  role: string
  avatarUrl: string | null
  isMaster: boolean
}): MockUser {
  const parts = m.name.trim().split(/\s+/)
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : (parts[0]?.slice(0, 2) ?? "??").toUpperCase()
  const colorIdx = m.id.charCodeAt(m.id.length - 1) % AVATAR_COLORS.length
  return {
    id: m.id,
    name: m.name,
    initials,
    email: m.email,
    role: m.role as Role,
    isMaster: m.isMaster,
    color: AVATAR_COLORS[colorIdx],
  }
}

export default async function PersonPage({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>
}) {
  const { workspace, id } = await params

  // Try the real DB first (workspace_memberships → profiles).
  const members = await listWorkspaceMembers(workspace)
  const real = members.find((m) => m.id === id)

  // Fall back to the demo USERS mock so existing seeded ids still resolve.
  const mock = USERS.find((u) => u.id === id)
  const user = real ? memberToMockUser(real) : mock

  return <ProfileShell userId={id} initialUser={user} />
}
