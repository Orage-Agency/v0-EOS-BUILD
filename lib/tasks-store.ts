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
import type { MockTask, TaskPriority, TaskStatus } from "@/lib/mock-data"
import type { RockOption, WorkspaceMember } from "@/lib/tasks-server"
import {
  updateTaskStatus as updateTaskStatusAction,
  updateTaskDueDate as updateTaskDueDateAction,
  updateTaskTitle as updateTaskTitleAction,
  updateTaskDescription as updateTaskDescriptionAction,
  updateTaskPriority as updateTaskPriorityAction,
  updateTaskRock as updateTaskRockAction,
  bulkUpdateTasks as bulkUpdateTasksAction,
  bulkDeleteTasks as bulkDeleteTasksAction,
  deleteTask as deleteTaskAction,
} from "@/app/actions/tasks"

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

  workspaceSlug: string
  setWorkspaceSlug: (slug: string) => void

  rockOptions: RockOption[]
  setRockOptions: (rocks: RockOption[]) => void

  members: WorkspaceMember[]
  setMembers: (members: WorkspaceMember[]) => void

  currentUserId: string | null
  setCurrentUserId: (id: string) => void

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
  updateTitle: (id: string, title: string) => void
  updateDescription: (id: string, description: string) => void
  updatePriority: (id: string, priority: TaskPriority) => void
  updateRock: (id: string, rockId: string | null) => void
  reassign: (id: string, ownerId: string) => void
  reorder: (ids: string[]) => void
  insertTask: (task: MockTask) => void
  bulkUpdate: (ids: string[], patch: Partial<MockTask>) => void
  bulkDelete: (ids: string[]) => void
  deleteOne: (id: string) => void
  archiveOne: (id: string) => void
}

// debounce timers for text fields (module-scoped, mirrors issues store)
let _titleSaveTimer: ReturnType<typeof setTimeout> | null = null
let _descSaveTimer: ReturnType<typeof setTimeout> | null = null

function isDbId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  handoffs: [],

  workspaceSlug: "",
  setWorkspaceSlug: (slug) => set({ workspaceSlug: slug }),

  rockOptions: [],
  setRockOptions: (rockOptions) => set({ rockOptions }),

  members: [],
  setMembers: (members) => set({ members }),

  currentUserId: null,
  setCurrentUserId: (id) => set({ currentUserId: id }),

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

  toggleStatus: (id) => {
    let newStatus: TaskStatus = "open"
    set((state) => {
      const tasks = state.tasks.map((t) => {
        if (t.id !== id) return t
        newStatus = t.status === "done" ? "open" : "done"
        return {
          ...t,
          status: newStatus,
          completed: newStatus === "done" ? new Date().toISOString().slice(0, 10) : undefined,
        }
      })
      return { tasks }
    })
    const { workspaceSlug } = get()
    if (workspaceSlug) {
      updateTaskStatusAction(workspaceSlug, id, newStatus).catch(console.error)
    }
  },
  updateStatus: (id, status) => {
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
    }))
    const { workspaceSlug } = get()
    if (workspaceSlug) {
      updateTaskStatusAction(workspaceSlug, id, status).catch(console.error)
    }
  },
  updateDue: (id, due) => {
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, due } : t)),
    }))
    const { workspaceSlug } = get()
    if (workspaceSlug) {
      updateTaskDueDateAction(workspaceSlug, id, due).catch(console.error)
    }
  },
  updateTitle: (id, title) => {
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, title } : t)),
    }))
    const { workspaceSlug } = get()
    if (!workspaceSlug || !isDbId(id)) return
    if (_titleSaveTimer) clearTimeout(_titleSaveTimer)
    _titleSaveTimer = setTimeout(() => {
      updateTaskTitleAction(workspaceSlug, id, title).catch(console.error)
    }, 800)
  },
  updateDescription: (id, description) => {
    // description is not currently in MockTask shape; we still persist
    set((state) => state)
    const { workspaceSlug } = get()
    if (!workspaceSlug || !isDbId(id)) return
    if (_descSaveTimer) clearTimeout(_descSaveTimer)
    _descSaveTimer = setTimeout(() => {
      updateTaskDescriptionAction(workspaceSlug, id, description).catch(console.error)
    }, 800)
  },
  updatePriority: (id, priority) => {
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, priority } : t)),
    }))
    const { workspaceSlug } = get()
    if (workspaceSlug && isDbId(id)) {
      updateTaskPriorityAction(workspaceSlug, id, priority).catch(console.error)
    }
  },
  updateRock: (id, rockId) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, rockId: rockId ?? undefined } : t,
      ),
    }))
    const { workspaceSlug } = get()
    if (workspaceSlug && isDbId(id)) {
      updateTaskRockAction(workspaceSlug, id, rockId).catch(console.error)
    }
  },
  reassign: (id, ownerId) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, owner: ownerId } : t,
      ),
    })),
  deleteOne: (id) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
      selected: new Set(Array.from(state.selected).filter((s) => s !== id)),
      openTaskId: state.openTaskId === id ? null : state.openTaskId,
    }))
    const { workspaceSlug } = get()
    if (workspaceSlug && isDbId(id)) {
      deleteTaskAction(workspaceSlug, id).catch(console.error)
    }
  },
  archiveOne: (id) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, status: "cancelled" as TaskStatus } : t,
      ),
    }))
    const { workspaceSlug } = get()
    if (workspaceSlug && isDbId(id)) {
      updateTaskStatusAction(workspaceSlug, id, "cancelled" as TaskStatus).catch(console.error)
    }
  },
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
      const exists = state.tasks.some((t) => t.id === task.id)
      return {
        tasks: exists
          ? state.tasks.map((t) => (t.id === task.id ? task : t))
          : [task, ...state.tasks],
      }
    }),
  bulkUpdate: (ids, patch) => {
    set((state) => {
      const idSet = new Set(ids)
      return {
        tasks: state.tasks.map((t) => (idSet.has(t.id) ? { ...t, ...patch } : t)),
      }
    })
    const { workspaceSlug } = get()
    if (workspaceSlug && ids.length > 0) {
      bulkUpdateTasksAction(workspaceSlug, ids, patch).catch(console.error)
    }
  },
  bulkDelete: (ids) => {
    set((state) => {
      const idSet = new Set(ids)
      return {
        tasks: state.tasks.filter((t) => !idSet.has(t.id)),
        selected: new Set(),
      }
    })
    const { workspaceSlug } = get()
    if (workspaceSlug && ids.length > 0) {
      bulkDeleteTasksAction(workspaceSlug, ids).catch(console.error)
    }
  },
}))
