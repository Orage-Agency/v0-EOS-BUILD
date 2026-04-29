"use client"

import { useState } from "react"
import { toast } from "sonner"
import type { Nudge } from "@/lib/dashboard"
import { AIOrb } from "@/components/orage/ai-orb"
import { TenantLink } from "@/components/tenant-link"
import { cn } from "@/lib/utils"

export function AINudgeStack({ nudges }: { nudges: Nudge[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState(false)
  const visible = nudges.filter((n) => !dismissed.has(n.id))
  const top = visible[0]
  const rest = visible.slice(1)

  return (
    <section className="glass mb-5 overflow-hidden">
      <header className="px-[18px] py-3.5 border-b border-border-orage flex items-center justify-between">
        <div className="font-display text-[13px] tracking-[0.22em] text-gold-400 uppercase flex items-center gap-2">
          <AIOrb size="sm" />
          AI IMPLEMENTER · THIS WEEK
        </div>
        <button
          type="button"
          className="text-[11px] text-text-muted hover:text-gold-400 transition-colors"
        >
          Configure →
        </button>
      </header>
      <div className="px-[18px] py-3.5">
        {visible.length === 0 && (
          <div className="px-2 py-10 text-center">
            <p className="text-sm text-text-secondary leading-relaxed mb-2">
              The implementer is listening — no nudges yet this week.
            </p>
            <p className="text-[11px] text-text-muted leading-relaxed max-w-[280px] mx-auto">
              As you log issues, complete tasks, and ship rocks, the AI surfaces
              patterns and suggests the next move.
            </p>
            <TenantLink
              href="/ai"
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-border-orage hover:border-gold-500 hover:text-gold-300 text-[11px] font-mono uppercase tracking-[0.16em] text-text-primary transition-colors"
            >
              Open Implementer →
            </TenantLink>
          </div>
        )}

        {top && (
          <NudgeRow
            nudge={top}
            prominent
            onDismiss={() =>
              setDismissed((s) => new Set(s).add(top.id))
            }
          />
        )}

        {rest.length > 0 && !expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="mt-2 w-full py-2 border border-dashed border-border-orage hover:border-gold-500 rounded-sm text-[11px] font-display tracking-[0.18em] text-text-muted hover:text-gold-400 uppercase transition-colors"
          >
            +{rest.length} more insight{rest.length === 1 ? "" : "s"}
          </button>
        )}

        {expanded &&
          rest.map((n) => (
            <NudgeRow
              key={n.id}
              nudge={n}
              onDismiss={() =>
                setDismissed((s) => new Set(s).add(n.id))
              }
            />
          ))}

        {expanded && rest.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="mt-2 w-full py-1.5 text-[10px] font-display tracking-[0.18em] text-text-muted hover:text-gold-400 uppercase transition-colors"
          >
            Collapse
          </button>
        )}
      </div>
    </section>
  )
}

function NudgeRow({
  nudge: n,
  prominent = false,
  onDismiss,
}: {
  nudge: Nudge
  prominent?: boolean
  onDismiss: () => void
}) {
  return (
    <div
      className={cn(
        "px-4 border-l-2 border-gold-500 mb-2.5 last:mb-0 rounded-r-sm transition-colors",
        prominent ? "py-4" : "py-3",
      )}
      style={{ background: "rgba(182,128,57,0.06)" }}
    >
      <div className="font-display text-[9px] tracking-[0.22em] text-gold-500 mb-1.5 flex items-center gap-1.5">
        <span
          className={cn(
            "px-1.5 py-px rounded-sm text-[8px]",
            n.severity === "crit"
              ? "bg-danger/15 text-danger"
              : "bg-warning/15 text-warning",
          )}
        >
          {n.category}
        </span>
        <span className="ml-auto text-[9px] text-text-muted">
          {n.ageLabel}
        </span>
      </div>
      <div
        className={cn(
          "text-text-secondary leading-relaxed mb-2 [&_strong]:text-gold-400 [&_strong]:font-semibold",
          prominent ? "text-[13px]" : "text-xs",
        )}
        dangerouslySetInnerHTML={{ __html: n.html }}
      />
      <div className="flex gap-1.5 flex-wrap">
        {n.actions.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => {
              if (a.id === "dismiss") onDismiss()
              toast(a.toast)
            }}
            className={cn(
              "px-2.5 py-1.5 rounded-sm font-display text-[10px] tracking-[0.1em] transition-all border",
              a.primary
                ? "bg-gradient-to-br from-gold-500 to-gold-400 text-text-on-gold border-gold-500 hover:shadow-[0_2px_8px_rgba(182,128,57,0.3)]"
                : "bg-bg-3 border-border-orage text-text-secondary hover:bg-bg-4 hover:border-gold-500 hover:text-gold-400",
            )}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  )
}
