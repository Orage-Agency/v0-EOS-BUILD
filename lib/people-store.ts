"use client"

import { create } from "zustand"
import { USERS, ROCKS, type MockUser } from "@/lib/mock-data"

export type GWCAnswer = "yes" | "no" | "pending"
export type SignalTrend = "up" | "down" | "flat"
export type SignalTone = "green" | "yellow" | "red"

export type PersonProfile = {
  userId: string
  title: string
  seatRoles: string[]
  bio?: string
  joinedAt: string // ISO date
  timezone: string
  slack: string
  managerId?: string
  reportsToLabel?: string
  lastOneOnOne?: number // timestamp
  quarterlyConversation: {
    quarter: string
    dueThisWeek: boolean
    workingNote?: string
    notWorkingNote?: string
    coreValuesNote?: string
    gwcReevalNote?: string
  }
  gwc: {
    quarter: string
    capturedAt: string
    g: { answer: GWCAnswer; note?: string }
    w: { answer: GWCAnswer; note?: string }
    c: { answer: GWCAnswer; note?: string }
    trend?: string
  }
  signals: PerformanceSignal[]
  ownedRockIds: string[]
}

export type PerformanceSignal = {
  id: string
  label: string
  value: string
  trend: SignalTrend
  trendLabel: string
  fillPct: number
  tone: SignalTone
  context: string
}

export type ActionItem = {
  id: string
  text: string
  ownerLabel?: string
  done: boolean
  dueLabel?: string
  dueTone?: "muted" | "warn" | "danger"
}

export type OneOnOne = {
  id: string
  personId: string
  withId: string
  scheduledAt: number
  durationMin: number
  status: "upcoming" | "completed" | "missed" | "cancelled"
  title: string
  agenda?: string
  notes?: string
  preview?: string
  actions: ActionItem[]
}

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.now()

/**
 * Reset-to-Zero: profile shells stay so name/title cards render, but every
 * activity-derived signal (gwc, lastOneOnOne, signals, ownedRockIds) is
 * empty until the master fills them in via the onboarding wizard or the
 * regular flows.
 */
const seedProfiles: Record<string, PersonProfile> = {
  u_geo: {
    userId: "u_geo",
    title: "",
    seatRoles: [],
    joinedAt: "",
    timezone: "",
    slack: "",
    lastOneOnOne: undefined,
    quarterlyConversation: {
      quarter: "",
      dueThisWeek: false,
    },
    gwc: {
      quarter: "",
      capturedAt: "",
      g: { answer: "pending", note: "" },
      w: { answer: "pending", note: "" },
      c: { answer: "pending", note: "" },
      trend: "",
    },
    signals: [],
    ownedRockIds: [],
  },
  u_bro: {
    userId: "u_bro",
    title: "",
    seatRoles: [],
    joinedAt: "",
    timezone: "",
    slack: "",
    managerId: "u_geo",
    reportsToLabel: "GEORGE",
    lastOneOnOne: undefined,
    quarterlyConversation: { quarter: "", dueThisWeek: false },
    gwc: {
      quarter: "",
      capturedAt: "",
      g: { answer: "pending", note: "" },
      w: { answer: "pending", note: "" },
      c: { answer: "pending", note: "" },
      trend: "",
    },
    signals: [],
    ownedRockIds: [],
  },
  u_bar: {
    userId: "u_bar",
    title: "",
    seatRoles: [],
    joinedAt: "",
    timezone: "",
    slack: "",
    managerId: "u_geo",
    reportsToLabel: "GEORGE",
    lastOneOnOne: undefined,
    quarterlyConversation: { quarter: "", dueThisWeek: false },
    gwc: {
      quarter: "",
      capturedAt: "",
      g: { answer: "pending", note: "" },
      w: { answer: "pending", note: "" },
      c: { answer: "pending", note: "" },
      trend: "",
    },
    signals: [],
    ownedRockIds: [],
  },
  u_ivy: {
    userId: "u_ivy",
    title: "",
    seatRoles: [],
    joinedAt: "",
    timezone: "",
    slack: "",
    managerId: "u_bro",
    reportsToLabel: "BROOKLYN",
    lastOneOnOne: undefined,
    quarterlyConversation: { quarter: "", dueThisWeek: false },
    gwc: {
      quarter: "",
      capturedAt: "",
      g: { answer: "pending", note: "" },
      w: { answer: "pending", note: "" },
      c: { answer: "pending", note: "" },
      trend: "",
    },
    signals: [],
    ownedRockIds: [],
  },
}

const seedOneOnOnes: OneOnOne[] = []

type Role = "founder" | "admin" | "leader" | "member" | "viewer" | "field"

export type Invite = {
  id: string
  email: string
  fullName?: string
  role: Role
  reportsToId?: string
  note?: string
  sentAt: number
}

type State = {
  profiles: Record<string, PersonProfile>
  oneOnOnes: OneOnOne[]
  invites: Invite[]
  drawerOneOnOneId: string | null
  inviteOpen: boolean
  scheduleOpenForPersonId: string | null
  selectedRole: Role
}

type Actions = {
  // selectors
  getProfile: (userId: string) => PersonProfile | undefined
  getOneOnOnesFor: (personId: string) => OneOnOne[]
  getOneOnOne: (id: string) => OneOnOne | undefined
  // GWC
  cycleGWC: (userId: string, key: "g" | "w" | "c") => void
  setGWCNote: (userId: string, key: "g" | "w" | "c", note: string) => void
  // 1:1 drawer
  openOneOnOneDrawer: (id: string) => void
  closeOneOnOneDrawer: () => void
  updateOneOnOneTitle: (id: string, title: string) => void
  updateOneOnOneAgenda: (id: string, agenda: string) => void
  updateOneOnOneNotes: (id: string, notes: string) => void
  toggleAction: (oneOnOneId: string, actionId: string) => void
  scheduleOneOnOne: (personId: string, scheduledAt: number, durationMin: number) => string
  // invite modal
  openInvite: () => void
  closeInvite: () => void
  setInviteRole: (role: Role) => void
  sendInvite: (data: Omit<Invite, "id" | "sentAt">) => void
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

export const usePeopleStore = create<State & Actions>((set, get) => ({
  profiles: seedProfiles,
  oneOnOnes: seedOneOnOnes,
  invites: [],
  drawerOneOnOneId: null,
  inviteOpen: false,
  scheduleOpenForPersonId: null,
  selectedRole: "member",

  getProfile: (userId) => get().profiles[userId],
  getOneOnOnesFor: (personId) =>
    get()
      .oneOnOnes.filter((o) => o.personId === personId)
      .sort((a, b) => b.scheduledAt - a.scheduledAt),
  getOneOnOne: (id) => get().oneOnOnes.find((o) => o.id === id),

  cycleGWC: (userId, key) =>
    set((s) => {
      const profile = s.profiles[userId]
      if (!profile) return s
      const cycle: Record<GWCAnswer, GWCAnswer> = {
        yes: "no",
        no: "pending",
        pending: "yes",
      }
      return {
        profiles: {
          ...s.profiles,
          [userId]: {
            ...profile,
            gwc: {
              ...profile.gwc,
              [key]: { ...profile.gwc[key], answer: cycle[profile.gwc[key].answer] },
            },
          },
        },
      }
    }),

  setGWCNote: (userId, key, note) =>
    set((s) => {
      const profile = s.profiles[userId]
      if (!profile) return s
      return {
        profiles: {
          ...s.profiles,
          [userId]: {
            ...profile,
            gwc: {
              ...profile.gwc,
              [key]: { ...profile.gwc[key], note },
            },
          },
        },
      }
    }),

  openOneOnOneDrawer: (id) => set({ drawerOneOnOneId: id }),
  closeOneOnOneDrawer: () => set({ drawerOneOnOneId: null }),

  updateOneOnOneTitle: (id, title) =>
    set((s) => ({
      oneOnOnes: s.oneOnOnes.map((o) => (o.id === id ? { ...o, title } : o)),
    })),
  updateOneOnOneAgenda: (id, agenda) =>
    set((s) => ({
      oneOnOnes: s.oneOnOnes.map((o) => (o.id === id ? { ...o, agenda } : o)),
    })),
  updateOneOnOneNotes: (id, notes) =>
    set((s) => ({
      oneOnOnes: s.oneOnOnes.map((o) => (o.id === id ? { ...o, notes } : o)),
    })),

  toggleAction: (oneOnOneId, actionId) =>
    set((s) => ({
      oneOnOnes: s.oneOnOnes.map((o) =>
        o.id !== oneOnOneId
          ? o
          : {
              ...o,
              actions: o.actions.map((a) =>
                a.id === actionId
                  ? {
                      ...a,
                      done: !a.done,
                      dueLabel: !a.done ? "DONE" : a.dueLabel,
                      dueTone: !a.done ? ("muted" as const) : a.dueTone,
                    }
                  : a,
              ),
            },
      ),
    })),

  scheduleOneOnOne: (personId, scheduledAt, durationMin) => {
    const id = uid("ooo")
    const target = USERS.find((u) => u.id === personId)
    set((s) => ({
      oneOnOnes: [
        ...s.oneOnOnes,
        {
          id,
          personId,
          withId: USERS[0].id,
          scheduledAt,
          durationMin,
          status: "upcoming" as const,
          title: `${target?.name.split(" ")[0] ?? "—"} 1:1`,
          actions: [],
        },
      ],
    }))
    return id
  },

  openInvite: () => set({ inviteOpen: true }),
  closeInvite: () => set({ inviteOpen: false }),
  setInviteRole: (role) => set({ selectedRole: role }),

  sendInvite: (data) =>
    set((s) => ({
      invites: [
        ...s.invites,
        { id: uid("inv"), sentAt: Date.now(), ...data },
      ],
      inviteOpen: false,
    })),
}))

// Helpers
export function userById(id?: string): MockUser | undefined {
  if (!id) return undefined
  return USERS.find((u) => u.id === id)
}

export function tenureDays(joinedAtIso: string): number {
  const ms = Date.now() - new Date(joinedAtIso).getTime()
  return Math.max(0, Math.round(ms / DAY))
}

export function formatJoined(joinedAtIso: string): string {
  const d = new Date(joinedAtIso)
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .toUpperCase()
}

export function daysAgo(ts: number): number {
  return Math.max(0, Math.round((Date.now() - ts) / DAY))
}
