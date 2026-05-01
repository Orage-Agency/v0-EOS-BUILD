"use client"

import type { MockUser } from "@/lib/mock-data"
import {
  daysAgo,
  formatJoined,
  tenureDays,
  type PersonProfile,
} from "@/lib/people-store"
import { OrageAvatar } from "@/components/orage/avatar"
import { RoleBadge } from "./person-card"
import { usePeopleStore } from "@/lib/people-store"
import Link from "next/link"

export function ProfileRail({
  user,
  profile,
}: {
  user: MockUser
  profile: PersonProfile
}) {
  const openSchedule = usePeopleStore.setState
  const tenure = tenureDays(profile.joinedAt)
  const lastDays = profile.lastOneOnOne ? daysAgo(profile.lastOneOnOne) : null
  const lastTone =
    lastDays === null
      ? "text-text-muted"
      : lastDays > 14
        ? "text-warning"
        : lastDays > 30
          ? "text-danger"
          : "text-text-primary"

  return (
    <aside className="glass rounded-md p-5 flex flex-col gap-5 sticky top-6">
      <div className="flex flex-col items-center text-center gap-3">
        <OrageAvatar user={user} size="lg" className="!w-20 !h-20 text-2xl" />
        <div>
          <div className="font-display text-text-primary text-lg tracking-[0.08em] uppercase">
            {user.name}
          </div>
          <div className="text-xs text-text-secondary mt-1">{profile.title}</div>
        </div>
        <RoleBadge role={user.role} isMaster={user.isMaster} />
      </div>

      <ul className="flex flex-col gap-2 text-[11px] font-mono">
        <RailRow label="EMAIL" value={user.email} />
        <RailRow
          label="JOINED"
          value={<span suppressHydrationWarning>{formatJoined(profile.joinedAt)}</span>}
        />
        <RailRow
          label="TENURE"
          value={<span suppressHydrationWarning>{`${tenure} DAYS`}</span>}
        />
        {profile.reportsToLabel && (
          <RailRow
            label="REPORTS TO"
            value={
              <span className="text-gold-400 cursor-pointer hover:text-gold-300">
                {profile.reportsToLabel}
              </span>
            }
          />
        )}
        <RailRow label="TIMEZONE" value={profile.timezone} />
        <RailRow label="SLACK" value={profile.slack} />
        {lastDays !== null && (
          <RailRow
            label="LAST 1:1"
            value={
              <span className={lastTone} suppressHydrationWarning>
                {lastDays} DAYS AGO
              </span>
            }
          />
        )}
      </ul>

      <div className="flex flex-col gap-2">
        <button
          onClick={() =>
            openSchedule({ scheduleOpenForPersonId: user.id })
          }
          className="w-full h-9 bg-gold-500 hover:bg-gold-400 text-text-on-gold text-xs font-semibold tracking-wider uppercase rounded-sm transition-colors"
        >
          Schedule 1:1
        </button>
        <Link
          href={`mailto:${user.email}`}
          className="w-full h-9 bg-bg-3 border border-border-orage hover:bg-bg-hover text-text-secondary text-xs font-semibold tracking-wider uppercase rounded-sm transition-colors flex items-center justify-center"
        >
          Send Message
        </Link>
      </div>
    </aside>
  )
}

function RailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 px-1 py-1.5 border-b border-border-orage last:border-b-0">
      <span className="font-display text-[10px] tracking-[0.18em] text-text-muted uppercase">
        {label}
      </span>
      <span className="text-text-primary truncate">{value}</span>
    </li>
  )
}
