/**
 * Per-user notification preference helpers.
 *
 * Default is "all enabled" — `notification_prefs` is null for new users.
 * The shape stores only opt-outs, so a missing key means "opt in", which
 * keeps the migration trivial and the JSON tiny.
 */

export type NotificationKind =
  | "task_assigned"
  | "rock_owner_changed"
  | "milestone_assigned"
  | "handoff"
  | "mention"
  | "overdue"
  | "invite_accepted"

export type NotificationChannel = "in_app" | "email"

export type NotificationPrefs = {
  [K in NotificationKind]?: {
    in_app?: boolean
    email?: boolean
  }
}

const KIND_LABEL: Record<NotificationKind, string> = {
  task_assigned: "Task assigned to me",
  rock_owner_changed: "Rock owner changed",
  milestone_assigned: "Milestone assigned",
  handoff: "Task handoff received",
  mention: "I'm mentioned in a note",
  overdue: "Task is overdue",
  invite_accepted: "Invite accepted",
}

export const KIND_ORDER: NotificationKind[] = [
  "task_assigned",
  "handoff",
  "mention",
  "overdue",
  "rock_owner_changed",
  "milestone_assigned",
  "invite_accepted",
]

export function labelForKind(kind: NotificationKind): string {
  return KIND_LABEL[kind]
}

/**
 * Returns true if the channel is enabled for the kind. Missing entries
 * default to true (opt-out model).
 */
export function isEnabled(
  prefs: NotificationPrefs | null | undefined,
  kind: NotificationKind,
  channel: NotificationChannel,
): boolean {
  if (!prefs) return true
  const k = prefs[kind]
  if (!k) return true
  const v = k[channel]
  return v === undefined ? true : v
}
