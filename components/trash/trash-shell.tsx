"use client"

import { useState } from "react"
import { toast } from "sonner"
import type { TrashItem } from "@/lib/trash-server"
import { restoreFromTrash, purgeFromTrash } from "@/app/actions/trash"
import { cn } from "@/lib/utils"

const KIND_ICON: Record<TrashItem["kind"], string> = {
  rock: "●",
  task: "✓",
  issue: "!",
  note: "▤",
}

const KIND_LABEL: Record<TrashItem["kind"], string> = {
  rock: "ROCK",
  task: "TASK",
  issue: "ISSUE",
  note: "NOTE",
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  return `${d}d ago`
}

export function TrashShell({
  workspaceSlug,
  items,
}: {
  workspaceSlug: string
  items: TrashItem[]
}) {
  const [pending, setPending] = useState<string | null>(null)
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  const visible = items.filter((it) => !removed.has(`${it.kind}:${it.id}`))

  async function handleRestore(it: TrashItem) {
    const key = `${it.kind}:${it.id}`
    setPending(key)
    const res = await restoreFromTrash(workspaceSlug, it.kind, it.id)
    setPending(null)
    if (res.ok) {
      setRemoved((s) => new Set(s).add(key))
      toast.success(`${KIND_LABEL[it.kind]} restored`)
    } else {
      toast.error(`Couldn't restore: ${res.error ?? "unknown error"}`)
    }
  }

  async function handlePurge(it: TrashItem) {
    if (!confirm(`Permanently delete this ${it.kind}? This can't be undone.`))
      return
    const key = `${it.kind}:${it.id}`
    setPending(key)
    const res = await purgeFromTrash(workspaceSlug, it.kind, it.id)
    setPending(null)
    if (res.ok) {
      setRemoved((s) => new Set(s).add(key))
      toast.success(`${KIND_LABEL[it.kind]} purged`)
    } else {
      toast.error(`Couldn't purge: ${res.error ?? "unknown error"}`)
    }
  }

  return (
    <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto">
      <header className="mb-6">
        <h1 className="font-display text-[26px] md:text-[28px] tracking-[0.06em] text-text-primary uppercase">
          Trash
        </h1>
        <p className="text-[12px] text-text-muted mt-1.5 leading-relaxed max-w-md">
          Deleted rocks, tasks, issues, and notes land here. Restore within
          30 days or purge permanently. Empty otherwise.
        </p>
      </header>

      {visible.length === 0 ? (
        <div className="rounded-md border border-dashed border-border-orage bg-bg-3/30 px-6 py-10 text-center">
          <div
            aria-hidden
            className="mx-auto mb-3 w-10 h-10 rounded-full bg-bg-3 border border-border-orage flex items-center justify-center text-gold-500 text-base"
          >
            ⌫
          </div>
          <h2 className="font-display text-[13px] tracking-[0.18em] uppercase text-text-primary">
            Trash is empty
          </h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-text-muted">
            Anything you delete from rocks, tasks, issues, or notes will show
            up here for 30 days.
          </p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {visible.map((it) => {
            const key = `${it.kind}:${it.id}`
            const isPending = pending === key
            return (
              <li
                key={key}
                className="flex items-center gap-3 px-3 py-2.5 bg-bg-3 border border-border-orage rounded-sm hover:border-gold-500/40 transition-colors"
              >
                <span
                  aria-hidden
                  className="w-7 h-7 rounded-sm bg-bg-2 border border-border-orage flex items-center justify-center text-gold-400 text-xs shrink-0"
                >
                  {KIND_ICON[it.kind]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-text-primary truncate">
                    {it.title}
                  </div>
                  <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider mt-0.5">
                    {KIND_LABEL[it.kind]} · deleted {timeAgo(it.deletedAt)}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleRestore(it)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-sm font-display text-[10px] tracking-[0.18em] uppercase transition-colors",
                    "border border-gold-500/40 text-gold-400 hover:bg-gold-500/10",
                    isPending && "opacity-50 cursor-not-allowed",
                  )}
                >
                  Restore
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handlePurge(it)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-sm font-display text-[10px] tracking-[0.18em] uppercase transition-colors",
                    "border border-border-orage text-text-muted hover:border-danger/40 hover:text-danger",
                    isPending && "opacity-50 cursor-not-allowed",
                  )}
                >
                  Purge
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
