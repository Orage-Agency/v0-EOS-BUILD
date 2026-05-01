"use client"

import type { WorkspaceMember } from "@/lib/people-server"
import { USERS } from "@/lib/mock-data"
import { PeopleHeader } from "./people-header"
import { DirectoryGrid } from "./directory-grid"
import { InviteModal } from "./invite-modal"

const FALLBACK_MEMBERS: WorkspaceMember[] = USERS.map((u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  avatarUrl: null,
  isMaster: u.isMaster,
  joinedAt: null,
}))

export function DirectoryShell({ initialMembers }: { initialMembers?: WorkspaceMember[] }) {
  // Header counts must reflect what the grid actually renders. The grid
  // falls back to USERS mock when initialMembers is empty, so use the
  // same source for the header counts.
  const members =
    initialMembers && initialMembers.length > 0 ? initialMembers : FALLBACK_MEMBERS

  return (
    <>
      <main className="px-8 py-6 max-w-[1400px] mx-auto">
        <PeopleHeader members={members} />
        <DirectoryGrid initialMembers={initialMembers} />
      </main>
      <InviteModal />
    </>
  )
}
