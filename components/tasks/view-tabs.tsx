"use client"

import { useTasksStore } from "@/lib/tasks-store"
import { IcBoard, IcCalendar, IcList, IcTimeline } from "@/components/orage/icons"
import { cn } from "@/lib/utils"

const TABS: { id: "list" | "board" | "calendar" | "timeline"; label: string; Icon: typeof IcList }[] = [
  { id: "list", label: "List", Icon: IcList },
  { id: "board", label: "Board", Icon: IcBoard },
  { id: "calendar", label: "Calendar", Icon: IcCalendar },
  { id: "timeline", label: "Timeline", Icon: IcTimeline },
]

export function ViewTabs() {
  const view = useTasksStore((s) => s.view)
  const setView = useTasksStore((s) => s.setView)

  return (
    <div role="tablist" className="flex px-8 mt-4 border-b border-border-orage">
      {TABS.map(({ id, label, Icon }) => {
        const active = view === id
        return (
          <button
            key={id}
            role="tab"
            aria-selected={active}
            onClick={() => setView(id)}
            className={cn(
              "px-4 py-2.5 text-xs cursor-pointer flex items-center gap-1.5 font-medium border-b-2 -mb-px transition-colors",
              active
                ? "text-gold-400 border-gold-500"
                : "text-text-muted border-transparent hover:text-text-secondary",
            )}
          >
            <Icon className="w-3 h-3 opacity-80" />
            {label}
          </button>
        )
      })}
    </div>
  )
}
