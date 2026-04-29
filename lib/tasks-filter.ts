import { UNASSIGNED_OWNER_ID, type MockTask } from "@/lib/mock-data"

export type TaskFilter = "my" | "team" | "assigned" | "created" | "unassigned"

export const TASK_FILTERS: { id: TaskFilter; label: string; description: string }[] = [
  { id: "my", label: "My Tasks", description: "Owned by me" },
  { id: "team", label: "Team Tasks", description: "Owned by anyone" },
  { id: "assigned", label: "Assigned to Me", description: "Owned by me, created by someone else" },
  { id: "created", label: "Created by Me", description: "I created it" },
  { id: "unassigned", label: "Unassigned", description: "No owner" },
]

export function filterTasks(
  tasks: MockTask[],
  filter: TaskFilter,
  meId: string,
): MockTask[] {
  switch (filter) {
    case "my":
      return tasks.filter((t) => t.owner === meId)
    case "team":
      return tasks
    case "assigned":
      return tasks.filter(
        (t) => t.owner === meId && t.createdBy && t.createdBy !== meId,
      )
    case "created":
      return tasks.filter((t) => t.createdBy === meId)
    case "unassigned":
      return tasks.filter((t) => !t.owner || t.owner === UNASSIGNED_OWNER_ID)
  }
}

export function isTaskFilter(value: string | null | undefined): value is TaskFilter {
  return (
    value === "my" ||
    value === "team" ||
    value === "assigned" ||
    value === "created" ||
    value === "unassigned"
  )
}
