"use client"

import { useIssuesStore } from "@/lib/issues-store"
import { useUIStore } from "@/lib/store"
import { dismissAISuggestion } from "@/app/actions/issues"
import { useWorkspaceSlug } from "@/hooks/use-workspace-slug"
import { toast } from "sonner"
import { IcChevronDown, IcClose, IcPlus } from "@/components/orage/icons"
import { cn } from "@/lib/utils"
import { SeverityPill } from "./severity-pill"

export function AIIssueSuggestions() {
  const {
    aiSuggestions,
    aiPanelCollapsed,
    toggleAiPanel,
    promoteAISuggestion,
    dismissAISuggestion: dismissLocal,
  } = useIssuesStore()
  const workspaceSlug = useWorkspaceSlug()
  const sessionUser = useUIStore((s) => s.currentUser)
  const visible = aiSuggestions.filter((s) => !s.dismissed).slice(0, 3)
  if (visible.length === 0) return null

  async function add(id: string, title: string) {
    promoteAISuggestion(id, sessionUser?.id ?? "", (sessionUser?.name ?? "User").split(" ")[0])
    toast("ADDED TO LIST", { description: title })
  }

  async function dismiss(id: string) {
    dismissLocal(id)
    try {
      await dismissAISuggestion(workspaceSlug, id)
    } catch {
      // ignore — already optimistically dismissed
    }
  }

  return (
    <section
      className="border border-gold-500 rounded-sm overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, rgba(182,128,57,0.08), rgba(228,175,122,0.04))",
      }}
    >
      <button
        type="button"
        onClick={toggleAiPanel}
        className="w-full px-4 py-3 flex items-center justify-between border-b border-border-orage"
        style={{
          background: "rgba(182,128,57,0.04)",
        }}
      >
        <span className="flex items-center gap-2.5">
          <span className="ai-orb" aria-hidden />
          <span className="font-display text-[11px] tracking-[0.2em] text-gold-400">
            AI · {visible.length} ISSUE{visible.length === 1 ? "" : "S"} DETECTED
          </span>
        </span>
        <IcChevronDown
          className={cn(
            "w-4 h-4 text-gold-400 transition-transform",
            aiPanelCollapsed && "-rotate-90",
          )}
        />
      </button>
      {!aiPanelCollapsed && (
        <ul className="divide-y divide-border-orage">
          {visible.map((s) => (
            <li
              key={s.id}
              className="px-4 py-3 flex items-start gap-3 hover:bg-[rgba(182,128,57,0.04)] transition-colors"
            >
              <SeverityPill severity={s.severity} className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-text-primary leading-snug font-medium mb-1">
                  {s.title}
                </div>
                <div className="text-[11px] text-text-muted leading-relaxed">
                  {s.context}
                </div>
                <div className="text-[10px] font-mono text-text-dim mt-1">
                  {s.reason}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => add(s.id, s.title)}
                  className="px-3 py-1.5 bg-gradient-to-br from-gold-500 to-gold-400 text-text-on-gold rounded-sm font-display text-[10px] tracking-[0.15em] flex items-center gap-1 hover:-translate-y-px transition-transform"
                >
                  <IcPlus className="w-3 h-3" />
                  ADD
                </button>
                <button
                  type="button"
                  onClick={() => dismiss(s.id)}
                  aria-label="Dismiss suggestion"
                  className="w-7 h-7 rounded-sm flex items-center justify-center text-text-muted hover:bg-bg-hover hover:text-gold-400"
                >
                  <IcClose className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
