"use client"

import { useEffect, useRef, useState } from "react"
import {
  colorForCell,
  type Metric,
  type MetricCell as Cell,
} from "@/lib/scorecard-store"
import { cn } from "@/lib/utils"

const COLOR_BG: Record<"green" | "yellow" | "red" | "empty", string> = {
  green: "bg-[rgba(111,170,107,0.12)] text-success hover:bg-[rgba(111,170,107,0.22)]",
  yellow: "bg-[rgba(212,162,74,0.12)] text-warning hover:bg-[rgba(212,162,74,0.22)]",
  red: "bg-[rgba(194,84,80,0.15)] text-danger hover:bg-[rgba(194,84,80,0.25)]",
  empty: "text-text-dim hover:bg-bg-active",
}

export function MetricCellView({
  metric,
  cell,
  isCurrent,
  editable,
  onSave,
}: {
  metric: Metric
  cell: Cell
  isCurrent: boolean
  editable: boolean
  onSave: (next: number | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState<string>(
    cell.value == null ? "" : String(cell.value),
  )
  const inputRef = useRef<HTMLInputElement>(null)
  const color = colorForCell(cell.value, metric.target, metric.direction)
  const isAuto = cell.value != null && cell.source !== "manual"

  useEffect(() => {
    if (editing) {
      setValue(cell.value == null ? "" : String(cell.value))
      requestAnimationFrame(() => inputRef.current?.select())
    }
  }, [editing, cell.value])

  function commit() {
    const trimmed = value.trim()
    if (trimmed === "") {
      onSave(null)
    } else {
      const num = Number(trimmed)
      if (!Number.isFinite(num)) {
        setEditing(false)
        return
      }
      onSave(num)
    }
    setEditing(false)
  }

  function cancel() {
    setValue(cell.value == null ? "" : String(cell.value))
    setEditing(false)
  }

  if (editing) {
    return (
      <div
        className={cn(
          "px-2 py-2.5 border-b border-r border-border-orage min-h-[52px] flex items-center justify-center relative",
          isCurrent && "shadow-[inset_0_-2px_0_var(--gold-500)]",
        )}
      >
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              commit()
            } else if (e.key === "Escape") {
              e.preventDefault()
              cancel()
            }
          }}
          inputMode="decimal"
          className="w-full bg-bg-active border border-gold-500 text-gold-400 font-mono text-[12px] font-semibold text-center rounded-sm py-1 outline-none"
          aria-label={`${metric.name} value`}
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => editable && setEditing(true)}
      disabled={!editable}
      className={cn(
        "px-2 py-2.5 border-b border-r border-border-orage font-mono text-[12px] font-semibold text-center min-h-[52px] flex items-center justify-center transition-colors relative",
        COLOR_BG[color],
        isCurrent && "shadow-[inset_0_-2px_0_var(--gold-500)]",
        !editable && "cursor-not-allowed opacity-90",
      )}
      aria-label={`${metric.name} ${cell.week} · ${cell.value ?? "no value"}`}
    >
      {color !== "empty" && (
        <span
          aria-hidden
          className={cn(
            "absolute top-1 right-1 w-1.5 h-1.5 rounded-full",
            color === "green"
              ? "bg-success"
              : color === "yellow"
                ? "bg-warning"
                : "bg-danger",
          )}
        />
      )}
      {cell.value == null ? (
        <span aria-hidden>—</span>
      ) : (
        <span>
          {cell.value}
          {isAuto && (
            <span className="block text-[8px] tracking-[0.18em] text-text-muted font-display mt-0.5">
              [AUTO]
            </span>
          )}
        </span>
      )}
    </button>
  )
}
