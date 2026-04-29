"use client"

import { TenantLink as Link } from "@/components/tenant-link"
import type { MockUser } from "@/lib/mock-data"
import type { PersonProfile, GWCAnswer } from "@/lib/people-store"
import { OrageAvatar } from "@/components/orage/avatar"
import { TASKS } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

export function PersonCard({
  user,
  profile,
}: {
  user: MockUser
  profile?: PersonProfile
}) {
  const taskCount = TASKS.filter(
    (t) => t.owner === user.id && (t.status === "open" || t.status === "in_progress"),
  ).length
  const ownedRocks = profile?.ownedRockIds.length ?? 0
  const onTime = profile?.signals.find((s) => s.label === "TASK ON-TIME RATE")?.value ?? "—"

  return (
    <Link
      href={`/people/${user.id}`}
      className="group relative flex flex-col gap-4 p-5 glass rounded-md border border-border-orage hover:border-gold-500 hover:shadow-[0_0_30px_rgba(182,128,57,0.15)] transition-all"
    >
      <div className="flex items-start gap-3">
        <OrageAvatar user={user} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="font-display text-text-primary text-base tracking-[0.08em] mb-1.5 uppercase truncate">
            {user.name}
          </div>
          <RoleBadge role={user.role} isMaster={user.isMaster} />
          <div className="text-xs text-text-secondary mt-2 truncate">
            {profile?.title ?? "—"}
          </div>
          <div className="text-[10px] text-text-muted font-mono truncate mt-0.5">
            {user.email}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border-orage">
        <Stat label="ROCKS" value={String(ownedRocks)} />
        <Stat label="TASKS" value={String(taskCount)} />
        <Stat label="ON TIME" value={onTime} />
      </div>

      {profile && (
        <div className="flex items-center gap-1.5 absolute top-4 right-4">
          <GWCDot answer={profile.gwc.g.answer} letter="G" />
          <GWCDot answer={profile.gwc.w.answer} letter="W" />
          <GWCDot answer={profile.gwc.c.answer} letter="C" />
        </div>
      )}
    </Link>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="font-display text-gold-400 text-xl tracking-tight leading-none">
        {value}
      </div>
      <div className="font-display text-text-muted text-[9px] tracking-[0.2em] mt-1 uppercase">
        {label}
      </div>
    </div>
  )
}

export function RoleBadge({
  role,
  isMaster,
}: {
  role: string
  isMaster?: boolean
}) {
  const tone = isMaster
    ? "bg-gold-500/20 text-gold-400 border-gold-500/40"
    : role === "founder"
      ? "bg-gold-500/15 text-gold-400 border-gold-500/30"
      : "bg-bg-active text-text-secondary border-border-orage"
  return (
    <span
      className={cn(
        "inline-block font-display text-[9px] tracking-[0.2em] px-2 py-0.5 rounded-sm border uppercase",
        tone,
      )}
    >
      {isMaster ? `${role} · MASTER` : role}
    </span>
  )
}

function GWCDot({ answer, letter }: { answer: GWCAnswer; letter: string }) {
  const cls =
    answer === "yes"
      ? "bg-success/20 text-success border-success/40"
      : answer === "no"
        ? "bg-danger/20 text-danger border-danger/40"
        : "bg-bg-active text-text-muted border-border-orage"
  return (
    <span
      className={cn(
        "w-5 h-5 rounded-sm border font-display text-[10px] flex items-center justify-center",
        cls,
      )}
      title={`${letter}: ${answer.toUpperCase()}`}
    >
      {answer === "pending" ? "?" : letter}
    </span>
  )
}
