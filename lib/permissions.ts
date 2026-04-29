/**
 * Orage Core · Role-based access helpers
 *
 * Client-side checks for UX (hide buttons, lock drag handles).
 * The same rules are enforced server-side via Postgres RLS — see
 * scripts/00-database-schema.sql for can_edit_rocks() and friends.
 */

import type { Actor, Capability, Role } from "@/types/permissions"

/**
 * Capability matrix — derived from 00-design-system.html "Permission Tiers".
 * Master users implicitly have every capability.
 */
const MATRIX: Record<Capability, Role[]> = {
  "vto.edit": ["founder"],
  "rocks.edit": ["founder", "admin", "leader"],
  "rocks.drag": ["founder", "admin", "leader"],
  "accountability.edit": ["founder", "admin"],
  "issues.edit": ["founder", "admin", "leader", "member"],
  "tasks.create": ["founder", "admin", "leader", "member"],
  "tasks.drag": ["founder", "admin", "leader", "member"],
  "tasks.reassign": ["founder", "admin", "leader", "member"],
  "scorecard.edit": ["founder", "admin", "leader", "member"],
  "meetings.run_l10": ["founder", "admin", "leader"],
  "notes.create": ["founder", "admin", "leader", "member"],
  "users.invite": ["founder", "admin"],
  "settings.edit": ["founder", "admin"],
  "tenants.god_view": [], // master-only — handled below
}

export function can(actor: Actor, capability: Capability): boolean {
  if (actor.isMaster) return true
  return MATRIX[capability]?.includes(actor.role) ?? false
}

export function canEditRocks(actor: Actor): boolean {
  return can(actor, "rocks.edit")
}

export function canEditVto(actor: Actor): boolean {
  return can(actor, "vto.edit")
}

export function canRunL10(actor: Actor): boolean {
  return can(actor, "meetings.run_l10")
}

export function canDragTask(actor: Actor, taskOwnerId: string): boolean {
  // Members can drag their own tasks; leaders+ can drag anyone's.
  if (actor.isMaster) return true
  if (actor.role === "viewer" || actor.role === "field") return false
  if (actor.role === "member") return actor.id === taskOwnerId
  return true
}

export function isMaster(actor: Actor): boolean {
  return actor.isMaster
}
