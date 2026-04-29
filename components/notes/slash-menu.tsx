"use client"

import { useEffect, useMemo, useState } from "react"
import { useNotesStore, type BlockType } from "@/lib/notes-store"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type Item = {
  type: BlockType
  name: string
  desc?: string
  icon: string
  iconAccent?: boolean
  section: string
  payload?: Record<string, unknown>
}

const ITEMS: Item[] = [
  { section: "AI", type: "ai", name: "Ask AI", desc: "Generate content with AI Implementer", icon: "◆", iconAccent: true },
  { section: "BASIC", type: "h1", name: "Heading 1", desc: "Big section title", icon: "H1" },
  { section: "BASIC", type: "h2", name: "Heading 2", desc: "Sub-section", icon: "H2" },
  { section: "BASIC", type: "h3", name: "Heading 3", desc: "Sub-sub-section", icon: "H3" },
  { section: "BASIC", type: "bullet", name: "Bullet List", icon: "•" },
  { section: "BASIC", type: "todo", name: "To-Do", desc: "Checkable task block", icon: "☐" },
  { section: "BASIC", type: "quote", name: "Quote", icon: "\u201C" },
  { section: "BASIC", type: "code", name: "Code Block", icon: "{}" },
  { section: "BASIC", type: "divider", name: "Divider", icon: "―" },
  { section: "EMBED ORAGE DATA", type: "embed_task", name: "Task", desc: "Create or embed a task", icon: "✓", payload: { taskId: "t1" } },
  { section: "EMBED ORAGE DATA", type: "embed_rock", name: "Rock", desc: "Embed a quarterly rock", icon: "●", payload: { rockId: "r1" } },
]

export function SlashMenu() {
  const slash = useNotesStore((s) => s.slash)
  const closeSlash = useNotesStore((s) => s.closeSlash)
  const insertBlock = useNotesStore((s) => s.insertBlock)
  const removeBlock = useNotesStore((s) => s.removeBlock)
  const [selected, setSelected] = useState(0)

  const filtered = useMemo(() => {
    const q = slash.query.replace(/^\//, "").toLowerCase().trim()
    if (!q) return ITEMS
    return ITEMS.filter(
      (i) => i.name.toLowerCase().includes(q) || i.type.includes(q),
    )
  }, [slash.query])

  useEffect(() => {
    setSelected(0)
  }, [slash.query, slash.open])

  useEffect(() => {
    if (!slash.open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault()
        closeSlash()
        return
      }
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelected((s) => Math.min(s + 1, filtered.length - 1))
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelected((s) => Math.max(s - 1, 0))
      }
      if (e.key === "Enter") {
        e.preventDefault()
        const item = filtered[selected]
        if (item) pick(item)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [slash.open, filtered, selected])

  function pick(item: Item) {
    const blockId = slash.blockId
    if (!blockId) return
    closeSlash()
    if (item.type === "ai") {
      insertBlock(blockId, "ai", {
        prompt: '/ai "draft 3 ethical scarcity angles for tier 2 sales page"',
        htmlContent:
          "<em>The AI Implementer is generating a response… (mock)</em>",
      })
      toast("AI PROMPT · TYPE YOUR INTENT")
    } else {
      insertBlock(blockId, item.type, item.payload)
      toast(`INSERTED · ${item.name.toUpperCase()}`)
    }
    // Remove the trigger block if it was empty / just held the slash
    setTimeout(() => {
      removeBlock(blockId)
    }, 0)
  }

  if (!slash.open || !slash.rect) return null

  // group by section
  const sections: Record<string, Item[]> = {}
  for (const item of filtered) {
    sections[item.section] = sections[item.section] ?? []
    sections[item.section].push(item)
  }

  return (
    <div
      role="menu"
      style={{ left: slash.rect.left, top: slash.rect.top }}
      className="fixed z-[200] glass-strong border-gold-500 rounded-md shadow-orage-md shadow-gold p-1.5 min-w-[280px] max-h-[420px] overflow-y-auto fade-in"
    >
      {Object.entries(sections).map(([label, items]) => (
        <div key={label} className="mb-1">
          <div className="px-2 py-1 font-display text-[9px] tracking-[0.2em] text-text-muted">
            {label}
          </div>
          {items.map((item) => {
            const idx = filtered.indexOf(item)
            const active = idx === selected
            return (
              <button
                key={item.type + item.name}
                type="button"
                onMouseEnter={() => setSelected(idx)}
                onClick={() => pick(item)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-sm text-left transition-colors",
                  active && "bg-gold-500/10",
                )}
              >
                <span
                  className={cn(
                    "shrink-0 w-7 h-7 rounded-sm flex items-center justify-center font-mono text-[11px]",
                    item.iconAccent
                      ? "bg-gradient-to-br from-gold-500 to-gold-400 text-text-on-gold"
                      : "bg-bg-3 border border-border-orage text-text-secondary",
                  )}
                >
                  {item.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-text-primary truncate">{item.name}</div>
                  {item.desc && (
                    <div className="text-[10px] text-text-muted truncate">{item.desc}</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      ))}
      {filtered.length === 0 && (
        <div className="px-2 py-3 text-center text-[11px] text-text-muted">
          No matches
        </div>
      )}
    </div>
  )
}
