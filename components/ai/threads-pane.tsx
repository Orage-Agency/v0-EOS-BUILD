"use client"

import { useMemo } from "react"
import { useAIImplementerStore, type Thread } from "@/lib/ai-implementer-store"
import { AIOrb } from "@/components/orage/ai-orb"
import { IcPlus, IcSearch } from "@/components/orage/icons"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const SECTION_LABEL: Record<Thread["section"], string> = {
  proactive: "PROACTIVE · AUTO",
  recent: "RECENT",
  pinned: "PINNED",
}

const TAG_TONE: Record<string, string> = {
  BRIEFING: "bg-[rgba(228,175,122,0.15)] text-gold-400",
  DIGEST: "bg-[rgba(228,175,122,0.15)] text-gold-400",
  "L10 SUM": "bg-[rgba(228,175,122,0.15)] text-gold-400",
}

function tagClasses(tag: string) {
  if (tag.endsWith("ACTIONS")) {
    return "bg-[rgba(228,175,122,0.18)] text-gold-400 border border-gold-500/40"
  }
  if (TAG_TONE[tag]) return TAG_TONE[tag]
  return "bg-bg-3 text-text-muted border border-border-orage"
}

export function ThreadsPane() {
  const threads = useAIImplementerStore((s) => s.threads)
  const activeId = useAIImplementerStore((s) => s.activeThreadId)
  const setActive = useAIImplementerStore((s) => s.setActiveThread)
  const search = useAIImplementerStore((s) => s.threadSearch)
  const setSearch = useAIImplementerStore((s) => s.setThreadSearch)
  const newThread = useAIImplementerStore((s) => s.newThread)

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? threads.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.preview.toLowerCase().includes(q),
        )
      : threads
    return {
      proactive: filtered.filter((t) => t.section === "proactive"),
      recent: filtered.filter((t) => t.section === "recent"),
      pinned: filtered.filter((t) => t.section === "pinned"),
    }
  }, [threads, search])

  return (
    <aside className="bg-bg-2 border-r border-border-orage flex flex-col overflow-hidden min-w-0">
      <header className="px-4 pt-4 pb-3 border-b border-border-orage">
        <div className="flex items-center gap-2">
          <AIOrb size="sm" />
          <span className="font-display tracking-[0.18em] text-gold-400 text-sm flex-1">
            IMPLEMENTER
          </span>
          <button
            onClick={() => {
              newThread()
              toast("NEW THREAD")
            }}
            className="font-display tracking-wider text-[10px] text-gold-400 hover:text-gold-300 inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-gold-500/40 hover:bg-gold-500/10 transition"
          >
            <IcPlus className="w-3 h-3" />
            NEW
          </button>
        </div>
        <div className="relative mt-3">
          <IcSearch className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search threads…"
            className="w-full bg-bg-3 border border-border-orage rounded-sm pl-8 pr-2 py-2 text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-gold-500/60"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-1 py-2">
        {(["proactive", "recent", "pinned"] as const).map((section) => {
          const list = grouped[section]
          if (!list.length) return null
          return (
            <section key={section} className="mb-3">
              <div className="font-display tracking-[0.22em] text-[9px] text-text-dim px-3 py-1.5">
                {SECTION_LABEL[section]}
              </div>
              <ul className="space-y-px">
                {list.map((t) => {
                  const active = t.id === activeId
                  return (
                    <li key={t.id}>
                      <button
                        onClick={() => setActive(t.id)}
                        className={cn(
                          "w-full text-left px-3 py-2.5 rounded-sm transition border-l-2",
                          active
                            ? "bg-bg-active border-gold-500"
                            : "border-transparent hover:bg-bg-hover",
                        )}
                      >
                        <div
                          className={cn(
                            "text-xs font-medium truncate",
                            active ? "text-text-primary" : "text-text-secondary",
                          )}
                        >
                          {t.title}
                        </div>
                        <div className="text-[11px] text-text-muted mt-0.5 line-clamp-2 leading-snug">
                          {t.preview}
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-[10px]">
                          <span className="font-mono text-text-dim">
                            {t.time}
                          </span>
                          <span
                            className={cn(
                              "font-display tracking-[0.18em] px-1.5 py-px rounded-sm",
                              tagClasses(t.tag),
                            )}
                          >
                            {t.tag}
                          </span>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </aside>
  )
}
