/**
 * Orage Core · Formatting helpers used across modules.
 */

const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
const MONTH = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
]

export function formatDateChip(d: Date): { dow: string; month: string; day: number } {
  return {
    dow: DOW[d.getDay()],
    month: MONTH[d.getMonth()],
    day: d.getDate(),
  }
}

/** "MON · APR 28" */
export function formatDayLabel(d: Date): string {
  const c = formatDateChip(d)
  return `${c.dow} · ${c.month} ${String(c.day).padStart(2, "0")}`
}

/** Compare two YYYY-MM-DD strings to today (local). */
export function dueLabel(due: string | null | undefined): {
  label: string
  tone: "muted" | "urgent" | "overdue"
} {
  // Guard against AI-created tasks (and future Supabase rows) that have
  // no due_date set. Without this, `new Date("T00:00:00")` is Invalid Date
  // and rendering blows up to "undefined NaN" in MY PRIORITIES (P0-4).
  if (!due) return { label: "NO DUE DATE", tone: "muted" }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(due + "T00:00:00")
  if (Number.isNaN(dueDate.getTime())) {
    return { label: "NO DUE DATE", tone: "muted" }
  }
  const diffDays = Math.round(
    (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  )
  if (diffDays < 0) return { label: "OVERDUE", tone: "overdue" }
  if (diffDays === 0) return { label: "TODAY", tone: "urgent" }
  if (diffDays === 1) return { label: "TOMORROW", tone: "urgent" }
  if (diffDays < 7) {
    const c = formatDateChip(dueDate)
    return { label: `${c.dow} ${c.month} ${String(c.day).padStart(2, "0")}`, tone: "muted" }
  }
  const c = formatDateChip(dueDate)
  return { label: `${c.month} ${String(c.day).padStart(2, "0")}`, tone: "muted" }
}

export function isToday(due: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(due + "T00:00:00")
  return d.getTime() === today.getTime()
}

export function shortTime(d: Date = new Date()): string {
  return d
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toUpperCase()
}
