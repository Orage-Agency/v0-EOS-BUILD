"use client"

import { useState } from "react"
import { canEditRocks } from "@/lib/permissions"
import { useRocksStore } from "@/lib/rocks-store"
import { IcLock } from "@/components/orage/icons"
import { cn } from "@/lib/utils"

const CHIPS = [
  { id: "sort", label: "↕ Sort: Due Date" },
  { id: "group", label: "⌗ Group: Status" },
  { id: "owner", label: "👤 All Owners", default: true },
  { id: "linked", label: "↗ Linked to V/TO Goal" },
  { id: "dept", label: "⌗ Department: All" },
]

export function RocksToolbar() {
  const currentActor = useRocksStore((s) => s.currentActor)
  const allowed = currentActor ? canEditRocks(currentActor) : false
  const [active, setActive] = useState<Set<string>>(
    new Set(CHIPS.filter((c) => c.default).map((c) => c.id)),
  )

  return (
    <div className="px-8 py-3 flex items-center gap-2 border-b border-border-orage bg-bg-1 flex-wrap">
      {CHIPS.map((c) => {
        const isActive = active.has(c.id)
        return (
          <button
            key={c.id}
            type="button"
            onClick={() =>
              setActive((s) => {
                const n = new Set(s)
                n.has(c.id) ? n.delete(c.id) : n.add(c.id)
                return n
              })
            }
            className={cn(
              "px-3 py-1 rounded-sm text-[11px] flex items-center gap-1.5 transition-colors border",
              isActive
                ? "bg-gold-500/10 border-gold-500 text-gold-400"
                : "bg-bg-3 border-border-orage text-text-secondary hover:border-gold-500 hover:text-gold-400",
            )}
          >
            {c.label}
          </button>
        )
      })}
      {!allowed && (
        <div
          role="status"
          className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-sm bg-warning/10 border border-warning/40 text-warning text-[11px] font-medium"
        >
          <IcLock className="w-3 h-3" />
          You&apos;re a {(currentActor?.role ?? "member").toUpperCase()} — Rocks are read-only. Founders/Admins/Leaders can edit.
        </div>
      )}
    </div>
  )
}
