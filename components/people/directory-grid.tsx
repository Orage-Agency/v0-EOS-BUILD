"use client"

import { useMemo, useState } from "react"
import { type MockUser } from "@/lib/mock-data"
import type { Role } from "@/types/permissions"
import { usePeopleStore } from "@/lib/people-store"
import type { WorkspaceMember } from "@/lib/people-server"
import { PersonCard } from "./person-card"
import { cn } from "@/lib/utils"

const AVATAR_COLORS = ["geo", "bro", "bar", "ivy"] as const

function memberToMockUser(m: WorkspaceMember): MockUser {
  const parts = m.name.trim().split(/\s+/)
  const initials = parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : (parts[0]?.slice(0, 2) ?? "??").toUpperCase()
  const colorIdx = m.id.charCodeAt(m.id.length - 1) % AVATAR_COLORS.length
  return {
    id: m.id,
    name: m.name,
    initials,
    email: m.email,
    role: m.role as Role,
    isMaster: m.isMaster,
    color: AVATAR_COLORS[colorIdx],
  }
}

type SortKey = "name" | "role" | "tenure"
type RoleFilter = "all" | "founder" | "member"

export function DirectoryGrid({ initialMembers }: { initialMembers?: WorkspaceMember[] }) {
  const profiles = usePeopleStore((s) => s.profiles)
  const openInvite = usePeopleStore((s) => s.openInvite)
  const [sort, setSort] = useState<SortKey>("name")
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all")
  const [search, setSearch] = useState("")

  // ONLY real workspace members. We previously fell back to the demo
  // USERS array when no members had joined yet, which made the directory
  // show fake teammates (Brooklyn/Baruc/Ivy) the founder couldn't manage.
  // The empty case is now a real "invite your team" affordance.
  const realUsers: MockUser[] = useMemo(
    () => (initialMembers ?? []).map(memberToMockUser),
    [initialMembers],
  )

  const isWorkspaceEmpty = realUsers.length === 0

  const visible = useMemo(() => {
    let list = realUsers
    if (roleFilter !== "all") list = list.filter((u) => u.role === roleFilter)
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      )
    }
    if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    if (sort === "role") list = [...list].sort((a, b) => a.role.localeCompare(b.role))
    if (sort === "tenure")
      list = [...list].sort((a, b) => {
        const aJ = profiles[a.id]?.joinedAt ?? ""
        const bJ = profiles[b.id]?.joinedAt ?? ""
        return bJ.localeCompare(aJ)
      })
    return list
  }, [sort, roleFilter, search, profiles, realUsers])

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <Chip
          active={false}
          onClick={() =>
            setSort((s) => (s === "name" ? "role" : s === "role" ? "tenure" : "name"))
          }
          label={`↕ Sort: ${sort === "name" ? "Name" : sort === "role" ? "Role" : "Tenure"}`}
        />
        <Chip
          active={roleFilter === "all"}
          onClick={() => setRoleFilter("all")}
          label="All Roles"
        />
        <Chip
          active={roleFilter === "founder"}
          onClick={() => setRoleFilter("founder")}
          label="Founders"
        />
        <Chip
          active={roleFilter === "member"}
          onClick={() => setRoleFilter("member")}
          label="Members"
        />
        <span className="flex-1" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email…"
          className="h-8 w-56 px-3 bg-bg-3 border border-border-orage rounded-sm text-[12px] text-text-primary placeholder:text-text-muted outline-none focus:border-gold-500"
        />
      </div>

      {isWorkspaceEmpty ? (
        <div className="rounded-md border border-dashed border-border-orage bg-bg-3/30 px-6 py-14 text-center">
          <div
            className="mx-auto mb-4 w-12 h-12 rounded-full bg-bg-3 border border-gold-500/40 flex items-center justify-center text-gold-400 text-xl"
            aria-hidden
          >
            +
          </div>
          <h3 className="font-display text-[14px] tracking-[0.22em] uppercase text-text-primary">
            Your team is just you so far
          </h3>
          <p className="mt-2 text-[12px] leading-relaxed text-text-muted max-w-md mx-auto">
            Invite teammates so you can assign rocks and tasks, run L10 with
            real participants, and delegate ownership across the org.
          </p>
          <button
            type="button"
            onClick={openInvite}
            className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-sm bg-gold-500 hover:bg-gold-400 text-text-on-gold font-display text-[11px] tracking-[0.18em] uppercase transition-colors"
          >
            Invite teammate →
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-md border border-dashed border-border-orage bg-bg-3/30 px-6 py-12 text-center">
          <div
            className="mx-auto mb-3 w-10 h-10 rounded-full bg-bg-3 border border-border-orage flex items-center justify-center text-gold-500 text-base"
            aria-hidden
          >
            ◐
          </div>
          <h3 className="font-display text-[13px] tracking-[0.18em] uppercase text-text-primary">
            No matches
          </h3>
          <p className="mt-1.5 text-[12px] leading-relaxed text-text-muted max-w-md mx-auto">
            {search
              ? `Nothing matches "${search}". Try a different search.`
              : `No ${roleFilter === "all" ? "people" : roleFilter + "s"} in this filter yet.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((u) => (
            <PersonCard key={u.id} user={u} profile={profiles[u.id]} />
          ))}
        </div>
      )}
    </>
  )
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-8 px-3 rounded-sm border text-[11px] font-mono uppercase tracking-wider transition-colors",
        active
          ? "bg-gold-500/15 border-gold-500 text-gold-400"
          : "bg-bg-3 border-border-orage text-text-secondary hover:bg-bg-hover hover:text-text-primary",
      )}
    >
      {label}
    </button>
  )
}
