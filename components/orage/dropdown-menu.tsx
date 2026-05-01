"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

/**
 * Headless dropdown anchored to a trigger. Closes on outside click and
 * Escape. The trigger is rendered by the consumer; the items are
 * rendered into a positioned panel.
 */
export function DropdownMenu({
  trigger,
  children,
  align = "right",
  width = "w-48",
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode
  children: (close: () => void) => React.ReactNode
  align?: "left" | "right"
  width?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("keydown", onEsc)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("keydown", onEsc)
    }
  }, [open])

  return (
    <div ref={ref} className="relative inline-block">
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute top-full mt-1 z-30 rounded-md border border-border-orage bg-bg-2 shadow-orage-lg py-1 text-[12px]",
            width,
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

export function MenuItem({
  children,
  onClick,
  danger,
  active,
  disabled,
}: {
  children: React.ReactNode
  onClick: (e: React.MouseEvent) => void
  danger?: boolean
  active?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full text-left px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
        active && "text-gold-400",
        danger
          ? "text-danger hover:bg-danger/10"
          : "text-text-secondary hover:bg-bg-3",
      )}
    >
      {children}
    </button>
  )
}

export function MenuSection({ label }: { label: string }) {
  return (
    <div className="px-3 py-1 font-mono text-[9px] tracking-[0.12em] text-text-muted">
      {label}
    </div>
  )
}

export function MenuDivider() {
  return <div className="my-1 border-t border-border-orage" />
}
