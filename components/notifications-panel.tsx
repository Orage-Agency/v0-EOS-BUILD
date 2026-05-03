"use client"

import { useEffect, useState } from "react"
import { Bell } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { markAllRead, markNotificationRead } from "@/app/actions/notifications"

type Recent = {
  id: string
  kind: string
  title: string
  body: string | null
  link: string | null
  readAt: string | null
  createdAt: string
  actor: { id: string | null; name: string }
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
  return new Date(iso).toLocaleDateString()
}

export function NotificationsButton() {
  const params = useParams()
  const workspaceSlug = (params?.workspace as string) ?? ""
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(0)
  const [recent, setRecent] = useState<Recent[]>([])

  // Lightweight polling so the bell catches up without a hard reload.
  // 30s is a good balance of "feels live" vs "doesn't pound the DB"; the
  // Realtime subscription added later will replace this entirely.
  useEffect(() => {
    if (!workspaceSlug) return
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(
          `/api/notifications/count?slug=${encodeURIComponent(workspaceSlug)}`,
          { cache: "no-store" },
        )
        if (!res.ok) return
        const data = (await res.json()) as { count: number; recent: Recent[] }
        if (cancelled) return
        setCount(data.count ?? 0)
        setRecent(data.recent ?? [])
      } catch {
        /* offline / transient — try again next tick */
      }
    }
    load()
    const t = setInterval(load, 30_000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [workspaceSlug])

  async function handleMarkAll() {
    await markAllRead(workspaceSlug)
    setCount(0)
    setRecent((items) =>
      items.map((it) => ({ ...it, readAt: it.readAt ?? new Date().toISOString() })),
    )
    router.refresh()
  }

  async function handleClickItem(it: Recent) {
    if (!it.readAt) {
      await markNotificationRead(workspaceSlug, it.id)
      setCount((c) => Math.max(0, c - 1))
      setRecent((items) =>
        items.map((x) =>
          x.id === it.id ? { ...x, readAt: new Date().toISOString() } : x,
        ),
      )
    }
    setOpen(false)
    router.refresh()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-[2px] text-[#FFD69C] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[#C25450] text-white text-[9px] font-bold flex items-center justify-center">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-96 bg-[#151515] border border-[rgba(182,128,57,0.18)] rounded-[2px] shadow-2xl">
            <div className="px-4 py-3 border-b border-[rgba(182,128,57,0.18)] flex items-center justify-between">
              <div
                className="text-[10px] uppercase tracking-[0.18em] text-[#E4AF7A]"
                style={{ fontFamily: "Bebas Neue" }}
              >
                Notifications
              </div>
              {count > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="text-[10px] uppercase tracking-[0.1em] text-[#8a7860] hover:text-[#E4AF7A]"
                  style={{ fontFamily: "Bebas Neue" }}
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {recent.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <div className="text-[12px] text-[#8a7860] mb-1">No notifications</div>
                  <div className="text-[11px] text-[#5a4f3e]">You&apos;re all caught up</div>
                </div>
              ) : (
                recent.map((n) => {
                  const inner = (
                    <div
                      onClick={() => handleClickItem(n)}
                      className={`block px-4 py-3 border-b border-[rgba(182,128,57,0.08)] hover:bg-[rgba(255,255,255,0.04)] cursor-pointer ${
                        !n.readAt ? "bg-[rgba(182,128,57,0.06)]" : ""
                      }`}
                    >
                      <div className="text-[12px] text-[#FFD69C] mb-0.5">{n.title}</div>
                      {n.body && (
                        <div className="text-[11px] text-[#8a7860] truncate">{n.body}</div>
                      )}
                      <div className="text-[10px] text-[#5a4f3e] font-mono mt-1">
                        {fmtRelative(n.createdAt)}
                      </div>
                    </div>
                  )
                  return n.link ? (
                    <Link key={n.id} href={n.link}>
                      {inner}
                    </Link>
                  ) : (
                    <div key={n.id}>{inner}</div>
                  )
                })
              )}
            </div>
            <div className="border-t border-[rgba(182,128,57,0.18)] px-4 py-2 text-center">
              <Link
                href={`/${workspaceSlug}/inbox`}
                className="text-[10px] uppercase tracking-[0.18em] text-[#E4AF7A] hover:text-[#FFD69C]"
                style={{ fontFamily: "Bebas Neue" }}
                onClick={() => setOpen(false)}
              >
                Open full inbox →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
