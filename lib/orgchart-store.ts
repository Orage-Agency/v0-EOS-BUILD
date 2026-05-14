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

const BLANK_GWC = { g: "pending" as const, w: "pending" as const, c: "pending" as const }
const SEED_CAPTURED = "—"
const SEED_CREATED = "MAY 13, 2026"

const SEED_SEATS: Seat[] = [
  {
    id: "s_visionary",
    parentId: null,
    tier: 1,
    kind: "visionary",
    title: "VISIONARY · CEO",
    department: "Leadership",
    vacant: true,
    roles: [
      "Long-range vision + 10-year target",
      "Strategic relationships + partnerships",
      "Final approval on offer + pricing",
      "Set quarterly company rocks",
    ],
    gwc: BLANK_GWC,
    capturedAt: SEED_CAPTURED,
    createdAt: SEED_CREATED,
    daysActive: 0,
  },
  {
    id: "s_integrator",
    parentId: "s_visionary",
    tier: 1,
    kind: "integrator",
    title: "INTEGRATOR · COO",
    department: "Operations",
    reportsToLabel: "Visionary",
    vacant: true,
    roles: [
      "L.M.A. — Lead, Manage, Hold Accountable",
      "Run day-to-day cadence",
      "L10 meeting rhythm ownership",
      "Drive accountability across all heads",
    ],
    gwc: BLANK_GWC,
    capturedAt: SEED_CAPTURED,
    createdAt: SEED_CREATED,
    daysActive: 0,
  },
  {
    id: "s_head_product",
    parentId: "s_integrator",
    tier: 2,
    kind: "department",
    title: "HEAD OF PRODUCT",
    department: "Product",
    reportsToLabel: "Integrator",
    vacant: true,
    roles: ["L.M.A. across product team"],
    gwc: BLANK_GWC,
    capturedAt: SEED_CAPTURED,
    createdAt: SEED_CREATED,
    daysActive: 0,
  },
  {
    id: "s_head_sales",
    parentId: "s_integrator",
    tier: 2,
    kind: "department",
    title: "HEAD OF SALES",
    department: "Sales",
    reportsToLabel: "Integrator",
    vacant: true,
    roles: ["L.M.A. across sales team"],
    gwc: BLANK_GWC,
    capturedAt: SEED_CAPTURED,
    createdAt: SEED_CREATED,
    daysActive: 0,
  },
  {
    id: "s_head_marketing",
    parentId: "s_integrator",
    tier: 2,
    kind: "department",
    title: "HEAD OF MARKETING",
    department: "Marketing",
    reportsToLabel: "Integrator",
    vacant: true,
    roles: ["L.M.A. across marketing team"],
    gwc: BLANK_GWC,
    capturedAt: SEED_CAPTURED,
    createdAt: SEED_CREATED,
    daysActive: 0,
  },
  {
    id: "s_accounting",
    parentId: "s_integrator",
    tier: 2,
    kind: "department",
    title: "ACCOUNTING",
    department: "Finance",
    reportsToLabel: "Integrator",
    vacant: true,
    roles: [],
    gwc: BLANK_GWC,
    capturedAt: SEED_CAPTURED,
    createdAt: SEED_CREATED,
    daysActive: 0,
  },
  {
    id: "s_engineer",
    parentId: "s_head_product",
    tier: 3,
    kind: "ic",
    title: "ENGINEER",
    department: "Product",
    reportsToLabel: "Head of Product",
    vacant: true,
    roles: [],
    gwc: BLANK_GWC,
    capturedAt: SEED_CAPTURED,
    createdAt: SEED_CREATED,
    daysActive: 0,
  },
  {
    id: "s_developer",
    parentId: "s_head_product",
    tier: 3,
    kind: "ic",
    title: "DEVELOPER",
    department: "Product",
    reportsToLabel: "Head of Product",
    vacant: true,
    roles: [],
    gwc: BLANK_GWC,
    capturedAt: SEED_CAPTURED,
    createdAt: SEED_CREATED,
    daysActive: 0,
  },
  {
    id: "s_setter",
    parentId: "s_head_sales",
    tier: 3,
    kind: "ic",
    title: "SETTER",
    department: "Sales",
    reportsToLabel: "Head of Sales",
    vacant: true,
    roles: [],
    gwc: BLANK_GWC,
    capturedAt: SEED_CAPTURED,
    createdAt: SEED_CREATED,
    daysActive: 0,
  },
  {
    id: "s_closer_1",
    parentId: "s_head_sales",
    tier: 3,
    kind: "ic",
    title: "CLOSER · A",
    department: "Sales",
    reportsToLabel: "Head of Sales",
    vacant: true,
    roles: [],
    gwc: BLANK_GWC,
    capturedAt: SEED_CAPTURED,
    createdAt: SEED_CREATED,
    daysActive: 0,
  },
  {
    id: "s_closer_2",
    parentId: "s_head_sales",
    tier: 3,
    kind: "ic",
    title: "CLOSER · B",
    department: "Sales",
    reportsToLabel: "Head of Sales",
    vacant: true,
    roles: [],
    gwc: BLANK_GWC,
    capturedAt: SEED_CAPTURED,
    createdAt: SEED_CREATED,
    daysActive: 0,
  },
  {
    id: "s_in_person",
    parentId: "s_head_marketing",
    tier: 3,
    kind: "ic",
    title: "IN-PERSON",
    department: "Marketing",
    reportsToLabel: "Head of Marketing",
    vacant: true,
    roles: [],
    gwc: BLANK_GWC,
    capturedAt: SEED_CAPTURED,
    createdAt: SEED_CREATED,
    daysActive: 0,
  },
  {
    id: "s_video_editor",
    parentId: "s_head_marketing",
    tier: 3,
    kind: "ic",
    title: "VIDEO EDITOR · 3RD PARTY",
    department: "Marketing",
    reportsToLabel: "Head of Marketing",
    vacant: true,
    roles: [],
    gwc: BLANK_GWC,
    capturedAt: SEED_CAPTURED,
    createdAt: SEED_CREATED,
    daysActive: 0,
  },
  {
    id: "s_organic_social",
    parentId: "s_head_marketing",
    tier: 3,
    kind: "ic",
    title: "ORGANIC SOCIAL",
    department: "Marketing",
    reportsToLabel: "Head of Marketing",
    vacant: true,
    roles: [],
    gwc: BLANK_GWC,
    capturedAt: SEED_CAPTURED,
    createdAt: SEED_CREATED,
    daysActive: 0,
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

  // incremented to request a "fit to screen" zoom recalc in the TreeView
  fitSignal: number
}

type Actions = {
  setView: (v: State["view"]) => void
  setFilter: (f: State["filter"]) => void
  setZoom: (z: number) => void
  requestFit: () => void

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
  addSeat: (input: { title: string; parentId: string | null; tier?: 1 | 2 | 3; kind?: SeatKind }) => string
  deleteSeat: (seatId: string) => void

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
  fitSignal: 0,

  setView: (view) => set({ view }),
  setFilter: (filter) => set({ filter }),
  setZoom: (zoom) =>
    set({ zoom: Math.max(25, Math.min(150, Math.round(zoom))) }),
  requestFit: () => set((s) => ({ fitSignal: s.fitSignal + 1 })),

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

  addSeat: ({ title, parentId, tier, kind }) => {
    const id = `s_${Math.random().toString(36).slice(2, 9)}`
    const parent = parentId ? get().seats.find((s) => s.id === parentId) : null
    const resolvedTier: 1 | 2 | 3 =
      tier ?? (parent ? (Math.min((parent.tier ?? 1) + 1, 3) as 1 | 2 | 3) : 1)
    const resolvedKind: SeatKind =
      kind ?? (resolvedTier === 1 ? "visionary" : resolvedTier === 2 ? "department" : "ic")
    const today = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).toUpperCase()
    const newSeat: Seat = {
      id,
      parentId,
      tier: resolvedTier,
      kind: resolvedKind,
      title: title.trim().toUpperCase() || "NEW SEAT",
      department: parent?.department ?? "—",
      reportsToLabel: parent?.title.replace(/ · .*/, ""),
      vacant: true,
      roles: [],
      gwc: { g: "pending", w: "pending", c: "pending" },
      capturedAt: "—",
      createdAt: today,
      daysActive: 0,
    }
    set((s) => ({ seats: [...s.seats, newSeat] }))
    return id
  },

  deleteSeat: (seatId) => {
    const all = get().seats
    const toRemove = new Set<string>()
    function collect(id: string) {
      toRemove.add(id)
      for (const child of all.filter((s) => s.parentId === id)) collect(child.id)
    }
    collect(seatId)
    set((s) => ({
      seats: s.seats.filter((seat) => !toRemove.has(seat.id)),
      drawerSeatId: s.drawerSeatId && toRemove.has(s.drawerSeatId) ? null : s.drawerSeatId,
      hireSeatId: s.hireSeatId && toRemove.has(s.hireSeatId) ? null : s.hireSeatId,
    }))
  },

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
