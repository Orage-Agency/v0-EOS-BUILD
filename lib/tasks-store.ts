"use client"

/**
 * Orage Core · Tasks client store
 *
 * Hydrated on every page load from the Supabase tasks table (via the
 * server component → `setTasks(initial)` effect in TasksShell). Local
 * mutations are optimistic; the server actions in `app/actions/tasks.ts`
 * are the source of truth and `router.refresh()` after each write keeps
 * the store and DB in sync.
 */

import { create } from "zustand"
import type { MockTask, TaskStatus } from "@/lib/mock-data"

export type Handoff = {
  id: string
  taskId: string
  fromUserId: string
  toUserId: string
  context: string
  createdAt: string
}

type View = "list" | "board" | "calendar" | "timeline"

type TasksState = {
  tasks: MockTask[]
  setTasks: (tasks: MockTask[]) => void
  handoffs: Handoff[]

  view: View
  setView: (v: View) => void

  selected: Set<string>
  toggleSelected: (id: string, opts?: { range?: boolean; toggle?: boolean }) => void
  clearSelection: () => void
  selectAll: (ids: string[]) => void
  lastClickedId: string | null

  // detail drawer
  openTaskId: string | null
  openTask: (id: string) => void
  closeTask: () => void

  // new task modal
  newTaskOpen: boolean
  openNewTask: () => void
  closeNewTask: () => void

  // handoff modal
  handoffPending: { taskId: string; fromUserId: string; toUserId: string } | null
  startHandoff: (input: { taskId: string; fromUserId: string; toUserId: string }) => void
  cancelHandoff: () => void
  confirmHandoff: (context: string) => Promise<void>

  // mutations
  toggleStatus: (id: string) => void
  updateStatus: (id: string, status: TaskStatus) => void
  updateDue: (id: string, due: string) => void
  reassign: (id: string, ownerId: string) => void
  reorder: (ids: string[]) => void
  insertTask: (task: MockTask) => void
  bulkUpdate: (ids: string[], patch: Partial<MockTask>) => void
  bulkDelete: (ids: string[]) => void
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  handoffs: [],

  view: "list",
  setView: (view) => set({ view }),

  selected: new Set(),
  lastClickedId: null,
  toggleSelected: (id, opts) => {
    const { selected, lastClickedId, tasks } = get()
    const next = new Set(selected)
    if (opts?.range && lastClickedId) {
      const order = tasks.map((t) => t.id)
      const a = order.indexOf(lastClickedId)
      const b = order.indexOf(id)
      if (a >= 0 && b >= 0) {
        const [start, end] = a < b ? [a, b] : [b, a]
        for (let i = start; i <= end; i++) next.add(order[i])
      }
    } else if (opts?.toggle) {
      if (next.has(id)) next.delete(id)
      else next.add(id)
    } else {
      // single-click: replace selection
      next.clear()
      next.add(id)
    }
    set({ selected: next, lastClickedId: id })
  },
  clearSelection: () => set({ selected: new Set(), lastClickedId: null }),
  selectAll: (ids) => set({ selected: new Set(ids) }),

  openTaskId: null,
  openTask: (id) => set({ openTaskId: id }),
  closeTask: () => set({ openTaskId: null }),

  newTaskOpen: false,
  openNewTask: () => set({ newTaskOpen: true }),
  closeNewTask: () => set({ newTaskOpen: false }),

  handoffPending: null,
  startHandoff: (input) => set({ handoffPending: input }),
  cancelHandoff: () => set({ handoffPending: null }),
  confirmHandoff: async (context) => {
    const pending = get().handoffPending
    if (!pending) return
    if (!context.trim()) {
      throw new Error("Context required")
    }
    set((state) => ({
      handoffs: [
        ...state.handoffs,
        {
          id: crypto.randomUUID(),
          taskId: pending.taskId,
          fromUserId: pending.fromUserId,
          toUserId: pending.toUserId,
          context,
          createdAt: new Date().toISOString(),
        },
      ],
      tasks: state.tasks.map((t) =>
        t.id === pending.taskId ? { ...t, owner: pending.toUserId } : t,
      ),
      handoffPending: null,
    }))
  },

  toggleStatus: (id) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              status: t.status === "done" ? "open" : "done",
              completed:
                t.status === "done"
                  ? undefined
                  : new Date().toISOString().slice(0, 10),
            }
          : t,
      ),
    })),
  updateStatus: (id, status) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
    })),
  updateDue: (id, due) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, due } : t)),
    })),
  reassign: (id, ownerId) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, owner: ownerId } : t,
      ),
    })),
  reorder: (ids) =>
    set((state) => {
      const map = new Map(state.tasks.map((t) => [t.id, t]))
      return {
        tasks: ids
          .map((id) => map.get(id))
          .filter((t): t is MockTask => Boolean(t)),
      }
    }),
  insertTask: (task) =>
    set((state) => {
      // Replace if id already exists (e.g. optimistic upsert), otherwise prepend.
      const exists = state.tasks.some((t) => t.id === task.id)
      return {
        tasks: exists
          ? state.tasks.map((t) => (t.id === task.id ? task : t))
          : [task, ...state.tasks],
      }
    }),
  bulkUpdate: (ids, patch) =>
    set((state) => {
      const idSet = new Set(ids)
      return {
        tasks: state.tasks.map((t) => (idSet.has(t.id) ? { ...t, ...patch } : t)),
      }
    }),
  bulkDelete: (ids) =>
    set((state) => {
      const idSet = new Set(ids)
      return {
        tasks: state.tasks.filter((t) => !idSet.has(t.id)),
        selected: new Set(),
      }
    }),
}))
