import { cn } from "@/lib/utils"

export function healthBand(score: number): "green" | "yellow" | "red" {
  if (score >= 80) return "green"
  if (score >= 60) return "yellow"
  return "red"
}

const BAND_TEXT: Record<"green" | "yellow" | "red", string> = {
  green: "text-success",
  yellow: "text-warning",
  red: "text-danger",
}

const BAND_FILL: Record<"green" | "yellow" | "red", string> = {
  green: "bg-gradient-to-r from-success to-[#8fc18a]",
  yellow: "bg-gradient-to-r from-warning to-[#e8c270]",
  red: "bg-gradient-to-r from-danger to-[#e07670]",
}

export function HealthScoreBadge({
  score,
  label = "HEALTH",
  className,
}: {
  score: number
  label?: string
  className?: string
}) {
  const band = healthBand(score)
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "font-display text-[24px] leading-none",
          BAND_TEXT[band],
        )}
      >
        {score}
      </span>
      <div className="flex-1 h-1.5 bg-bg-2 rounded-[3px] overflow-hidden">
        <div
          className={cn("h-full rounded-[3px] transition-[width]", BAND_FILL[band])}
          style={{ width: `${Math.max(4, Math.min(100, score))}%` }}
        />
      </div>
      <span className="font-display text-[9px] tracking-[0.18em] text-text-muted">
        {label}
      </span>
    </div>
  )
}
