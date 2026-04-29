"use client"

import { TenantLink as Link } from "@/components/tenant-link"
import { USERS } from "@/lib/mock-data"
import { usePeopleStore } from "@/lib/people-store"
import { ProfileRail } from "./profile-rail"
import { SeatCard } from "./seat-card"
import { QuarterlyConversationCard } from "./quarterly-conversation-card"
import { GWCCard } from "./gwc-card"
import { SignalsCard } from "./signals-card"
import { OwnedRocks } from "./owned-rocks"
import { OneOnOneHistory } from "./one-on-one-history"
import { OneOnOneDrawer } from "./one-on-one-drawer"
import { ScheduleModal } from "./schedule-modal"

export function ProfileShell({ userId }: { userId: string }) {
  const user = USERS.find((u) => u.id === userId)
  const profile = usePeopleStore((s) => s.profiles[userId])

  if (!user || !profile) {
    return (
      <main className="px-8 py-12 max-w-[1400px] mx-auto text-center">
        <h1 className="font-display text-text-primary text-2xl tracking-[0.06em] uppercase mb-2">
          Person Not Found
        </h1>
        <p className="text-sm text-text-muted mb-6">
          We couldn&apos;t find a profile for{" "}
          <span className="font-mono text-text-primary">{userId}</span>.
        </p>
        <Link
          href="/people"
          className="inline-flex h-9 px-4 items-center bg-gold-500 hover:bg-gold-400 text-text-on-gold text-xs font-semibold tracking-wider uppercase rounded-sm"
        >
          Back to Directory
        </Link>
      </main>
    )
  }

  return (
    <>
      <main className="px-8 py-6 max-w-[1400px] mx-auto">
        <nav className="mb-5 flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-text-muted">
          <Link
            href="/people"
            className="hover:text-text-primary transition-colors"
          >
            People
          </Link>
          <span>/</span>
          <span className="text-text-primary">{user.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          <ProfileRail user={user} profile={profile} />

          <div className="flex flex-col gap-6 min-w-0">
            <SeatCard profile={profile} />
            <QuarterlyConversationCard profile={profile} />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <GWCCard profile={profile} />
              <SignalsCard profile={profile} />
            </div>
            <OwnedRocks rockIds={profile.ownedRockIds} />
            <OneOnOneHistory personId={user.id} />
          </div>
        </div>
      </main>

      <OneOnOneDrawer />
      <ScheduleModal />
    </>
  )
}
