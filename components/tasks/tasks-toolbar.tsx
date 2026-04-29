"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback } from "react"
import { cn } from "@/lib/utils"
import { TASK_FILTERS, isTaskFilter, type TaskFilter } from "@/lib/tasks-filter"

const SECONDARY_CHIPS = [
  { id: "sort", label: "↕ Sort: Priority" },
  { id: "group", label: "⌗ Group: Rock" },
  { id: "status", label: "✓ Status: Open" },
]

export function TasksToolbar() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const raw = params.get("filter")
  const active: TaskFilter = isTaskFilter(raw) ? raw : "my"

  const setFilter = useCallback(
    (next: TaskFilter) => {
      const sp = new URLSearchParams(params.toString())
      sp.set("filter", next)
      // pathname already includes the workspace prefix (/orage/tasks).
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false })
    },
    [params, pathname, router],
  )

  return (
    <div className="px-8 py-3 flex items-center gap-2 border-b border-border-orage bg-bg-1 flex-wrap">
      <div className="flex items-center gap-1.5">
        {TASK_FILTERS.map((f) => {
          const isActive = active === f.id
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              title={f.description}
              className={cn(
                "px-3 py-1 rounded-sm text-[11px] transition-colors border font-medium",
                isActive
                  ? "bg-gold-500/15 border-gold-500 text-gold-400"
                  : "bg-bg-3 border-border-orage text-text-secondary hover:border-gold-500/50 hover:text-text-primary",
              )}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      <span className="mx-2 h-4 w-px bg-border-orage" aria-hidden />

      {SECONDARY_CHIPS.map((c) => (
        <button
          key={c.id}
          type="button"
          className="px-3 py-1 rounded-sm text-[11px] bg-bg-3 border border-border-orage text-text-secondary hover:border-gold-500 hover:text-gold-400 transition-colors"
        >
          {c.label}
        </button>
      ))}

      <div className="flex-1" />
      <button
        type="button"
        className="px-3 py-1 rounded-sm text-[11px] bg-bg-3 border border-border-orage text-text-secondary hover:border-gold-500 hover:text-gold-400"
      >
        ⚙ Customize
      </button>
    </div>
  )
}
