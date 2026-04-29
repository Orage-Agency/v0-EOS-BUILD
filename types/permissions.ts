/**
 * Orage Core · Permission tier types
 * Mirrors tenant_memberships.role + users.is_master from the database schema.
 */

export type Role =
  | "founder"
  | "admin"
  | "leader"
  | "member"
  | "viewer"
  | "field"

export type Capability =
  | "vto.edit"
  | "rocks.edit"
  | "rocks.drag"
  | "accountability.edit"
  | "issues.edit"
  | "tasks.create"
  | "tasks.drag"
  | "tasks.reassign"
  | "scorecard.edit"
  | "meetings.run_l10"
  | "notes.create"
  | "users.invite"
  | "settings.edit"
  | "tenants.god_view"

export type Actor = {
  id: string
  role: Role
  /** Cross-tenant Orage staff super-power. */
  isMaster: boolean
}
