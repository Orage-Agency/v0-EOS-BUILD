/**
 * Produce a short, human-friendly summary of an AI tool call's output so
 * the chat UI can render "12 tasks" or "✓ created" next to the tool
 * block. Full payloads aren't shipped to the client to keep SSE frames
 * small; the model narrates the specifics in the text stream.
 */
export function summarizeToolOutput(out: unknown): string {
  if (out == null) return ""
  if (typeof out !== "object") return String(out).slice(0, 120)
  const o = out as Record<string, unknown>
  if (typeof o.error === "string") return `error: ${o.error}`
  if (o.created === true) return "✓ created"
  if (o.updated === true) return "✓ updated"
  if (o.deleted === true) return "✓ deleted"
  for (const key of [
    "rocks",
    "tasks",
    "issues",
    "people",
    "users",
    "notes",
    "milestones",
    "metrics",
    "entries",
  ]) {
    const val = o[key]
    if (Array.isArray(val)) return `${val.length} ${key}`
  }
  return ""
}
