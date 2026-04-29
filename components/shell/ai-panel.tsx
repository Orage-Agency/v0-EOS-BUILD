"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useState } from "react"
import { useUIStore } from "@/lib/store"
import { AIOrb } from "@/components/orage/ai-orb"
import { IcClose } from "@/components/orage/icons"
import { tBase, easeOut } from "@/lib/motion"

type Msg = { id: string; role: "bot" | "user"; html: string }

const SEED: Msg[] = [
  {
    id: "m1",
    role: "bot",
    html: `<strong>Good morning, George.</strong><br/><br/>I've reviewed your data overnight. 3 things need your attention this week:<br/><br/><strong>1.</strong> Discovery calls have been red 2 weeks. Pattern usually predicts a 6–8 week revenue dip. Recommend creating an Issue and root-causing in this Monday's L10.<br/><br/><strong>2.</strong> Toolkit T1 Rock velocity dropped 22%. Brooklyn last touched it 6 days ago. Want me to break the remaining 65% into milestones?<br/><br/><strong>3.</strong> Baruc handed 2 tasks back to you in 24h with no context notes. The "Santa" chain is breaking. Flag this in your 1:1 Friday?`,
  },
]

export function AIPanel() {
  const open = useUIStore((s) => s.aiPanelOpen)
  const close = useUIStore((s) => s.closeAiPanel)
  const [messages, setMessages] = useState<Msg[]>(SEED)
  const [input, setInput] = useState("")

  function send() {
    const v = input.trim()
    if (!v) return
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", html: v },
      {
        id: crypto.randomUUID(),
        role: "bot",
        html: "Logged. I'll fold this into tomorrow's brief.",
      },
    ])
    setInput("")
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="ai-panel"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ duration: tBase, ease: easeOut }}
          className="fixed right-0 top-0 w-[380px] max-w-[90vw] h-screen z-[150] glass-strong border-l border-gold-500 flex flex-col shadow-[-12px_0_40px_rgba(0,0,0,0.6)]"
          aria-label="AI Implementer panel"
        >
          <div className="px-5 py-4 border-b border-border-orage flex items-center justify-between">
            <div className="font-display text-lg tracking-[0.2em] text-gold-400 flex items-center gap-3">
              <AIOrb size="lg" />
              AI IMPLEMENTER
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close AI panel"
              className="w-8 h-8 flex items-center justify-center rounded-sm text-text-secondary hover:bg-bg-hover hover:text-gold-400 transition-colors"
            >
              <IcClose className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3.5">
            {messages.map((m) =>
              m.role === "bot" ? (
                <div
                  key={m.id}
                  className="bg-[rgba(28,28,28,0.6)] border-l-2 border-gold-500 px-3.5 py-3 rounded-r-sm text-xs leading-relaxed text-text-secondary [&_strong]:text-gold-400"
                  dangerouslySetInnerHTML={{ __html: m.html }}
                />
              ) : (
                <div
                  key={m.id}
                  className="bg-bg-active border border-border-orage px-3.5 py-3 rounded-sm text-xs leading-relaxed text-text-primary self-end max-w-[85%]"
                >
                  {m.html}
                </div>
              ),
            )}
          </div>

          <div className="px-5 py-3.5 border-t border-border-orage flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send()
              }}
              placeholder="Ask the implementer anything…"
              className="flex-1 bg-bg-3 border border-border-orage rounded-sm px-3 py-2 text-text-primary text-xs focus:border-gold-500 outline-none"
            />
            <button
              type="button"
              onClick={send}
              className="px-4 bg-gradient-to-br from-gold-500 to-gold-400 text-text-on-gold rounded-sm font-display text-[11px] tracking-[0.1em] font-semibold"
            >
              SEND
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
