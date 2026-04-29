"use client"

import type { WorkspaceMember } from "@/lib/people-server"
import { PeopleHeader } from "./people-header"
import { DirectoryGrid } from "./directory-grid"
import { InviteModal } from "./invite-modal"

export function DirectoryShell({ initialMembers }: { initialMembers?: WorkspaceMember[] }) {
  return (
    <>
      <main className="px-8 py-6 max-w-[1400px] mx-auto">
        <PeopleHeader />
        <DirectoryGrid initialMembers={initialMembers} />
      </main>
      <InviteModal />
    </>
  )
}
