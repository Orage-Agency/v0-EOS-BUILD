"use client"

import { colorForCell, type Metric, type MetricCell } from "@/lib/scorecard-store"
import { cn } from "@/lib/utils"

const COLOR: Record<"green" | "yellow" | "red" | "empty", string> = {
  green: "bg-success",
  yellow: "bg-warning",
  red: "bg-danger",
  empty: "bg-text-dim",
}

export function MetricSparkline({
  metric,
  cells,
}: {
  metric: Metric
  cells: MetricCell[]
}) {
  // Normalize values to 0-100% bar height. For "down" metrics, invert.
  const values = cells.map((c) => c.value)
  const max = Math.max(metric.target, ...values.map((v) => v ?? 0)) || 1
  return (
    <div
      className="flex items-end gap-[1.5px] h-7 w-full"
      role="img"
      aria-label={`${metric.name} 13-week trend`}
    >
      {cells.map((c) => {
        const color = colorForCell(c.value, metric.target, metric.direction)
        const v = c.value ?? 0
        const height = Math.max(8, Math.min(100, (v / max) * 100))
        return (
          <span
            key={c.week}
            className={cn(
              "flex-1 rounded-[1px] min-w-[3px]",
              COLOR[color],
              color !== "red" && "opacity-70",
            )}
            style={{ height: `${height}%` }}
          />
        )
      })}
    </div>
  )
}
