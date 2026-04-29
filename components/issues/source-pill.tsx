import type { IssueSource } from "@/lib/issues-store"
import { cn } from "@/lib/utils"

const STYLES: Record<IssueSource, { glyph: string; cls: string }> = {
  ai: {
    glyph: "◆",
    cls: "bg-gradient-to-br from-[rgba(182,128,57,0.2)] to-[rgba(228,175,122,0.1)] text-gold-400",
  },
  scorecard: {
    glyph: "▲",
    cls: "bg-[rgba(194,84,80,0.12)] text-danger",
  },
  l10: {
    glyph: "◷",
    cls: "bg-[rgba(90,143,170,0.12)] text-info",
  },
  user: { glyph: "·", cls: "bg-bg-2 text-text-secondary" },
}

export function SourcePill({
  source,
  label,
  className,
}: {
  source: IssueSource
  label: string
  className?: string
}) {
  const s = STYLES[source]
  return (
    <span
      className={cn(
        "px-1.5 py-px rounded-sm font-display tracking-[0.15em] text-[9px] inline-flex items-center gap-1",
        s.cls,
        className,
      )}
    >
      <span aria-hidden>{s.glyph}</span>
      {label}
    </span>
  )
}
