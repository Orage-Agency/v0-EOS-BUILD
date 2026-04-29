"use client"

import { useMemo, useState } from "react"
import { USERS } from "@/lib/mock-data"
import { usePeopleStore } from "@/lib/people-store"
import { PersonCard } from "./person-card"
import { cn } from "@/lib/utils"

type SortKey = "name" | "role" | "tenure"
type RoleFilter = "all" | "founder" | "member"

export function DirectoryGrid() {
  const profiles = usePeopleStore((s) => s.profiles)
  const [sort, setSort] = useState<SortKey>("name")
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all")
  const [activeOnly, setActiveOnly] = useState(true)

  const visible = useMemo(() => {
    let list = USERS
    if (roleFilter !== "all") list = list.filter((u) => u.role === roleFilter)
    if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    if (sort === "role") list = [...list].sort((a, b) => a.role.localeCompare(b.role))
    if (sort === "tenure")
      list = [...list].sort((a, b) => {
        const aJ = profiles[a.id]?.joinedAt ?? ""
        const bJ = profiles[b.id]?.joinedAt ?? ""
        return bJ.localeCompare(aJ)
      })
    return list
  }, [sort, roleFilter, profiles])

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
        <Chip
          active={activeOnly}
          onClick={() => setActiveOnly((v) => !v)}
          label={activeOnly ? "Active Only" : "All"}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {visible.map((u) => (
          <PersonCard key={u.id} user={u} profile={profiles[u.id]} />
        ))}
      </div>
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
