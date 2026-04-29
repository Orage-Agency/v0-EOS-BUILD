/**
 * Orage Core · Shared database-shape types
 * These mirror the Prisma models for use in client components and queries
 * before the Prisma client is generated. Once `prisma generate` runs you can
 * import directly from `@prisma/client` and gradually retire these.
 */

export type RockStatus =
  | "on_track"
  | "in_progress"
  | "at_risk"
  | "off_track"
  | "done"

export type TaskStatus = "open" | "in_progress" | "done" | "cancelled"
export type TaskPriority = "high" | "med" | "low"

export type IssueStatus = "open" | "discussing" | "solved" | "dropped"

export type MeetingType = "l10" | "quarterly" | "annual" | "one_on_one"

export type ScorecardStatus = "green" | "yellow" | "red"

export type NoteParentType =
  | "rock"
  | "issue"
  | "task"
  | "meeting"
  | "person"
  | null

export type NudgeType =
  | "rock_velocity"
  | "scorecard_pattern"
  | "handoff_health"
  | "milestone_proposal"

export type IntegrationProvider =
  | "google_calendar"
  | "slack"
  | "ghl"
  | "n8n_webhook"
