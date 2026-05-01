"use client"

import { useMemo, useState } from "react"
import { USERS, type MockUser } from "@/lib/mock-data"
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
  const [sort, setSort] = useState<SortKey>("name")
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all")
  const [search, setSearch] = useState("")

  // Use real DB members when available, fall back to mock USERS for demo
  const mockUsers: MockUser[] = useMemo(
    () =>
      initialMembers && initialMembers.length > 0
        ? initialMembers.map(memberToMockUser)
        : USERS,
    [initialMembers],
  )

  const visible = useMemo(() => {
    let list = mockUsers
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
  }, [sort, roleFilter, search, profiles, mockUsers])

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

      {visible.length === 0 ? (
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
