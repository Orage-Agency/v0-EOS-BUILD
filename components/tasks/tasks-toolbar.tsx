"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback } from "react"
import { cn } from "@/lib/utils"
import { TASK_FILTERS, isTaskFilter, type TaskFilter } from "@/lib/tasks-filter"

export const SORT_OPTIONS = [
  { id: "priority", label: "Priority" },
  { id: "due", label: "Due date" },
  { id: "created", label: "Created (newest)" },
  { id: "title", label: "Title (A→Z)" },
] as const
export type SortKey = (typeof SORT_OPTIONS)[number]["id"]

export const STATUS_OPTIONS = [
  { id: "open", label: "Open" },
  { id: "all", label: "All" },
  { id: "done", label: "Done" },
  { id: "cancelled", label: "Archived" },
] as const
export type StatusKey = (typeof STATUS_OPTIONS)[number]["id"]

export function TasksToolbar() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const raw = params.get("filter")
  const active: TaskFilter = isTaskFilter(raw) ? raw : "my"
  const sort = (params.get("sort") as SortKey) ?? "priority"
  const status = (params.get("status") as StatusKey) ?? "open"

  const setQueryParam = useCallback(
    (key: string, value: string | null) => {
      const sp = new URLSearchParams(params.toString())
      if (value === null) sp.delete(key)
      else sp.set(key, value)
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false })
    },
    [params, pathname, router],
  )

  const setFilter = useCallback(
    (next: TaskFilter) => {
      setQueryParam("filter", next)
    },
    [setQueryParam],
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

      <label className="text-[10px] font-mono tracking-wider text-text-muted">SORT</label>
      <select
        value={sort}
        onChange={(e) => setQueryParam("sort", e.target.value)}
        className="px-2 py-1 rounded-sm text-[11px] bg-bg-3 border border-border-orage text-text-secondary hover:border-gold-500 hover:text-gold-400 transition-colors outline-none"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.id} value={o.id} className="bg-bg-2">
            {o.label}
          </option>
        ))}
      </select>

      <label className="text-[10px] font-mono tracking-wider text-text-muted ml-2">STATUS</label>
      <select
        value={status}
        onChange={(e) => setQueryParam("status", e.target.value)}
        className="px-2 py-1 rounded-sm text-[11px] bg-bg-3 border border-border-orage text-text-secondary hover:border-gold-500 hover:text-gold-400 transition-colors outline-none"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.id} value={o.id} className="bg-bg-2">
            {o.label}
          </option>
        ))}
      </select>

      <div className="flex-1" />
    </div>
  )
}
