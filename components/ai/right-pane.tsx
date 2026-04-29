"use client"

import { useAIImplementerStore } from "@/lib/ai-implementer-store"
import { CapabilitiesTab } from "./capabilities-tab"
import { BriefingsTab } from "./briefings-tab"
import { AuditTab } from "./audit-tab"
import { cn } from "@/lib/utils"

const TABS = [
  { id: "capabilities" as const, label: "CAPABILITIES" },
  { id: "briefings" as const, label: "BRIEFINGS" },
  { id: "audit" as const, label: "AUDIT" },
]

export function RightPane() {
  const tab = useAIImplementerStore((s) => s.rightTab)
  const setTab = useAIImplementerStore((s) => s.setRightTab)

  return (
    <aside className="bg-bg-2 border-l border-border-orage flex flex-col overflow-hidden min-w-0">
      <header className="border-b border-border-orage flex">
        {TABS.map((t) => {
          const active = t.id === tab
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 py-3 font-display tracking-[0.2em] text-[10px] transition border-b-2",
                active
                  ? "text-gold-400 border-gold-500"
                  : "text-text-muted border-transparent hover:text-text-primary",
              )}
            >
              {t.label}
            </button>
          )
        })}
      </header>
      <div className="flex-1 overflow-y-auto p-3.5">
        {tab === "capabilities" && <CapabilitiesTab />}
        {tab === "briefings" && <BriefingsTab />}
        {tab === "audit" && <AuditTab />}
      </div>
    </aside>
  )
}
