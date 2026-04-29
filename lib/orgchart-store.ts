"use client"

/**
 * Orage Core · Accountability Chart store
 *
 * Seats are designed by what work needs to get done. Each seat carries
 * 3-7 role bullets and (optionally) a person assigned to it. Empty seats
 * are visible as hire needs.
 */

import { create } from "zustand"
import { ROCKS, TASKS, USERS, type MockUser } from "@/lib/mock-data"

export type GWCAnswer = "yes" | "no" | "pending"
export type SeatKind = "visionary" | "integrator" | "department" | "ic"
export type HirePath =
  | "start_hiring"
  | "assign_person"
  | "split_seat"
  | "delete_seat"

export type Seat = {
  id: string
  parentId: string | null
  tier: 1 | 2 | 3
  kind: SeatKind
  title: string
  department: string
  reportsToLabel?: string
  personId?: string
  vacant: boolean
  vacantSinceDays?: number
  candidates?: number
  hiringQuarter?: string
  hiringStatus?: "hiring" | "sourcing"
  roles: string[]
  gwc: { g: GWCAnswer; w: GWCAnswer; c: GWCAnswer }
  capturedAt: string
  createdAt: string
  daysActive: number
}

const SEED_SEATS: Seat[] = [
  {
    id: "s_visionary",
    parentId: null,
    tier: 1,
    kind: "visionary",
    title: "VISIONARY · CEO",
    department: "Leadership",
    personId: "u_geo",
    vacant: false,
    roles: [
      "Long-range vision + 10-year target",
      "Strategic relationships + partnerships",
      "Brand, culture, R&D direction",
      "Final approval on offer + pricing",
      "External relationships (Hormozi, Boomer)",
      "Set quarterly company rocks",
      "Founder-led sales for Tier 2",
    ],
    gwc: { g: "yes", w: "yes", c: "yes" },
    capturedAt: "Q1 2026 · 3 months ago",
    createdAt: "JAN 04, 2024",
    daysActive: 826,
  },
  {
    id: "s_integrator",
    parentId: null,
    tier: 1,
    kind: "integrator",
    title: "INTEGRATOR · COO",
    department: "Operations",
    reportsToLabel: "George (Visionary)",
    personId: "u_bro",
    vacant: false,
    roles: [
      "Run the day-to-day · drive accountability",
      "L10 cadence + meeting rhythm ownership",
      "VSL production + brand visual direction",
      "Toolkit T1 launch ownership",
      "Pair on agent UX with Baruc",
      "Weekly leadership sync facilitation",
    ],
    gwc: { g: "yes", w: "yes", c: "pending" },
    capturedAt: "Q1 2026 · 3 months ago",
    createdAt: "MAR 12, 2024",
    daysActive: 759,
  },
  {
    id: "s_aieng",
    parentId: "s_integrator",
    tier: 2,
    kind: "department",
    title: "AI ENGINEER · VOICE SYSTEMS",
    department: "Engineering",
    reportsToLabel: "Brooklyn (Integrator)",
    personId: "u_bar",
    vacant: false,
    roles: [
      "Build & maintain client voice agents (STACY, NOVA, others)",
      "Own Quintessa intake routing reliability",
      "Spec & ship Toolkit T1 core agent layer",
      "SIP / telephony layer ownership across all client deployments",
      "Pair-program with Brooklyn on agent UX",
    ],
    gwc: { g: "yes", w: "yes", c: "yes" },
    capturedAt: "Q1 2026 · 3 months ago",
    createdAt: "JAN 14, 2026",
    daysActive: 102,
  },
  {
    id: "s_seniorai",
    parentId: "s_integrator",
    tier: 2,
    kind: "department",
    title: "SR. AI ENGINEER",
    department: "Engineering",
    reportsToLabel: "Brooklyn (Integrator)",
    vacant: true,
    vacantSinceDays: 18,
    candidates: 3,
    hiringQuarter: "Q2 2026",
    hiringStatus: "hiring",
    roles: [
      "Senior architectural ownership of agent layer",
      "Pair-program + mentor across team",
      "SIP/telephony + LLM orchestration",
      "Lead Toolkit T2 architecture",
      "Code review + quality gate",
      "Mentorship of mid-level engineers",
      "Production reliability ownership",
    ],
    gwc: { g: "pending", w: "pending", c: "pending" },
    capturedAt: "—",
    createdAt: "MAR 24, 2026",
    daysActive: 32,
  },
  {
    id: "s_marketing",
    parentId: "s_integrator",
    tier: 2,
    kind: "department",
    title: "MARKETING · OUTBOUND",
    department: "Marketing",
    reportsToLabel: "Brooklyn (Integrator)",
    personId: "u_ivy",
    vacant: false,
    roles: [
      "Outbound prospecting + list building",
      "Content + LinkedIn distribution",
      "Discovery call booking · target 8/wk",
      "Coordinate ads with Boomer AI partner",
      "List quality + lead routing",
    ],
    gwc: { g: "yes", w: "no", c: "pending" },
    capturedAt: "Q1 2026 · 3 months ago",
    createdAt: "NOV 03, 2025",
    daysActive: 174,
  },
  {
    id: "s_marketinglead",
    parentId: "s_integrator",
    tier: 2,
    kind: "department",
    title: "MARKETING LEAD",
    department: "Marketing",
    reportsToLabel: "Brooklyn (Integrator)",
    vacant: true,
    vacantSinceDays: 4,
    hiringQuarter: "Q3 2026",
    hiringStatus: "sourcing",
    roles: [
      "Own marketing strategy + budget",
      "Manage Ivy + future content team",
      "Brand growth + attribution model",
      "Partnership marketing programs",
      "Content + paid distribution",
      "Hire content writer Q4",
    ],
    gwc: { g: "pending", w: "pending", c: "pending" },
    capturedAt: "—",
    createdAt: "APR 21, 2026",
    daysActive: 4,
  },
  {
    id: "s_clientops",
    parentId: "s_integrator",
    tier: 2,
    kind: "department",
    title: "CLIENT OPS LEAD",
    department: "Client Ops",
    reportsToLabel: "Brooklyn (Integrator)",
    personId: "u_geo",
    vacant: false,
    roles: [
      "Own onboarding & success across all paid clients",
      "Quarterly review cadence with each tenant",
      "Health-check Slack + automated NPS pulses",
      "Escalation point for any client agent outage",
      "Renewal + expansion conversations",
    ],
    gwc: { g: "yes", w: "yes", c: "yes" },
    capturedAt: "Q1 2026 · 3 months ago",
    createdAt: "FEB 02, 2025",
    daysActive: 448,
  },
]

type State = {
  seats: Seat[]
  view: "tree" | "list" | "gwc"
  filter: "all" | "filled" | "empty" | "gwc-issues"
  zoom: number

  // drawer / modal
  drawerSeatId: string | null
  hireSeatId: string | null
  hirePath: HirePath
  newSeatOpen: boolean
}

type Actions = {
  setView: (v: State["view"]) => void
  setFilter: (f: State["filter"]) => void
  setZoom: (z: number) => void

  openDrawer: (id: string) => void
  closeDrawer: () => void
  openHire: (id: string) => void
  closeHire: () => void
  setHirePath: (p: HirePath) => void

  openNewSeat: () => void
  closeNewSeat: () => void

  // mutations
  cycleGWC: (seatId: string, key: "g" | "w" | "c") => void
  updateRole: (seatId: string, idx: number, text: string) => void
  addRole: (seatId: string) => void
  removeRole: (seatId: string, idx: number) => void
  updateTitle: (seatId: string, title: string) => void
  reparentSeat: (seatId: string, newParentId: string | null) => void

  // selectors
  childrenOf: (parentId: string | null) => Seat[]
  byId: (id: string) => Seat | undefined
  filtered: () => Seat[]
}

export const useOrgChartStore = create<State & Actions>((set, get) => ({
  seats: SEED_SEATS,
  view: "tree",
  filter: "all",
  zoom: 100,
  drawerSeatId: null,
  hireSeatId: null,
  hirePath: "start_hiring",
  newSeatOpen: false,

  setView: (view) => set({ view }),
  setFilter: (filter) => set({ filter }),
  setZoom: (zoom) =>
    set({ zoom: Math.max(50, Math.min(150, Math.round(zoom))) }),

  openDrawer: (id) => set({ drawerSeatId: id }),
  closeDrawer: () => set({ drawerSeatId: null }),
  openHire: (id) =>
    set({ hireSeatId: id, hirePath: "start_hiring" }),
  closeHire: () => set({ hireSeatId: null }),
  setHirePath: (hirePath) => set({ hirePath }),

  openNewSeat: () => set({ newSeatOpen: true }),
  closeNewSeat: () => set({ newSeatOpen: false }),

  cycleGWC: (seatId, key) =>
    set((s) => ({
      seats: s.seats.map((seat) => {
        if (seat.id !== seatId) return seat
        const cycle: Record<GWCAnswer, GWCAnswer> = {
          yes: "no",
          no: "pending",
          pending: "yes",
        }
        return {
          ...seat,
          gwc: { ...seat.gwc, [key]: cycle[seat.gwc[key]] },
        }
      }),
    })),

  updateRole: (seatId, idx, text) =>
    set((s) => ({
      seats: s.seats.map((seat) =>
        seat.id !== seatId
          ? seat
          : {
              ...seat,
              roles: seat.roles.map((r, i) => (i === idx ? text : r)),
            },
      ),
    })),

  addRole: (seatId) =>
    set((s) => ({
      seats: s.seats.map((seat) =>
        seat.id !== seatId
          ? seat
          : { ...seat, roles: [...seat.roles, "New role"] },
      ),
    })),

  removeRole: (seatId, idx) =>
    set((s) => ({
      seats: s.seats.map((seat) =>
        seat.id !== seatId
          ? seat
          : {
              ...seat,
              roles: seat.roles.filter((_, i) => i !== idx),
            },
      ),
    })),

  updateTitle: (seatId, title) =>
    set((s) => ({
      seats: s.seats.map((seat) =>
        seat.id !== seatId ? seat : { ...seat, title },
      ),
    })),

  reparentSeat: (seatId, newParentId) =>
    set((s) => ({
      seats: s.seats.map((seat) =>
        seat.id !== seatId ? seat : { ...seat, parentId: newParentId },
      ),
    })),

  childrenOf: (parentId) =>
    get().seats.filter((s) => s.parentId === parentId),

  byId: (id) => get().seats.find((s) => s.id === id),

  filtered: () => {
    const { seats, filter } = get()
    switch (filter) {
      case "filled":
        return seats.filter((s) => !s.vacant)
      case "empty":
        return seats.filter((s) => s.vacant)
      case "gwc-issues":
        return seats.filter(
          (s) =>
            !s.vacant &&
            (s.gwc.g === "no" ||
              s.gwc.w === "no" ||
              s.gwc.c === "no" ||
              s.gwc.g === "pending" ||
              s.gwc.w === "pending" ||
              s.gwc.c === "pending"),
        )
      default:
        return seats
    }
  },
}))

// ---------- helpers --------------------------------------------------------
export function userBySeat(seat: Seat): MockUser | undefined {
  if (!seat.personId) return undefined
  return USERS.find((u) => u.id === seat.personId)
}

export function rockCountForUser(userId: string): number {
  return ROCKS.filter((r) => r.owner === userId).length
}

export function openTaskCountForUser(userId: string): number {
  return TASKS.filter((t) => t.owner === userId && t.status !== "done").length
}

export function gwcGapCount(seats: Seat[]): number {
  return seats.filter(
    (s) =>
      !s.vacant &&
      (s.gwc.g !== "yes" || s.gwc.w !== "yes" || s.gwc.c !== "yes"),
  ).length
}

export function rightPersonRightSeatCount(seats: Seat[]): {
  filled: number
  rightSeat: number
} {
  const filled = seats.filter((s) => !s.vacant)
  const rightSeat = filled.filter(
    (s) => s.gwc.g === "yes" && s.gwc.w === "yes" && s.gwc.c === "yes",
  ).length
  return { filled: filled.length, rightSeat }
}
