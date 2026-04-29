"use client"

import { useState } from "react"
import { ThreadsPane } from "./threads-pane"
import { ConversationPane } from "./conversation-pane"
import { RightPane } from "./right-pane"
import { cn } from "@/lib/utils"

/**
 * Chat-first layout: threads on the left rail, conversation as the hero.
 * The capabilities/briefings/audit pane collapses into a slide-out drawer
 * toggled by the conversation header. On mobile, threads collapse too.
 */
export function AIShell() {
  const [panelOpen, setPanelOpen] = useState(false)

  return (
    <div
      className="grid h-full overflow-hidden relative"
      style={{ gridTemplateColumns: "minmax(0, 290px) minmax(0,1fr)" }}
    >
      <div className="hidden md:block">
        <ThreadsPane />
      </div>
      <ConversationPane onTogglePanel={() => setPanelOpen((v) => !v)} />

      {panelOpen && (
        <button
          type="button"
          aria-label="Close panel"
          onClick={() => setPanelOpen(false)}
          className="absolute inset-0 z-30 bg-black/50 backdrop-blur-[2px]"
        />
      )}
      <aside
        className={cn(
          "absolute top-0 right-0 h-full w-[340px] max-w-[90vw] z-40 transition-transform duration-200 ease-out",
          panelOpen ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!panelOpen}
      >
        <RightPane />
      </aside>
    </div>
  )
}
