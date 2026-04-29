"use client"

import { useEffect, useRef, useState } from "react"
import { useIssuesStore } from "@/lib/issues-store"
import { useUIStore } from "@/lib/store"
import { createIssue } from "@/app/actions/issues"
import { useWorkspaceSlug } from "@/hooks/use-workspace-slug"
import { IcPlus } from "@/components/orage/icons"
import { toast } from "sonner"

export function QuickAddRow() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState("")
  const [busy, setBusy] = useState(false)
  const create = useIssuesStore((s) => s.createIssue)
  const workspaceSlug = useWorkspaceSlug()
  const sessionUser = useUIStore((s) => s.currentUser)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      if (e.key === "i" && !e.metaKey && !e.ctrlKey && !isInput) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  async function submit() {
    const title = value.trim()
    if (!title) return
    setBusy(true)
    try {
      create({
        title,
        severity: "normal",
        ownerId: sessionUser?.id ?? "",
        authorLabel: (sessionUser?.name ?? "User").split(" ")[0],
      })
      await createIssue(workspaceSlug, {
        title,
        severity: "normal",
      })
      toast("ISSUE DROPPED")
      setValue("")
    } catch (err) {
      toast("FAILED", {
        description:
          err instanceof Error ? err.message : "Could not create issue",
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="px-4 py-3 border-t border-border-orage bg-bg-2 flex items-center gap-3">
      <span
        className="w-6 h-6 rounded-sm flex items-center justify-center text-text-muted shrink-0"
        aria-hidden
      >
        <IcPlus className="w-3.5 h-3.5" />
      </span>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            void submit()
          }
        }}
        placeholder="Drop an issue · press Enter to create · I to focus"
        className="flex-1 bg-transparent border-none outline-none text-[13px] text-text-primary placeholder:text-text-muted"
        disabled={busy}
      />
      <span className="text-[10px] font-mono text-text-dim">PRESS I</span>
    </div>
  )
}
