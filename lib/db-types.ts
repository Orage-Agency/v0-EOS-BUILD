/**
 * Hand-written DB row types for Day 1.
 *
 * Mirrors scripts/002_schema_core.sql + 003_schema_business.sql exactly.
 * Replace with `supabase gen types typescript` output once we have a
 * stable schema.
 */
import type {
  RockStatus,
  TaskStatus,
  TaskPriority,
  IssueStatus,
  ScorecardStatus,
} from "@/types/database"

export type NudgeStatus = "pending" | "actioned" | "dismissed" | "expired"

export interface DbTenant {
  id: string
  name: string
  slug: string
  tier: string
  status: string
  master_managed: boolean
  branding_logo_url: string | null
  branding_accent_hex: string | null
  trial_ends_at: string | null
  created_at: string
  updated_at: string
}

export interface DbUser {
  id: string
  auth_id: string | null
  email: string
  name: string
  avatar_url: string | null
  is_master: boolean
  is_field_user: boolean
  qr_token_hash: string | null
  created_at: string
  last_active_at: string | null
}

export interface DbRock {
  id: string
  tenant_id: string
  title: string
  description: string | null
  owner_id: string | null
  role_id: string | null
  parent_rock_id: string | null
  quarter: string
  start_date: string | null
  due_date: string
  status: RockStatus
  progress: number
  tag: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface DbTask {
  id: string
  tenant_id: string
  title: string
  description: string | null
  owner_id: string | null
  parent_rock_id: string | null
  parent_issue_id: string | null
  parent_note_id: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  completed_at: string | null
  calendar_event_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface DbIssue {
  id: string
  tenant_id: string
  title: string
  description: string | null
  owner_id: string | null
  rank: number | null
  status: IssueStatus
  source_type: string | null
  source_id: string | null
  ai_generated: boolean
  solved_at: string | null
  solution_note: string | null
  created_by: string | null
  created_at: string
}

export interface DbScorecardMetric {
  id: string
  tenant_id: string
  name: string
  owner_id: string | null
  goal_value: number
  goal_op: string
  goal_value_secondary: number | null
  unit: string | null
  frequency: string
  display_order: number
  archived_at: string | null
  created_at: string
}

export interface DbScorecardEntry {
  id: string
  metric_id: string
  period_start: string
  value: number | null
  status_override: ScorecardStatus | null
  notes: string | null
  created_at: string
}

export interface DbActivityRow {
  id: string
  tenant_id: string
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface DbCalendarEvent {
  id: string
  tenant_id: string
  source_type: string
  source_id: string | null
  external_id: string | null
  provider: string
  title: string | null
  starts_at: string | null
  ends_at: string | null
  sync_state: string
  last_synced_at: string | null
}

export interface DbAiNudge {
  id: string
  tenant_id: string
  user_id: string | null
  type: string
  title: string
  body: string
  action_payload: Record<string, unknown> | null
  status: NudgeStatus
  created_at: string
  actioned_at: string | null
}
