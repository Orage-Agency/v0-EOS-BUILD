"use client"

import { PeopleHeader } from "./people-header"
import { DirectoryGrid } from "./directory-grid"
import { InviteModal } from "./invite-modal"

export function DirectoryShell() {
  return (
    <>
      <main className="px-8 py-6 max-w-[1400px] mx-auto">
        <PeopleHeader />
        <DirectoryGrid />
      </main>
      <InviteModal />
    </>
  )
}
