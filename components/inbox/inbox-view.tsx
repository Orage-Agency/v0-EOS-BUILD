"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { InboxItem } from "@/lib/notifications-server"
import {
  markAllRead,
  markNotificationRead,
} from "@/app/actions/notifications"

const KIND_LABEL: Record<string, string> = {
  task_assigned: "Task assigned",
  rock_owner_changed: "Rock ownership",
  milestone_assigned: "Milestone",
  handoff: "Handoff",
  mention: "Mention",
  overdue: "Overdue",
  invite_accepted: "Invite accepted",
}

function fmtRelative(iso: string): string {
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return ""
  const diffSec = Math.round((Date.now() - ts) / 1000)
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 14) return `${diffDay}d ago`
  return new Date(iso).toLocaleDateString()
}

export function InboxView({
  items,
  workspaceSlug,
}: {
  items: InboxItem[]
  workspaceSlug: string
}) {
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const [, startTransition] = useTransition()
  const router = useRouter()

  const filtered = filter === "unread" ? items.filter((i) => !i.readAt) : items
  const unreadCount = items.filter((i) => !i.readAt).length

  function handleClickItem(item: InboxItem) {
    if (!item.readAt) {
      startTransition(async () => {
        await markNotificationRead(workspaceSlug, item.id)
        router.refresh()
      })
    }
  }

  function handleMarkAll() {
    startTransition(async () => {
      await markAllRead(workspaceSlug)
      router.refresh()
    })
  }

  return (
    <div className="p-8 max-w-4xl">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1
            className="text-[32px]"
            style={{ fontFamily: "Bebas Neue", color: "#E4AF7A", letterSpacing: "0.06em" }}
          >
            INBOX
          </h1>
          <p className="text-[12px] text-[#8a7860]">
            {unreadCount === 0
              ? "All caught up."
              : `${unreadCount} unread ${unreadCount === 1 ? "item" : "items"}`}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            className="px-4 py-2 text-[11px] uppercase tracking-[0.1em] text-[#E4AF7A] border border-[rgba(182,128,57,0.3)] rounded-[2px] hover:border-[#B68039]"
            style={{ fontFamily: "Bebas Neue" }}
          >
            Mark all read
          </button>
        )}
      </header>

      <div className="mb-4 flex gap-2">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              filter === f
                ? "px-3 py-1 text-[11px] uppercase tracking-[0.1em] text-black bg-[#B68039] rounded-[2px]"
                : "px-3 py-1 text-[11px] uppercase tracking-[0.1em] text-[#8a7860] border border-[rgba(182,128,57,0.18)] rounded-[2px] hover:text-[#E4AF7A]"
            }
            style={{ fontFamily: "Bebas Neue" }}
          >
            {f === "all" ? "All" : `Unread${unreadCount ? ` · ${unreadCount}` : ""}`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[2px] border border-dashed border-[rgba(182,128,57,0.18)] bg-[#0a0a0a] px-4 py-12 text-center text-[13px] text-[#8a7860]">
          {filter === "unread" ? "No unread notifications." : "No notifications yet."}
        </div>
      ) : (
        <div className="rounded-[2px] border border-[rgba(182,128,57,0.18)] bg-[#0a0a0a] divide-y divide-[rgba(182,128,57,0.12)]">
          {filtered.map((it) => {
            const inner = (
              <div
                onClick={() => handleClickItem(it)}
                className={
                  "flex items-start gap-3 px-4 py-3 hover:bg-[#151515] transition-colors cursor-pointer " +
                  (!it.readAt ? "bg-[rgba(182,128,57,0.06)]" : "")
                }
              >
                <div className="w-7 h-7 rounded-full bg-[#262019] flex items-center justify-center text-[#E4AF7A] text-[10px] font-semibold shrink-0">
                  {it.actor.name?.[0] ?? "•"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-[#FFD69C]">{it.title}</div>
                  {it.body && (
                    <div className="text-[12px] text-[#8a7860] mt-0.5 truncate">
                      {it.body}
                    </div>
                  )}
                  <div className="text-[10px] text-[#8a7860] font-mono mt-1">
                    {KIND_LABEL[it.kind] ?? it.kind} · {fmtRelative(it.createdAt)}
                  </div>
                </div>
                {!it.readAt && (
                  <span className="w-2 h-2 mt-2 bg-[#B68039] rounded-full shrink-0" aria-label="Unread" />
                )}
              </div>
            )
            if (it.link) {
              return (
                <Link key={it.id} href={it.link} className="block">
                  {inner}
                </Link>
              )
            }
            return <div key={it.id}>{inner}</div>
          })}
        </div>
      )}
    </div>
  )
}
