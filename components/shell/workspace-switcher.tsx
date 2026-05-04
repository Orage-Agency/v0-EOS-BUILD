"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { IcChevronDown } from "@/components/orage/icons"
import { cn } from "@/lib/utils"

export type WorkspaceOption = {
  id: string
  slug: string
  name: string
  brand_color: string | null
}

/**
 * Single-vs-multi workspace switcher.
 *
 * Multi-workspace user (the agency owner): renders a dropdown so they can
 * jump between client workspaces.
 *
 * Single-workspace user (every invited client teammate): renders a flat,
 * non-interactive label — their workspace IS their world; there's no
 * agency-style switching to expose. No tier/partnership label, just the
 * workspace name in the display font.
 */
export function WorkspaceSwitcher({
  current,
  workspaces,
}: {
  current: WorkspaceOption
  workspaces: WorkspaceOption[]
}) {
  const isSingle = workspaces.length <= 1
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isSingle || !open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("mousedown", onClick)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("mousedown", onClick)
      window.removeEventListener("keydown", onKey)
    }
  }, [open, isSingle])

  // Single workspace → flat label, no chevron, no hover affordance.
  if (isSingle) {
    return (
      <div className="mx-3 my-3 px-3 py-2.5 rounded-sm bg-bg-3 border border-border-orage flex items-center gap-2.5">
        <Swatch color={current.brand_color} initials={initialsFor(current.name)} />
        <span className="text-xs font-semibold text-text-primary truncate">
          {current.name}
        </span>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative mx-3 my-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-sm",
          "bg-bg-3 border border-border-orage hover:border-border-strong hover:bg-bg-4",
          "transition-colors text-left",
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Swatch color={current.brand_color} initials={initialsFor(current.name)} />
        <span className="flex-1 min-w-0">
          <span className="block text-xs font-semibold text-text-primary truncate">
            {current.name}
          </span>
        </span>
        <IcChevronDown className="w-3 h-3 text-text-muted" />
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute left-0 right-0 top-[calc(100%+4px)] z-50",
            "glass-strong border-gold-500 rounded-md p-1.5 shadow-orage-lg shadow-gold",
            "fade-in",
          )}
        >
          {workspaces.map((w) => (
            <Link
              key={w.id}
              href={`/${w.slug}`}
              prefetch={false}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-sm transition-colors",
                w.id === current.id
                  ? "bg-bg-active"
                  : "hover:bg-bg-active",
              )}
            >
              <Swatch color={w.brand_color} initials={initialsFor(w.name)} />
              <span className="text-xs text-text-primary font-medium truncate">
                {w.name}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function Swatch({ color, initials }: { color: string | null; initials: string }) {
  return (
    <span
      className="w-6 h-6 rounded-sm flex items-center justify-center text-[10px] font-bold text-white shrink-0"
      style={{ background: color ?? "var(--gold-500)" }}
      aria-hidden
    >
      {initials}
    </span>
  )
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return "??"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
