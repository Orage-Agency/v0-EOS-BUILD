"use client"

import { useEffect, useRef, useState } from "react"
import { USERS, type MockUser } from "@/lib/mock-data"
import { OrageAvatar } from "@/components/orage/avatar"
import { cn } from "@/lib/utils"

export function AssignPopover({
  open,
  anchorRef,
  onSelect,
  onClose,
  currentOwnerId,
}: {
  open: boolean
  anchorRef: React.RefObject<HTMLElement | null>
  onSelect: (user: MockUser) => void
  onClose: () => void
  currentOwnerId: string
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

  const filtered = USERS.filter((u) =>
    u.name.toLowerCase().includes(filter.toLowerCase()),
  )

  return (
    <div
      ref={ref}
      className="absolute right-0 top-[calc(100%+4px)] z-40 glass-strong border-gold-500 rounded-sm shadow-orage-md shadow-gold p-1.5 min-w-[220px] fade-in"
      role="menu"
      onClick={(e) => e.stopPropagation()}
    >
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
          <OrageAvatar user={u} size="sm" />
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
    </div>
  )
}
