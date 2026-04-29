/**
 * Server-side action permission gate (BACKEND-ARCHITECTURE §5).
 *
 * `lib/permissions.ts` is the *client-side* capability matrix used by
 * the UI to hide buttons. This module is the *server-side* gate every
 * server action calls before touching the DB. It mirrors the RLS
 * policies in scripts/004_rls.sql so we fail fast with a friendly
 * error instead of a cryptic Postgres "row violates RLS policy".
 *
 * The auth schema landed in 01-auth-schema-llYXw.sql collapses the old
 * 5-tier role enum into the three real database roles `owner`, `admin`,
 * `member` plus the cross-workspace `is_master` flag (resolved as the
 * synthetic role `"master"`). This matrix accepts the new auth Role
 * directly so callers can pass `requireUser(...)` straight in.
 */
import "server-only"
import type { AuthUser, Role } from "@/lib/auth"

export type Action =
  | "rocks:write"
  | "rocks:delete"
  | "tasks:write"
  | "tasks:delete"
  | "issues:write"
  | "issues:delete"
  | "scorecard:write"
  | "scorecard:delete"
  | "notes:write"
  | "notes:delete"
  | "vto:write"
  | "vto:delete"
  | "accountability:write"
  | "tenants:admin"
  | "integrations:write"

/**
 * `master` is the cross-workspace Orage staff role (always full power); it
 * is granted implicitly via `user.isMaster` and never appears as an entry
 * here. The remaining 5 roles cover both the new `owner | admin | member`
 * DB roles and the legacy `founder | leader | viewer` strings still stored
 * on a few demo memberships.
 */
const MATRIX: Record<Action, ReadonlyArray<Role>> = {
  "rocks:write": ["founder", "admin", "leader"],
  "rocks:delete": ["founder", "admin"],
  "tasks:write": ["founder", "admin", "leader", "member"],
  "tasks:delete": ["founder", "admin", "leader"],
  "issues:write": ["founder", "admin", "leader", "member"],
  "issues:delete": ["founder", "admin", "leader"],
  "scorecard:write": ["founder", "admin", "leader"],
  "scorecard:delete": ["founder", "admin"],
  "notes:write": ["founder", "admin", "leader", "member"],
  "notes:delete": ["founder", "admin", "leader"],
  "vto:write": ["founder"],
  "vto:delete": ["founder"],
  "accountability:write": ["founder", "admin"],
  "tenants:admin": ["founder", "admin"],
  "integrations:write": ["founder", "admin"],
}

export class PermissionError extends Error {
  constructor(action: Action, role: Role) {
    super(`Permission denied: role "${role}" cannot perform "${action}"`)
    this.name = "PermissionError"
  }
}

export function hasServerPermission(
  user: AuthUser,
  action: Action,
): boolean {
  // Cross-workspace Orage staff are always allowed.
  if (user.isMaster || user.role === "master") return true
  // The new DB role `owner` corresponds to the legacy `founder` tier.
  if (user.role === "owner") return MATRIX[action].includes("founder")
  return MATRIX[action].includes(user.role)
}

export function requirePermission(
  user: AuthUser,
  action: Action,
): void {
  if (!hasServerPermission(user, action)) {
    throw new PermissionError(action, user.role)
  }
}
