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
import { toast } from "sonner"
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

// Server actions return { ok: true, ... } | { ok: false, error: string } —
// they don't throw. The previous .catch(console.error) pattern silently
// swallowed `ok: false`, so optimistic updates stuck on screen even when
// the DB write failed. This wrapper checks the response and runs the
// caller-supplied rollback so the UI matches reality.
function reconcile<T extends { ok: boolean; error?: string } | void>(
  promise: Promise<T>,
  rollback: () => void,
  label: string,
) {
  promise
    .then((res) => {
      if (res && res.ok === false) {
        rollback()
        toast.error(`${label}: ${res.error ?? "save failed"}`)
      }
    })
    .catch((err) => {
      rollback()
      toast.error(`${label}: ${err instanceof Error ? err.message : "network error"}`)
    })
}

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
    const prev = get().tasks.find((t) => t.id === id)
    if (!prev) return
    const newStatus: TaskStatus = prev.status === "done" ? "open" : "done"
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              status: newStatus,
              completed:
                newStatus === "done" ? new Date().toISOString().slice(0, 10) : undefined,
            }
          : t,
      ),
    }))
    const { workspaceSlug } = get()
    if (workspaceSlug) {
      reconcile(
        updateTaskStatusAction(workspaceSlug, id, newStatus),
        () =>
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? prev : t)),
          })),
        "Couldn't update status",
      )
    }
  },
  updateStatus: (id, status) => {
    const prev = get().tasks.find((t) => t.id === id)
    if (!prev) return
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
    }))
    const { workspaceSlug } = get()
    if (workspaceSlug) {
      reconcile(
        updateTaskStatusAction(workspaceSlug, id, status),
        () =>
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? prev : t)),
          })),
        "Couldn't update status",
      )
    }
  },
  updateDue: (id, due) => {
    const prev = get().tasks.find((t) => t.id === id)
    if (!prev) return
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, due } : t)),
    }))
    const { workspaceSlug } = get()
    if (workspaceSlug) {
      reconcile(
        updateTaskDueDateAction(workspaceSlug, id, due),
        () =>
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? prev : t)),
          })),
        "Couldn't update due date",
      )
    }
  },
  updateTitle: (id, title) => {
    const prev = get().tasks.find((t) => t.id === id)
    if (!prev) return
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, title } : t)),
    }))
    const { workspaceSlug } = get()
    if (!workspaceSlug || !isDbId(id)) return
    if (_titleSaveTimer) clearTimeout(_titleSaveTimer)
    _titleSaveTimer = setTimeout(() => {
      reconcile(
        updateTaskTitleAction(workspaceSlug, id, title),
        () =>
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? prev : t)),
          })),
        "Couldn't save title",
      )
    }, 800)
  },
  updateDescription: (id, description) => {
    const prev = get().tasks.find((t) => t.id === id)
    if (!prev) return
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, description } : t)),
    }))
    const { workspaceSlug } = get()
    if (!workspaceSlug || !isDbId(id)) return
    if (_descSaveTimer) clearTimeout(_descSaveTimer)
    _descSaveTimer = setTimeout(() => {
      reconcile(
        updateTaskDescriptionAction(workspaceSlug, id, description),
        () =>
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? prev : t)),
          })),
        "Couldn't save description",
      )
    }, 800)
  },
  updatePriority: (id, priority) => {
    const prev = get().tasks.find((t) => t.id === id)
    if (!prev) return
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, priority } : t)),
    }))
    const { workspaceSlug } = get()
    if (workspaceSlug && isDbId(id)) {
      reconcile(
        updateTaskPriorityAction(workspaceSlug, id, priority),
        () =>
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? prev : t)),
          })),
        "Couldn't update priority",
      )
    }
  },
  updateRock: (id, rockId) => {
    const prev = get().tasks.find((t) => t.id === id)
    if (!prev) return
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, rockId: rockId ?? undefined } : t,
      ),
    }))
    const { workspaceSlug } = get()
    if (workspaceSlug && isDbId(id)) {
      reconcile(
        updateTaskRockAction(workspaceSlug, id, rockId),
        () =>
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? prev : t)),
          })),
        "Couldn't link rock",
      )
    }
  },
  reassign: (id, ownerId) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, owner: ownerId } : t,
      ),
    })),
  deleteOne: (id) => {
    const prev = get().tasks.find((t) => t.id === id)
    if (!prev) return
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
      selected: new Set(Array.from(state.selected).filter((s) => s !== id)),
      openTaskId: state.openTaskId === id ? null : state.openTaskId,
    }))
    const { workspaceSlug } = get()
    if (workspaceSlug && isDbId(id)) {
      reconcile(
        deleteTaskAction(workspaceSlug, id),
        () => set((state) => ({ tasks: [prev, ...state.tasks] })),
        "Couldn't delete task",
      )
    }
  },
  archiveOne: (id) => {
    const prev = get().tasks.find((t) => t.id === id)
    if (!prev) return
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, status: "cancelled" as TaskStatus } : t,
      ),
    }))
    const { workspaceSlug } = get()
    if (workspaceSlug && isDbId(id)) {
      reconcile(
        updateTaskStatusAction(workspaceSlug, id, "cancelled" as TaskStatus),
        () =>
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? prev : t)),
          })),
        "Couldn't archive task",
      )
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
