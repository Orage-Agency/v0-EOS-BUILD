"use client"

import type { WorkspaceMember } from "@/lib/people-server"
import { PeopleHeader } from "./people-header"
import { DirectoryGrid } from "./directory-grid"
import { InviteModal } from "./invite-modal"

export function DirectoryShell({ initialMembers }: { initialMembers?: WorkspaceMember[] }) {
  // Show ONLY real workspace members. The previous code substituted the
  // demo USERS array (Brooklyn / Baruc / Ivy) when initialMembers was
  // empty, which caused the founder to see fake teammates they couldn't
  // promote, suspend, or assign work to. An empty workspace should look
  // empty — that's an invite signal, not a place to fake people in.
  const members = initialMembers ?? []

  return (
    <>
      <main className="px-8 py-6 max-w-[1400px] mx-auto">
        <PeopleHeader members={members} />
        <DirectoryGrid initialMembers={members} />
      </main>
      <InviteModal />
    </>
  )
}
