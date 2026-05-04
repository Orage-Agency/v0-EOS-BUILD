"use client"

import { useState } from "react"
import type { ClientTagOption } from "@/lib/client-tags"
import { cn } from "@/lib/utils"

/**
 * Client-tag picker — sits in the task drawer next to LINKED ROCK.
 * Lets the agency owner mark a task as "for Quintessa / Boomer / OKC / etc."
 * via the brand color of one of their other workspaces. Hidden entirely
 * when the user has no other workspace memberships (= a single-workspace
 * user is an end client whose dashboard shouldn't carry agency UI).
 */
export function ClientTagPicker({
  value,
  options,
  onChange,
}: {
  value: string | null
  options: ClientTagOption[]
  onChange: (clientWorkspaceId: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  if (options.length === 0) return null

  const selected = options.find((o) => o.id === value) ?? null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "font-display text-[10px] tracking-[0.15em] px-2 py-1 rounded-sm transition-colors inline-flex items-center gap-1.5",
          selected
            ? "bg-bg-3 text-text-primary border border-border-orage hover:border-gold-500/60"
            : "text-gold-400 bg-gold-500/10 hover:bg-gold-500/20",
        )}
      >
        {selected && (
          <span
            aria-hidden
            className="inline-block w-2 h-2 rounded-full ring-1 ring-border-orage"
            style={{ backgroundColor: selected.brandColor ?? "#888" }}
          />
        )}
        {selected ? selected.name.toUpperCase() : "+ TAG CLIENT"}
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-8 z-30 w-72 rounded-md border border-border-orage bg-bg-2 shadow-orage-lg py-1 text-[12px] max-h-64 overflow-y-auto"
        >
          <li>
            <button
              type="button"
              onClick={() => {
                onChange(null)
                setOpen(false)
              }}
              className={cn(
                "w-full text-left px-3 py-1.5 hover:bg-bg-3 italic",
                value === null ? "text-gold-400" : "text-text-muted",
              )}
            >
              No client (internal)
            </button>
          </li>
          {options.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(o.id)
                  setOpen(false)
                }}
                className={cn(
                  "w-full text-left px-3 py-1.5 hover:bg-bg-3 flex items-center gap-2",
                  value === o.id ? "text-gold-400" : "text-text-secondary",
                )}
              >
                <span
                  aria-hidden
                  className="inline-block w-2.5 h-2.5 rounded-full ring-1 ring-border-orage shrink-0"
                  style={{ backgroundColor: o.brandColor ?? "#888" }}
                />
                <span className="flex-1 truncate">{o.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Tiny colored dot for inline rendering on task rows / dashboard lists.
 * Returns null when there's no tag, so callers can drop it inline without
 * needing to add their own conditional.
 */
export function ClientDot({
  clientWorkspaceId,
  options,
  size = 8,
  withTitle = true,
}: {
  clientWorkspaceId: string | null | undefined
  options: ClientTagOption[]
  size?: number
  withTitle?: boolean
}) {
  if (!clientWorkspaceId) return null
  const opt = options.find((o) => o.id === clientWorkspaceId)
  if (!opt) return null
  return (
    <span
      aria-label={`Client: ${opt.name}`}
      title={withTitle ? opt.name : undefined}
      className="inline-block rounded-full ring-1 ring-border-orage shrink-0"
      style={{
        backgroundColor: opt.brandColor ?? "#888",
        width: `${size}px`,
        height: `${size}px`,
      }}
    />
  )
}
