import type { IssueSeverity, IssueStage } from "@/lib/issues-store"
import { cn } from "@/lib/utils"

const SEVERITY: Record<IssueSeverity, string> = {
  critical: "bg-[rgba(194,84,80,0.15)] text-danger",
  high: "bg-[rgba(212,162,74,0.15)] text-warning",
  normal: "bg-[rgba(111,170,107,0.15)] text-success",
  low: "bg-[rgba(90,143,170,0.15)] text-info",
}

export function SeverityPill({
  severity,
  className,
}: {
  severity: IssueSeverity
  className?: string
}) {
  return (
    <span
      className={cn(
        "font-display text-[9px] tracking-[0.15em] px-2 py-[3px] rounded-sm inline-block text-center",
        SEVERITY[severity],
        className,
      )}
    >
      {severity.toUpperCase()}
    </span>
  )
}

const STAGE: Record<IssueStage, string> = {
  identify: "bg-[rgba(90,143,170,0.12)] text-info",
  discuss: "bg-[rgba(212,162,74,0.12)] text-warning",
  solve: "bg-[rgba(182,128,57,0.15)] text-gold-400",
}

export function StagePill({ stage }: { stage: IssueStage }) {
  return (
    <span
      className={cn(
        "font-display text-[9px] tracking-[0.18em] px-2 py-[3px] rounded-sm inline-block",
        STAGE[stage],
      )}
    >
      {stage.toUpperCase()}
    </span>
  )
}
