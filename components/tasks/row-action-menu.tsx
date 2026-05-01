"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { useTasksStore } from "@/lib/tasks-store"
import { IcArchive, IcMore } from "@/components/orage/icons"
import { cn } from "@/lib/utils"
import type { MockTask, TaskPriority } from "@/lib/mock-data"

const PRIORITIES: { id: TaskPriority; label: string }[] = [
  { id: "high", label: "High" },
  { id: "med", label: "Medium" },
  { id: "low", label: "Low" },
]

export function RowActionMenu({ task }: { task: MockTask }) {
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const archiveOne = useTasksStore((s) => s.archiveOne)
  const deleteOne = useTasksStore((s) => s.deleteOne)
  const updatePriority = useTasksStore((s) => s.updatePriority)
  const openTask = useTasksStore((s) => s.openTask)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) {
        setOpen(false)
        setConfirmDelete(false)
      }
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  function handleArchive(e: React.MouseEvent) {
    e.stopPropagation()
    archiveOne(task.id)
    setOpen(false)
    toast(`Archived "${task.title}"`)
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    deleteOne(task.id)
    setOpen(false)
    setConfirmDelete(false)
    toast(`Deleted "${task.title}"`)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Task actions"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className={cn(
          "w-6 h-6 rounded-sm flex items-center justify-center text-text-muted hover:bg-bg-2 hover:text-gold-400",
          open && "bg-bg-2 text-gold-400",
        )}
      >
        <IcMore className="w-3 h-3" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-7 z-30 w-44 rounded-md border border-border-orage bg-bg-2 shadow-orage-lg py-1 text-[12px]"
          onClick={(e) => e.stopPropagation()}
        >
          <MenuButton
            onClick={(e) => {
              e.stopPropagation()
              openTask(task.id)
              setOpen(false)
            }}
          >
            Open details
          </MenuButton>
          <div className="px-3 py-1 font-mono text-[9px] tracking-[0.12em] text-text-muted">
            PRIORITY
          </div>
          {PRIORITIES.map((p) => (
            <MenuButton
              key={p.id}
              active={task.priority === p.id}
              onClick={(e) => {
                e.stopPropagation()
                updatePriority(task.id, p.id)
                setOpen(false)
                toast(`Priority set to ${p.label.toLowerCase()}`)
              }}
            >
              {p.label}
            </MenuButton>
          ))}
          <div className="my-1 border-t border-border-orage" />
          <MenuButton onClick={handleArchive}>
            <IcArchive className="w-3 h-3 mr-2 inline-block opacity-70" />
            Archive (cancel)
          </MenuButton>
          <MenuButton danger onClick={handleDelete}>
            {confirmDelete ? "Click again to confirm delete" : "Delete…"}
          </MenuButton>
        </div>
      )}
    </div>
  )
}

function MenuButton({
  children,
  onClick,
  danger,
  active,
}: {
  children: React.ReactNode
  onClick: (e: React.MouseEvent) => void
  danger?: boolean
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-1.5 hover:bg-bg-3 transition-colors",
        active && "text-gold-400",
        danger ? "text-danger hover:bg-danger/10" : "text-text-secondary",
      )}
    >
      {children}
    </button>
  )
}
