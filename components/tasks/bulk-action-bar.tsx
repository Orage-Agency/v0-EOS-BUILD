"use client"

import { AnimatePresence, motion } from "framer-motion"
import { toast } from "sonner"
import { useTasksStore } from "@/lib/tasks-store"
import { useUIStore } from "@/lib/store"
import { tBase, easeOut } from "@/lib/motion"
import { cn } from "@/lib/utils"

export function BulkActionBar() {
  const selected = useTasksStore((s) => s.selected)
  const clear = useTasksStore((s) => s.clearSelection)
  const bulkDelete = useTasksStore((s) => s.bulkDelete)
  const bulkUpdate = useTasksStore((s) => s.bulkUpdate)
  const sessionUser = useUIStore((s) => s.currentUser)
  const CAN_DELETE =
    sessionUser?.isMaster ||
    ["founder", "admin", "owner", "master"].includes(sessionUser?.role ?? "")

  const count = selected.size

  function action(kind: "reassign" | "priority" | "due" | "rock" | "delete") {
    const ids = Array.from(selected)
    if (kind === "delete") {
      if (!CAN_DELETE) {
        toast("🔒 FOUNDERS / ADMINS ONLY")
        return
      }
      bulkDelete(ids)
      toast(`${ids.length} TASKS DELETED`)
      return
    }
    if (kind === "priority") {
      bulkUpdate(ids, { priority: "high" })
      toast(`PRIORITY · HIGH · ${ids.length} TASKS`)
      return
    }
    toast(`${kind.toUpperCase()} · ${ids.length} TASKS`)
  }

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          key="bulk-bar"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: tBase, ease: easeOut }}
          className="overflow-hidden border-b border-gold-500"
          style={{ background: "rgba(182,128,57,0.08)" }}
          role="toolbar"
          aria-label="Bulk actions"
        >
          <div className="px-8 py-2.5 flex items-center gap-2.5 flex-wrap">
            <span className="font-display text-xs tracking-[0.15em] text-gold-400">
              {count} SELECTED
            </span>
            {(["reassign", "priority", "due", "rock"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => action(k)}
                className="px-2.5 py-1 bg-transparent border border-border-strong rounded-sm font-display text-[10px] tracking-[0.1em] text-text-secondary hover:border-gold-500 hover:text-gold-400 hover:bg-gold-500/10 transition-colors"
              >
                {k === "reassign" && "REASSIGN"}
                {k === "priority" && "SET PRIORITY"}
                {k === "due" && "SET DUE DATE"}
                {k === "rock" && "LINK TO ROCK"}
              </button>
            ))}
            <button
              type="button"
              onClick={() => action("delete")}
              className={cn(
                "px-2.5 py-1 bg-transparent border rounded-sm font-display text-[10px] tracking-[0.1em] transition-colors",
                CAN_DELETE
                  ? "text-danger border-danger/30 hover:border-danger hover:bg-danger/10"
                  : "text-text-muted border-border-orage opacity-60 cursor-not-allowed",
              )}
              title={CAN_DELETE ? undefined : "Founders/Admins only"}
            >
              DELETE {!CAN_DELETE && "🔒"}
            </button>
            <span className="ml-auto text-[10px] text-text-muted font-mono hidden md:inline">
              ⇧+CLICK = RANGE · ⌘+CLICK = TOGGLE
            </span>
            <button
              type="button"
              onClick={clear}
              className="px-2.5 py-1 bg-transparent border border-border-strong rounded-sm font-display text-[10px] tracking-[0.1em] text-text-secondary hover:border-gold-500 hover:text-gold-400"
            >
              CLEAR
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
