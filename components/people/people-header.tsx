"use client"

import { USERS } from "@/lib/mock-data"
import { usePeopleStore } from "@/lib/people-store"
import { IcPlus } from "@/components/orage/icons"

export function PeopleHeader() {
  const profiles = usePeopleStore((s) => s.profiles)
  const openInvite = usePeopleStore((s) => s.openInvite)
  const founders = USERS.filter((u) => u.role === "founder").length
  const members = USERS.filter((u) => u.role === "member").length
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
          {USERS.length} active · {founders} founders · {members} members
          {dueQC > 0 && ` · ${dueQC} quarterly conversation${dueQC > 1 ? "s" : ""} due`}{" "}
          · click any card for full profile
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button className="h-9 px-4 bg-bg-3 border border-border-orage hover:bg-bg-hover text-text-secondary text-xs font-semibold tracking-wider uppercase rounded-sm transition-colors">
          Org Chart
        </button>
        <button
          onClick={openInvite}
          className="h-9 px-4 bg-gold-500 hover:bg-gold-400 text-text-on-gold text-xs font-semibold tracking-wider uppercase rounded-sm transition-colors inline-flex items-center gap-2"
        >
          <IcPlus className="w-3 h-3" />
          Invite Person
        </button>
      </div>
    </header>
  )
}
