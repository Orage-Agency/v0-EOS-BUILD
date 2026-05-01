"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

/**
 * Click-to-edit due date pill. Renders the formatted label by default; on
 * click swaps to a native <input type="date">. Commits onChange/onBlur.
 *
 * `value` is YYYY-MM-DD or empty string. The component keeps draft state
 * locally so the parent only sees the committed value.
 */
export function InlineDateEditor({
  value,
  onChange,
  className,
  display,
  ariaLabel = "Edit due date",
  align = "left",
}: {
  value: string
  onChange: (next: string) => void
  className?: string
  display: React.ReactNode
  ariaLabel?: string
  align?: "left" | "right"
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || "")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(value || "")
  }, [value])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.showPicker?.()
    }
  }, [editing])

  function commit(next: string) {
    setEditing(false)
    if (next !== value) onChange(next)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="date"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(draft)
          if (e.key === "Escape") {
            setDraft(value || "")
            setEditing(false)
          }
          e.stopPropagation()
        }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "bg-bg-2 border border-gold-500 rounded-sm px-1.5 py-0.5 text-[11px] font-mono text-text-primary outline-none",
          align === "right" && "text-right",
          className,
        )}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        setEditing(true)
      }}
      title={value ? "Click to change due date" : "Click to set a due date"}
      className={cn(
        "rounded-sm px-1.5 py-0.5 text-left hover:bg-bg-2 hover:ring-1 hover:ring-gold-500/30 transition-colors",
        className,
      )}
      aria-label={ariaLabel}
    >
      {display}
    </button>
  )
}
