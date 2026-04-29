"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useUIStore } from "@/lib/store"
import { CURRENT_USER } from "@/lib/mock-data"
import { can } from "@/lib/permissions"
import { IcSearch } from "@/components/orage/icons"
import { cn } from "@/lib/utils"
import { tBase, easeOut, easeSpring } from "@/lib/motion"
import { useTenantPath } from "@/hooks/use-tenant-path"

type Cmd = {
  id: string
  section: "JUMP TO" | "CREATE" | "AI"
  icon: string
  name: string
  desc: string
  shortcut?: string
  run: (ctx: CmdCtx) => void
  capability?: "rocks.edit" | "meetings.run_l10"
}

type CmdCtx = {
  router: ReturnType<typeof useRouter>
  toggleAi: () => void
  tp: (path: string) => string
}

const COMMANDS: Cmd[] = [
  {
    id: "go-dashboard",
    section: "JUMP TO",
    icon: "⊞",
    name: "Dashboard",
    desc: "Home · today's priorities",
    shortcut: "G D",
    run: (c) => c.router.push(c.tp("/")),
  },
  {
    id: "go-rocks",
    section: "JUMP TO",
    icon: "●",
    name: "Rocks",
    desc: "Quarterly priorities",
    shortcut: "G R",
    run: (c) => c.router.push(c.tp("/rocks")),
  },
  {
    id: "go-tasks",
    section: "JUMP TO",
    icon: "✓",
    name: "Tasks",
    desc: "My tasks · 12 open",
    shortcut: "G T",
    run: (c) => c.router.push(c.tp("/tasks")),
  },
  {
    id: "go-notes",
    section: "JUMP TO",
    icon: "▤",
    name: "Notes",
    desc: "Open the editor",
    shortcut: "G N",
    run: (c) => c.router.push(c.tp("/notes")),
  },
  {
    id: "go-issues",
    section: "JUMP TO",
    icon: "!",
    name: "Issues",
    desc: "IDS queue · 8 open",
    shortcut: "G I",
    run: (c) => c.router.push(c.tp("/issues")),
  },
  {
    id: "new-task",
    section: "CREATE",
    icon: "+",
    name: "New Task",
    desc: "Quick add a to-do",
    shortcut: "⌘ T",
    run: (c) => {
      c.router.push(c.tp("/tasks?new=1"))
      toast("NEW TASK · OPENING")
    },
  },
  {
    id: "new-issue",
    section: "CREATE",
    icon: "!",
    name: "Drop an Issue",
    desc: "Add to IDS queue",
    shortcut: "⌘ I",
    run: () => toast("NEW ISSUE · OPENING"),
  },
  {
    id: "new-rock",
    section: "CREATE",
    icon: "●",
    name: "New Rock",
    desc: "Quarterly commitment",
    shortcut: "R",
    capability: "rocks.edit",
    run: (c) => c.router.push(c.tp("/rocks?new=1")),
  },
  {
    id: "ai-open",
    section: "AI",
    icon: "◆",
    name: "Open AI Implementer",
    desc: "Chat with your AI coach",
    shortcut: "⌘ J",
    run: (c) => c.toggleAi(),
  },
]

export function CommandPalette() {
  const open = useUIStore((s) => s.commandOpen)
  const close = useUIStore((s) => s.closeCommand)
  const toggleAi = useUIStore((s) => s.toggleAiPanel)
  const router = useRouter()
  const tp = useTenantPath()
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return COMMANDS
    return COMMANDS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.desc.toLowerCase().includes(q) ||
        c.section.toLowerCase().includes(q),
    )
  }, [query])

  useEffect(() => {
    if (open) {
      setQuery("")
      setActiveIndex(0)
      // focus after mount animation
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close()
        return
      }
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === "Enter") {
        e.preventDefault()
        const c = filtered[activeIndex]
        if (!c) return
        runCommand(c)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, filtered, activeIndex])

  function runCommand(c: Cmd) {
    if (c.capability && !can(CURRENT_USER, c.capability)) {
      toast("🔒 PERMISSIONS REQUIRED")
      close()
      return
    }
    c.run({ router, toggleAi, tp })
    close()
  }

  // Group filtered commands by section preserving order.
  const grouped = useMemo(() => {
    const order: Cmd["section"][] = ["JUMP TO", "CREATE", "AI"]
    return order
      .map((section) => ({
        section,
        items: filtered.filter((c) => c.section === section),
      }))
      .filter((g) => g.items.length > 0)
  }, [filtered])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="cmd-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: tBase, ease: easeOut }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close()
          }}
          className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-start justify-center pt-[120px] px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: tBase, ease: easeSpring }}
            className="w-[560px] max-w-full glass-strong border-gold-500 rounded-md shadow-orage-lg shadow-gold overflow-hidden"
          >
            <div className="px-4 py-3.5 border-b border-border-orage flex items-center gap-2.5">
              <IcSearch className="w-4 h-4 text-gold-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActiveIndex(0)
                }}
                placeholder="Search anything or type a command…"
                className="flex-1 bg-transparent border-none text-text-primary text-sm placeholder:text-text-dim focus:outline-none"
              />
              <kbd className="font-mono text-[10px] text-text-muted px-1.5 py-0.5 bg-bg-2 border border-border-orage rounded-sm">
                esc
              </kbd>
            </div>

            <div className="max-h-[360px] overflow-y-auto p-1.5">
              {grouped.length === 0 && (
                <div className="px-3 py-8 text-center text-text-muted text-xs">
                  No results
                </div>
              )}
              {grouped.map(({ section, items }) => (
                <div key={section}>
                  <div className="font-display text-[9px] tracking-[0.2em] text-text-muted px-2.5 pt-2.5 pb-1">
                    {section}
                  </div>
                  {items.map((c) => {
                    const idx = filtered.indexOf(c)
                    const selected = idx === activeIndex
                    const locked =
                      c.capability && !can(CURRENT_USER, c.capability)
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => runCommand(c)}
                        className={cn(
                          "w-full px-2.5 py-2 flex items-center gap-3 rounded-sm transition-colors text-left",
                          selected ? "bg-bg-active" : "hover:bg-bg-active",
                          locked && "opacity-50",
                        )}
                      >
                        <span className="w-7 h-7 bg-bg-3 border border-border-orage rounded-sm flex items-center justify-center text-gold-400 text-xs shrink-0">
                          {c.icon}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm text-text-primary font-medium truncate">
                            {c.name}
                            {locked && (
                              <span className="ml-2 text-[9px] text-text-muted">
                                🔒
                              </span>
                            )}
                          </span>
                          <span className="block text-[10px] text-text-muted truncate">
                            {c.desc}
                          </span>
                        </span>
                        {c.shortcut && (
                          <kbd className="font-mono text-[10px] text-text-muted px-1.5 py-0.5 bg-bg-2 border border-border-orage rounded-sm">
                            {c.shortcut}
                          </kbd>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
