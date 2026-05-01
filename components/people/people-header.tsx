"use client"

import { usePeopleStore } from "@/lib/people-store"
import { IcPlus } from "@/components/orage/icons"
import { TenantLink } from "@/components/tenant-link"
import type { WorkspaceMember } from "@/lib/people-server"

export function PeopleHeader({
  members,
}: {
  members: WorkspaceMember[]
}) {
  const profiles = usePeopleStore((s) => s.profiles)
  const openInvite = usePeopleStore((s) => s.openInvite)
  const total = members.length
  const founders = members.filter((m) => m.role === "founder" || m.role === "owner").length
  const teamMembers = total - founders
  const dueQC = Object.values(profiles).filter(
    (p) => p.quarterlyConversation.dueThisWeek,
  ).length

  return (
    <header className="flex items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="font-display text-text-primary text-3xl tracking-[0.05em] mb-1">
          PEOPLE
        </h1>
        <p className="text-sm text-text-muted">
          {total} active · {founders} {founders === 1 ? "founder" : "founders"} · {teamMembers} {teamMembers === 1 ? "member" : "members"}
          {dueQC > 0 && ` · ${dueQC} quarterly conversation${dueQC > 1 ? "s" : ""} due`}
          {total > 1 && " · click any card for full profile"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <TenantLink
          href="/orgchart"
          className="h-9 px-4 bg-bg-3 border border-border-orage hover:bg-bg-hover text-text-secondary text-xs font-semibold tracking-wider uppercase rounded-sm transition-colors flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
        >
          Org Chart
        </TenantLink>
        <button
          onClick={openInvite}
          className="h-9 px-4 bg-gold-500 hover:bg-gold-400 text-text-on-gold text-xs font-semibold tracking-wider uppercase rounded-sm transition-colors inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-1"
        >
          <IcPlus className="w-3 h-3" />
          Invite Person
        </button>
      </div>
    </header>
  )
}
