"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CURRENT_USER } from "@/lib/mock-data"
import { can } from "@/lib/permissions"
import { useUIStore } from "@/lib/store"
import { useNotesStore } from "@/lib/notes-store"
import { useTenantPath } from "@/hooks/use-tenant-path"
import { IcPlus } from "@/components/orage/icons"
import { cn } from "@/lib/utils"

type Item = {
  type: "task" | "rock" | "issue" | "note" | "meeting"
  label: string
  icon: string
  shortcut: string
  capability?: "rocks.edit" | "meetings.run_l10"
  divider?: boolean
}

const ITEMS: Item[] = [
  { type: "task", label: "Task", icon: "✓", shortcut: "T" },
  { type: "rock", label: "Rock", icon: "●", shortcut: "R", capability: "rocks.edit" },
  { type: "issue", label: "Issue", icon: "!", shortcut: "I" },
  { type: "note", label: "Note", icon: "▤", shortcut: "N" },
  { type: "meeting", label: "L10 Meeting", icon: "◷", shortcut: "M", capability: "meetings.run_l10", divider: true },
]

export function QuickAddMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const tp = useTenantPath()
  const openNewRockModal = useUIStore((s) => s.openNewRockModal)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("mousedown", onDoc)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("mousedown", onDoc)
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  function trigger(item: Item) {
    setOpen(false)
    if (item.capability && !can(CURRENT_USER, item.capability)) {
      toast(item.capability === "rocks.edit" ? "🔒 PERMISSIONS REQUIRED" : "🔒 LEADERSHIP ONLY")
      return
    }
    switch (item.type) {
      case "task":
        router.push(tp("/tasks?new=1"))
        toast("NEW TASK · OPENING")
        break
      case "rock":
        router.push(tp("/rocks"))
        openNewRockModal()
        break
      case "issue":
        router.push(tp("/issues"))
        toast("NEW ISSUE · OPENING")
        break
      case "note": {
        // Create a new note locally then route to it (mock-data flow).
        const id = useNotesStore.getState().createNote()
        if (id) {
          useNotesStore.getState().setActiveNote(id)
          router.push(tp(`/notes/${id}`))
        } else {
          router.push(tp("/notes"))
        }
        toast("NEW NOTE · OPENING")
        break
      }
      case "meeting":
        router.push(tp("/l10"))
        toast("NEW L10 · OPENING")
        break
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="px-3.5 py-1.5 bg-gradient-to-br from-gold-500 to-gold-400 text-text-on-gold rounded-sm text-xs font-semibold flex items-center gap-1.5 hover:-translate-y-px transition-transform shadow-[0_2px_8px_rgba(182,128,57,0.3)] hover:shadow-[0_4px_14px_rgba(182,128,57,0.4)]"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <IcPlus className="w-3 h-3" />
        New
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-50 glass-strong border-gold-500 rounded-md p-1.5 min-w-[240px] shadow-orage-lg shadow-gold fade-in"
        >
          {ITEMS.map((item, idx) => {
            const locked =
              item.capability && !can(CURRENT_USER, item.capability)
            return (
              <div key={item.type}>
                {idx === 4 && <div className="h-px bg-border-orage my-1" />}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => trigger(item)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-sm transition-colors text-left",
                    locked
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:bg-bg-active",
                  )}
                >
                  <span className="w-6 h-6 bg-bg-3 border border-border-orage rounded-sm flex items-center justify-center text-gold-400 text-[11px] shrink-0">
                    {item.icon}
                  </span>
                  <span className="flex-1 text-xs text-text-primary">
                    {item.label}
                  </span>
                  <span className="font-mono text-[9px] text-text-muted px-1.5 py-px bg-bg-2 border border-border-orage rounded-sm">
                    {item.shortcut}
                  </span>
                  {locked && (
                    <span className="text-[9px] text-text-muted ml-1">🔒</span>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
