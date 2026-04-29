"use client"

/**
 * Orage Core · Issues client store
 * IDS queue: identify → discuss → solve.
 * Local optimistic state. Replace with Supabase queries once wired.
 *
 * Seed data + types now live in `lib/issues-seed.ts` (a plain module)
 * so server-only code (dashboard helpers, AI tools) can read the same
 * dataset without importing this "use client" module.
 */

import { create } from "zustand"
import {
  SEED_ISSUES,
  SEED_AI_SUGGESTIONS,
  type AISuggestion,
  type Issue,
  type IssueActivity,
  type IssueQueue,
  type IssueResolution,
  type IssueSeverity,
  type IssueSource,
  type IssueStage,
  type ResolvePath,
} from "@/lib/issues-seed"

export type {
  AISuggestion,
  Issue,
  IssueActivity,
  IssueQueue,
  IssueResolution,
  IssueSeverity,
  IssueSource,
  IssueStage,
  ResolvePath,
}

type IssuesState = {
  issues: Issue[]
  aiSuggestions: AISuggestion[]
  activeQueue: IssueQueue
  drawerIssueId: string | null
  resolveIssueId: string | null
  newIssueOpen: boolean
  aiPanelCollapsed: boolean

  setActiveQueue: (q: IssueQueue) => void
  openDrawer: (id: string) => void
  closeDrawer: () => void
  openResolve: (id: string) => void
  closeResolve: () => void
  openNewIssue: () => void
  closeNewIssue: () => void
  toggleAiPanel: () => void

  reorderIssues: (orderedIds: string[]) => void
  setStage: (id: string, stage: IssueStage) => void
  togglePin: (id: string) => void
  updateContext: (id: string, context: string) => void
  updateTitle: (id: string, title: string) => void
  resolveIssue: (id: string, resolution: IssueResolution) => void
  createIssue: (input: {
    title: string
    context?: string
    severity: IssueSeverity
    linkedRockId?: string
    pinnedForL10?: boolean
    ownerId: string
    authorLabel: string
  }) => string
  dismissAISuggestion: (id: string) => void
  promoteAISuggestion: (id: string, ownerId: string, authorLabel: string) => string
}

export const useIssuesStore = create<IssuesState>((set, get) => ({
  issues: [...SEED_ISSUES],
  aiSuggestions: [...SEED_AI_SUGGESTIONS],
  activeQueue: "open",
  drawerIssueId: null,
  resolveIssueId: null,
  newIssueOpen: false,
  aiPanelCollapsed: false,

  setActiveQueue: (q) => set({ activeQueue: q }),
  openDrawer: (id) => set({ drawerIssueId: id }),
  closeDrawer: () => set({ drawerIssueId: null }),
  openResolve: (id) => set({ resolveIssueId: id }),
  closeResolve: () => set({ resolveIssueId: null }),
  openNewIssue: () => set({ newIssueOpen: true }),
  closeNewIssue: () => set({ newIssueOpen: false }),
  toggleAiPanel: () =>
    set((s) => ({ aiPanelCollapsed: !s.aiPanelCollapsed })),

  reorderIssues: (orderedIds) =>
    set((state) => {
      const map = new Map(state.issues.map((i) => [i.id, i]))
      const reordered: Issue[] = []
      orderedIds.forEach((id, idx) => {
        const issue = map.get(id)
        if (issue) {
          reordered.push({ ...issue, rank: idx + 1 })
          map.delete(id)
        }
      })
      // Issues not in the ordered list (different queues) keep their place
      return { issues: [...reordered, ...map.values()] }
    }),

  setStage: (id, stage) =>
    set((state) => ({
      issues: state.issues.map((i) =>
        i.id === id ? { ...i, stage } : i,
      ),
    })),

  togglePin: (id) =>
    set((state) => ({
      issues: state.issues.map((i) =>
        i.id === id ? { ...i, pinnedForL10: !i.pinnedForL10 } : i,
      ),
    })),

  updateContext: (id, context) =>
    set((state) => ({
      issues: state.issues.map((i) =>
        i.id === id ? { ...i, context } : i,
      ),
    })),

  updateTitle: (id, title) =>
    set((state) => ({
      issues: state.issues.map((i) =>
        i.id === id ? { ...i, title } : i,
      ),
    })),

  resolveIssue: (id, resolution) =>
    set((state) => ({
      issues: state.issues.map((i) => {
        if (i.id !== id) return i
        const next: Issue = {
          ...i,
          stage: "solve",
          queue: resolution.path === "archive" ? "tabled" : "solved",
          resolution,
          activity: [
            ...i.activity,
            {
              id: `a_${i.id}_${Date.now()}`,
              authorLabel: `${resolution.resolvedBy.toUpperCase()} · NOW`,
              at: resolution.resolvedAt,
              body: `Resolved → ${resolution.path.toUpperCase()}${
                resolution.reason ? ` · ${resolution.reason}` : ""
              }`,
            },
          ],
        }
        return next
      }),
    })),

  createIssue: ({
    title,
    context,
    severity,
    linkedRockId,
    pinnedForL10,
    ownerId,
    authorLabel,
  }) => {
    const id = `i_${Math.random().toString(36).slice(2, 9)}`
    const nextRank =
      Math.max(0, ...get().issues.filter((i) => i.queue === "open").map((i) => i.rank)) +
      1
    const now = new Date().toISOString()
    set((state) => ({
      issues: [
        ...state.issues,
        {
          id,
          title,
          context: context ?? "",
          severity,
          stage: "identify",
          source: "user",
          sourceLabel: `USER · ${authorLabel.toUpperCase()}`,
          ownerId,
          createdAt: now,
          ageLabel: "JUST NOW",
          rank: nextRank,
          queue: "open",
          pinnedForL10: !!pinnedForL10,
          linkedRockId,
          activity: [
            {
              id: `a_${id}_0`,
              authorLabel: `${authorLabel.toUpperCase()} · NOW`,
              at: now,
              body: "Issue dropped.",
            },
          ],
        },
      ],
    }))
    return id
  },

  dismissAISuggestion: (id) =>
    set((state) => ({
      aiSuggestions: state.aiSuggestions.map((s) =>
        s.id === id ? { ...s, dismissed: true } : s,
      ),
    })),

  promoteAISuggestion: (id, ownerId, authorLabel) => {
    const suggestion = get().aiSuggestions.find((s) => s.id === id)
    if (!suggestion) return ""
    const issueId = get().createIssue({
      title: suggestion.title,
      context: suggestion.context,
      severity: suggestion.severity,
      ownerId,
      authorLabel,
    })
    set((state) => ({
      issues: state.issues.map((i) =>
        i.id === issueId
          ? { ...i, source: "ai", sourceLabel: "AI IMPLEMENTER" }
          : i,
      ),
      aiSuggestions: state.aiSuggestions.map((s) =>
        s.id === id ? { ...s, dismissed: true } : s,
      ),
    }))
    return issueId
  },
}))

export function selectIssuesByQueue(
  issues: Issue[],
  queue: IssueQueue,
): Issue[] {
  if (queue === "this_week") {
    return [...issues]
      .filter((i) => i.pinnedForL10 && i.queue === "open")
      .sort((a, b) => a.rank - b.rank)
  }
  return [...issues]
    .filter((i) => i.queue === queue)
    .sort((a, b) => a.rank - b.rank)
}

export function queueCounts(issues: Issue[]): Record<IssueQueue, number> {
  return {
    open: issues.filter((i) => i.queue === "open").length,
    this_week: issues.filter((i) => i.pinnedForL10 && i.queue === "open")
      .length,
    solved: issues.filter((i) => i.queue === "solved").length,
    tabled: issues.filter((i) => i.queue === "tabled").length,
  }
}
