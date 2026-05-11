"use client"

import { useEffect, useRef, useState } from "react"
import { USERS, type MockUser } from "@/lib/mock-data"
import type { WorkspaceMember } from "@/lib/tasks-server"
import { OrageAvatar } from "@/components/orage/avatar"
import { cn } from "@/lib/utils"

// What the popover yields when a teammate is picked. Real workspace
// members carry a UUID `id`; demo seeded users carry the legacy
// `u_xxx` form. Callers that send to a server action MUST handle both.
export type AssignTarget = {
  id: string
  name: string
  initials: string
  role: string
  color?: MockUser["color"] | string
}

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return "??"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function AssignPopover({
  open,
  anchorRef,
  onSelect,
  onClose,
  currentOwnerId,
  members,
}: {
  open: boolean
  anchorRef: React.RefObject<HTMLElement | null>
  onSelect: (user: AssignTarget) => void
  onClose: () => void
  currentOwnerId: string
  /**
   * Real workspace members from the store. When provided (and non-empty),
   * the popover shows these instead of the demo USERS — picking one yields
   * a real Supabase UUID so the server action actually persists. Falls
   * back to demo USERS only if nothing was passed (e.g. early page load
   * before the store has hydrated).
   */
  members?: WorkspaceMember[]
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [filter, setFilter] = useState("")

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        ref.current &&
        !ref.current.contains(target) &&
        anchorRef.current &&
        !anchorRef.current.contains(target)
      ) {
        onClose()
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("mousedown", onDoc)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("mousedown", onDoc)
      window.removeEventListener("keydown", onKey)
    }
  }, [open, anchorRef, onClose])

  if (!open) return null

  // If a caller explicitly passes `members` (even an empty array), trust
  // that — an empty workspace should NOT silently fall back to the demo
  // USERS so the founder ends up trying to assign work to fake people.
  // Fallback to demo USERS only when `members` was never provided
  // (legacy callers that haven't been updated yet).
  const usingRealMembers = members !== undefined
  const source: AssignTarget[] = usingRealMembers
    ? (members ?? []).map((m) => ({
        id: m.id,
        name: m.name,
        initials: m.initials || deriveInitials(m.name),
        role: m.role,
        color: m.color ?? undefined,
      }))
    : USERS.map((u) => ({
        id: u.id,
        name: u.name,
        initials: u.initials,
        role: u.role,
        color: u.color,
      }))

  const filtered = source.filter((u) =>
    u.name.toLowerCase().includes(filter.toLowerCase()),
  )

  const noTeammates = usingRealMembers && source.length === 0

  return (
    <div
      ref={ref}
      className="absolute right-0 top-[calc(100%+4px)] z-40 glass-strong border-gold-500 rounded-sm shadow-orage-md shadow-gold p-1.5 min-w-[240px] fade-in"
      role="menu"
      onClick={(e) => e.stopPropagation()}
    >
      {noTeammates ? (
        <div className="px-3 py-4 text-center">
          <div className="text-xs text-text-primary mb-1">No teammates yet</div>
          <div className="text-[11px] text-text-muted leading-relaxed">
            Invite your team from the People page so you can hand off work.
          </div>
        </div>
      ) : (
        <>
          <input
            autoFocus
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search teammate…"
            className="w-full px-2.5 py-2 bg-bg-3 border border-border-orage rounded-sm text-text-primary text-xs mb-1.5 focus:border-gold-500 outline-none"
          />
          {filtered.map((u) => (
            <button
              key={u.id}
              role="menuitem"
              type="button"
              onClick={() => onSelect(u)}
              className={cn(
                "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-sm hover:bg-bg-active transition-colors text-left",
                u.id === currentOwnerId && "bg-bg-active",
              )}
            >
              <OrageAvatar
                user={{
                  name: u.name,
                  initials: u.initials,
                  color: u.color,
                }}
                size="sm"
              />
              <span className="text-xs text-text-primary flex-1">{u.name}</span>
              <span className="font-display text-[9px] tracking-[0.15em] text-gold-500">
                {u.role.toUpperCase()}
              </span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-2 py-3 text-center text-text-muted text-xs">
              No matches
            </div>
          )}
        </>
      )}
    </div>
  )
}
