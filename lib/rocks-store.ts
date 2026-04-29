"use client"

import { create } from "zustand"
import { type MockRock, type RockStatus } from "@/lib/mock-data"
import type { Role } from "@/types/permissions"
import type { WorkspaceMember } from "@/lib/tasks-server"

export type RocksActor = {
  id: string
  role: Role
  isMaster: boolean
}

export type Milestone = {
  id: string
  rockId: string
  title: string
  due: string // YYYY-MM-DD
  done: boolean
}

export type RockUpdate = {
  id: string
  rockId: string
  authorId: string | "AI"
  authorLabel: string
  at: string
  body: string
}

export type LinkedTaskRef = {
  id: string
  rockId: string
  title: string
  due: string
  ownerId: string
  done: boolean
}

export const PARENT_GOALS: Record<string, string> = {
  r1: "1-YEAR · 7-FIGURE AGENCY",
  r2: "1-YEAR · CLIENT RETENTION",
  r3: "1-YEAR · INBOUND DEMAND",
  r4: "1-YEAR · PARTNERSHIP REVENUE",
  r5: "1-YEAR · TEAM CAPACITY",
  r6: "1-YEAR · PRODUCT REVENUE",
  r7: "1-YEAR · NEW CLIENT GROWTH",
}

export const ROCK_DEPARTMENTS: Record<string, string> = {
  r1: "Sales",
  r2: "Client Ops",
  r3: "Production",
  r4: "Partnerships",
  r5: "People Ops",
  r6: "Product",
  r7: "Marketing",
}

export const ROCK_OUTCOMES: Record<string, string> = {
  r1: "All 7 modules of the Hormozi-style $100M Offer for Tier 2 shipped, sales page live, video script locked, with first 5 paying customers onboarded by end of Q2.",
  r2: "Quintessa intake automation hits 100% reliable transfer across 30 consecutive client interactions with zero manual fallback by end of Q2.",
  r3: "Cinematic VSL launched with Hormozi arena scene, B-roll, and locked voice — driving inbound demand for Tier 2 by end of Q2.",
  r4: "Boomer AI hits 153 active paying users by end of Q2 (currently 93).",
  r5: "Senior AI Engineer signed and onboarded by mid-Q2 with first ship within 30 days.",
  r6: "Public launch of Toolkit T1 by June 30, 2026 with: paid checkout flow live, ≥3 paying customers, NPS ≥ 40 from beta users, full documentation site shipped.",
  r7: "OKC outbound: 50 prospect list built, 10 booked discovery calls, 2 closed clients by end of Q2.",
}

const MS: Milestone[] = [
  // r6 — at-risk Toolkit T1 (used by drawer demo content)
  { id: "m6_1", rockId: "r6", title: "Lock T1 feature scope · 5 core capabilities", due: "2026-04-02", done: true },
  { id: "m6_2", rockId: "r6", title: "Brand identity · landing site visual direction", due: "2026-04-09", done: true },
  { id: "m6_3", rockId: "r6", title: "Build core T1 agent — STACY v1", due: "2026-04-16", done: true },
  { id: "m6_4", rockId: "r6", title: "Internal QA pass on agent behavior", due: "2026-04-21", done: true },
  { id: "m6_5", rockId: "r6", title: "Stripe checkout flow + entitlement gating", due: "2026-05-02", done: false },
  { id: "m6_6", rockId: "r6", title: "Beta cohort onboarded · 5 paying customers", due: "2026-05-16", done: false },
  { id: "m6_7", rockId: "r6", title: "Documentation site live · all 5 capabilities", due: "2026-05-23", done: false },
  { id: "m6_8", rockId: "r6", title: "NPS ≥ 40 from beta cohort", due: "2026-06-06", done: false },
  { id: "m6_9", rockId: "r6", title: "Public launch announcement (LinkedIn, email)", due: "2026-06-24", done: false },

  // r1 — Hormozi offer
  { id: "m1_1", rockId: "r1", title: "Module 1-3 · Hook + 3 objections", due: "2026-04-08", done: true },
  { id: "m1_2", rockId: "r1", title: "Module 4-5 · Risk reversal + bonuses", due: "2026-04-15", done: true },
  { id: "m1_3", rockId: "r1", title: "Module 6 · Pricing + scarcity", due: "2026-04-22", done: true },
  { id: "m1_4", rockId: "r1", title: "Module 7 · Closing + CTA", due: "2026-04-25", done: false },
  { id: "m1_5", rockId: "r1", title: "Sales page wired + checkout live", due: "2026-04-29", done: false },

  // r2 — Quintessa
  { id: "m2_1", rockId: "r2", title: "STACY routing logic · spec locked", due: "2026-04-04", done: true },
  { id: "m2_2", rockId: "r2", title: "Twilio handoff bridge built", due: "2026-04-12", done: true },
  { id: "m2_3", rockId: "r2", title: "QA · 30 transfer test calls", due: "2026-04-26", done: false },
  { id: "m2_4", rockId: "r2", title: "Production cutover", due: "2026-05-08", done: false },
]

const UPDATES: RockUpdate[] = [
  {
    id: "u1",
    rockId: "r6",
    authorId: "AI",
    authorLabel: "AI IMPLEMENTER",
    at: "TODAY 8:14 AM",
    body: "Velocity dropped 22% over 2 weeks. Brooklyn last touched milestones 6 days ago. Recommend: break remaining 65% into 3 sub-milestones, escalate to L10 on Monday.",
  },
  {
    id: "u2",
    rockId: "r6",
    authorId: "u_bro",
    authorLabel: "BROOKLYN",
    at: "APR 19",
    body: "Done with Module 7 voice review. Realized we need a full Stripe redo — current entitlement logic doesn't cover annual upgrades. New spec coming.",
  },
  {
    id: "u3",
    rockId: "r6",
    authorId: "u_geo",
    authorLabel: "GEORGE",
    at: "APR 11",
    body: "Identity locked. Going monochrome gold + black, sharp corners, Bebas Neue display. Brooklyn taking the lead on landing page from here.",
  },
]

const LINKED_TASKS: LinkedTaskRef[] = [
  { id: "lt1", rockId: "r6", title: "Stripe entitlement gating logic spec", due: "2026-05-01", ownerId: "u_bar", done: false },
  { id: "lt2", rockId: "r6", title: "Doc site IA · Mintlify or Docusaurus decision", due: "2026-04-28", ownerId: "u_bro", done: false },
  { id: "lt3", rockId: "r6", title: "Beta invite copy + landing waitlist gate", due: "2026-05-04", ownerId: "u_ivy", done: false },
]

type RocksState = {
  rocks: MockRock[]
  setRocks: (rocks: MockRock[]) => void
  insertRock: (rock: MockRock) => void

  members: WorkspaceMember[]
  setMembers: (members: WorkspaceMember[]) => void

  milestones: Milestone[]
  updates: RockUpdate[]
  linkedTasks: LinkedTaskRef[]

  workspaceSlug: string
  setWorkspaceSlug: (slug: string) => void

  currentActor: RocksActor | null
  setCurrentActor: (actor: RocksActor) => void

  openRockId: string | null
  openRock: (id: string) => void
  closeRock: () => void

  newRockOpen: boolean
  openNewRock: () => void
  closeNewRock: () => void

  updateStatus: (id: string, status: RockStatus) => void
  toggleMilestone: (id: string) => void
  addMilestone: (rockId: string, title: string, due: string) => void
}

export const useRocksStore = create<RocksState>((set) => ({
  rocks: [],
  setRocks: (rocks) => set({ rocks }),
  members: [],
  setMembers: (members) => set({ members }),
  insertRock: (rock) =>
    set((state) => {
      const exists = state.rocks.some((r) => r.id === rock.id)
      return {
        rocks: exists
          ? state.rocks.map((r) => (r.id === rock.id ? rock : r))
          : [rock, ...state.rocks],
      }
    }),

  milestones: [...MS],
  updates: [...UPDATES],
  linkedTasks: [...LINKED_TASKS],

  workspaceSlug: "",
  setWorkspaceSlug: (slug) => set({ workspaceSlug: slug }),

  currentActor: null,
  setCurrentActor: (actor) => set({ currentActor: actor }),

  openRockId: null,
  openRock: (id) => set({ openRockId: id }),
  closeRock: () => set({ openRockId: null }),

  newRockOpen: false,
  openNewRock: () => set({ newRockOpen: true }),
  closeNewRock: () => set({ newRockOpen: false }),

  updateStatus: (id, status) =>
    set((state) => ({
      rocks: state.rocks.map((r) => (r.id === id ? { ...r, status } : r)),
    })),
  toggleMilestone: (id) =>
    set((state) => ({
      milestones: state.milestones.map((m) => (m.id === id ? { ...m, done: !m.done } : m)),
    })),
  addMilestone: (rockId, title, due) =>
    set((state) => ({
      milestones: [
        ...state.milestones,
        { id: crypto.randomUUID(), rockId, title, due, done: false },
      ],
    })),
}))

export function rockProgress(rockId: string, milestones: Milestone[], fallback: number): number {
  const own = milestones.filter((m) => m.rockId === rockId)
  if (own.length === 0) return fallback
  return Math.round((own.filter((m) => m.done).length / own.length) * 100)
}
