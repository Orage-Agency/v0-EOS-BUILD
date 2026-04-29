"use client"

import { useMemo } from "react"
import {
  useAIImplementerStore,
  type Capability,
  type CapabilityStatus,
} from "@/lib/ai-implementer-store"
import { cn } from "@/lib/utils"

const SECTIONS: {
  status: CapabilityStatus
  label: string
  glyph: string
  toneClass: string
}[] = [
  {
    status: "auto",
    label: "AUTO-ALLOWED",
    glyph: "⚡",
    toneClass: "text-success",
  },
  {
    status: "approval",
    label: "APPROVAL REQUIRED",
    glyph: "⚠",
    toneClass: "text-warning",
  },
  {
    status: "blocked",
    label: "BLOCKED",
    glyph: "✕",
    toneClass: "text-danger",
  },
]

export function CapabilitiesTab() {
  const caps = useAIImplementerStore((s) => s.capabilities)
  const toggle = useAIImplementerStore((s) => s.toggleCapability)

  const grouped = useMemo(() => {
    return SECTIONS.map((s) => ({
      ...s,
      list: caps.filter((c) => c.status === s.status),
    }))
  }, [caps])

  return (
    <div className="space-y-5">
      {grouped.map((section) => (
        <section key={section.status}>
          <div className="font-display tracking-[0.22em] text-[10px] mb-2 px-1 flex items-center gap-1.5">
            <span className={section.toneClass}>{section.glyph}</span>
            <span className={section.toneClass}>{section.label}</span>
            <span className="text-text-dim">· {section.list.length}</span>
          </div>
          <ul className="space-y-1.5">
            {section.list.map((cap) => (
              <CapItem key={cap.id} cap={cap} onToggle={() => toggle(cap.id)} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function CapItem({
  cap,
  onToggle,
}: {
  cap: Capability
  onToggle: () => void
}) {
  const dotClass =
    cap.status === "auto"
      ? "text-success"
      : cap.status === "approval"
        ? "text-warning"
        : "text-danger"
  const trackClass = cap.enabled
    ? cap.status === "auto"
      ? "bg-success/40 border-success/60"
      : cap.status === "approval"
        ? "bg-warning/40 border-warning/60"
        : "bg-danger/30 border-danger/50"
    : "bg-bg-3 border-border-orage"
  const knobClass = cap.enabled ? "translate-x-3 bg-gold-400" : "translate-x-0 bg-text-dim"

  return (
    <li className="px-3 py-2 rounded-sm border border-border-orage bg-bg-3/40 hover:border-gold-500/40 transition">
      <div className="flex items-center gap-2">
        <code className="font-mono text-[11px] text-text-primary flex-1 truncate">
          {cap.name}
        </code>
        <button
          onClick={onToggle}
          aria-pressed={cap.enabled}
          aria-label={`Toggle ${cap.name}`}
          className={cn(
            "relative w-7 h-3.5 rounded-pill border transition",
            trackClass,
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full transition-transform",
              knobClass,
            )}
          />
        </button>
      </div>
      <div
        className={cn(
          "font-display tracking-[0.18em] text-[9px] mt-1.5",
          dotClass,
        )}
      >
        ● {cap.mode}
      </div>
    </li>
  )
}
