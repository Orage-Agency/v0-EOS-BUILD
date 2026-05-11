"use client"

import { useState, useTransition } from "react"
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
import { useUIStore } from "@/lib/store"
import { useWorkspaceSlug } from "@/hooks/use-workspace-slug"
import { updateProfile } from "@/app/actions/people"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Link from "next/link"

const AVATAR_PALETTE: { token: string; label: string }[] = [
  { token: "gold", label: "Gold" },
  { token: "white", label: "White" },
  { token: "pink", label: "Pink" },
  { token: "green", label: "Green" },
  { token: "blue", label: "Blue" },
  { token: "purple", label: "Purple" },
  { token: "orange", label: "Orange" },
  { token: "teal", label: "Teal" },
  { token: "red", label: "Red" },
  { token: "yellow", label: "Yellow" },
  { token: "slate", label: "Slate" },
]

export function ProfileRail({
  user,
  profile,
}: {
  user: MockUser
  profile: PersonProfile
}) {
  const openSchedule = usePeopleStore.setState
  const sessionUser = useUIStore((s) => s.currentUser)
  const workspaceSlug = useWorkspaceSlug()
  const isSelf = sessionUser?.id === user.id
  const [color, setColor] = useState<string>(user.color)
  const [picking, setPicking] = useState(false)
  const [pending, startTransition] = useTransition()
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
        <OrageAvatar
          user={{ ...user, color }}
          size="lg"
          className="!w-20 !h-20 text-2xl"
        />
        <div>
          <div className="font-display text-text-primary text-lg tracking-[0.08em] uppercase">
            {user.name}
          </div>
          <div className="text-xs text-text-secondary mt-1">{profile.title}</div>
        </div>
        <RoleBadge role={user.role} isMaster={user.isMaster} />
        {isSelf && (
          <div className="w-full flex flex-col items-center gap-2 mt-1">
            <button
              type="button"
              onClick={() => setPicking((v) => !v)}
              className="text-[10px] font-display tracking-[0.18em] text-text-muted hover:text-gold-400 uppercase"
            >
              {picking ? "Close" : "Change Color"}
            </button>
            {picking && (
              <div className="flex flex-wrap justify-center gap-1.5 px-1">
                {AVATAR_PALETTE.map((opt) => (
                  <button
                    key={opt.token}
                    type="button"
                    title={opt.label}
                    aria-label={`Pick ${opt.label}`}
                    disabled={pending}
                    onClick={() => {
                      setColor(opt.token)
                      startTransition(async () => {
                        const result = await updateProfile(
                          workspaceSlug,
                          user.id,
                          { avatarColor: opt.token },
                        )
                        if (!result.ok) {
                          toast(`Color save failed: ${result.error ?? ""}`)
                        } else {
                          toast(`Avatar color · ${opt.label}`)
                        }
                      })
                    }}
                    className={cn(
                      "avatar avatar-sm",
                      opt.token,
                      "ring-1 ring-border-orage hover:ring-gold-500 transition",
                      color === opt.token && "ring-2 ring-gold-500",
                    )}
                  >
                    {/* swatch only — empty content */}
                    <span aria-hidden> </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
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
