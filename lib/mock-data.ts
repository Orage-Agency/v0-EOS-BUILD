/**
 * Orage Core · Phase 1 mock data
 * Shared across every Phase 1 module so dashboards, rock boards,
 * notes, and tasks reference the same entities.
 *
 * Replace with real DB queries once Supabase + Prisma are wired.
 */

import type { Role } from "@/types/permissions"

// ============================================================================
// USERS
// ============================================================================
export type MockUser = {
  id: string
  name: string
  initials: string
  email: string
  role: Role
  isMaster: boolean
  /** CSS class fragment used by .avatar.{color} (geo|bro|bar|ivy) */
  color: "geo" | "bro" | "bar" | "ivy"
}

export const USERS: MockUser[] = [
  {
    id: "u_geo",
    name: "George Moffat",
    initials: "GM",
    email: "george@orage.agency",
    role: "founder",
    isMaster: true,
    color: "geo",
  },
  {
    id: "u_bro",
    name: "Brooklyn",
    initials: "BR",
    email: "brooklyn@orage.agency",
    role: "founder",
    isMaster: true,
    color: "bro",
  },
  {
    id: "u_bar",
    name: "Baruc Maldonado",
    initials: "BA",
    email: "baruc@orage.agency",
    role: "member",
    isMaster: false,
    color: "bar",
  },
  {
    id: "u_ivy",
    name: "Ivy",
    initials: "IV",
    email: "ivy@orage.agency",
    role: "member",
    isMaster: false,
    color: "ivy",
  },
]

/** Toggle this index to test the app under a different role. */
export const CURRENT_USER: MockUser = USERS[0]

export function getUser(id: string): MockUser | undefined {
  return USERS.find((u) => u.id === id)
}

// ============================================================================
// TENANT
// ============================================================================
export const TENANT = {
  id: "t_orage",
  name: "Orage Agency LLC",
  slug: "orage",
  tier: "master" as const,
  branding: { accent: "#B68039" },
}

// ============================================================================
// ROCKS · Q2 2026
// ============================================================================
export type RockStatus =
  | "on_track"
  | "in_progress"
  | "at_risk"
  | "off_track"
  | "done"

export type MockRock = {
  id: string
  title: string
  description?: string
  status: RockStatus
  progress: number
  owner: string
  due: string
  tag: string
}

/**
 * Reset-to-Zero: rocks ship empty. The user creates them via /rocks.
 * The shape stays so consumers compile.
 */
export const ROCKS: MockRock[] = []

// ============================================================================
// TASKS
// ============================================================================
export type TaskStatus = "open" | "in_progress" | "done" | "cancelled"
export type TaskPriority = "high" | "med" | "low"

export type MockTask = {
  id: string
  title: string
  /** Owner user id. Use UNASSIGNED_OWNER_ID for tasks no one owns. */
  owner: string
  createdBy?: string
  status: TaskStatus
  priority: TaskPriority
  due: string
  rockId?: string
  completed?: string
}

export const UNASSIGNED_OWNER_ID = "u_unassigned"

/**
 * Reset-to-Zero: tasks ship empty. The user creates them via /tasks
 * or asks the AI Implementer to capture them.
 */
export const TASKS: MockTask[] = []
