/**
 * Orage Core · Issues seed data (plain module, server- and client-safe).
 *
 * Extracted from lib/issues-store.ts so server-only modules
 * (lib/dashboard.ts, lib/ai/tools.ts) can read the same dataset
 * the client store seeds from. Single source of truth for the
 * 8 demo issues until Supabase issues are seeded.
 */

export type IssueSeverity = "critical" | "high" | "normal" | "low"
export type IssueStage = "identify" | "discuss" | "solve"
export type IssueSource = "user" | "ai" | "scorecard" | "l10"
export type IssueQueue = "open" | "this_week" | "solved" | "tabled"
export type ResolvePath =
  | "rock"
  | "task"
  | "decision"
  | "headline"
  | "archive"

export type IssueResolution = {
  path: ResolvePath
  payload: Record<string, unknown>
  resolvedBy: string
  resolvedAt: string
  reason?: string
}

export type IssueActivity = {
  id: string
  authorLabel: string
  at: string
  body: string
}

export type Issue = {
  id: string
  title: string
  context: string
  severity: IssueSeverity
  stage: IssueStage
  source: IssueSource
  sourceLabel: string
  ownerId: string
  /** ISO date string of creation. Used to compute age. */
  createdAt: string
  ageLabel: string
  rank: number
  queue: IssueQueue
  pinnedForL10: boolean
  linkedRockId?: string
  linkedMetricId?: string
  patternHint?: string
  resolution?: IssueResolution
  activity: IssueActivity[]
}

export type AISuggestion = {
  id: string
  title: string
  context: string
  severity: IssueSeverity
  reason: string
  dismissed: boolean
}

export const SEED_ISSUES: Issue[] = []

export const SEED_AI_SUGGESTIONS: AISuggestion[] = []
