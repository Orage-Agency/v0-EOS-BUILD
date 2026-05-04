import { handleListOrCreate, type ResourceConfig } from "@/lib/api-resource"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const TASK_CONFIG: ResourceConfig = {
  table: "tasks",
  selectColumns:
    "id, title, description, status, priority, due_date, owner_id, parent_rock_id, client_workspace_id, created_at, updated_at, completed_at",
  writableColumns: [
    "title",
    "description",
    "status",
    "priority",
    "due_date",
    "owner_id",
    "parent_rock_id",
    "client_workspace_id",
  ],
  requiredOnCreate: ["title"],
  createDefaults: () => ({ status: "open", priority: "med" }),
  toJson: (row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    status: row.status,
    priority: row.priority,
    due_date: row.due_date ?? null,
    owner_id: row.owner_id ?? null,
    parent_rock_id: row.parent_rock_id ?? null,
    client_workspace_id: row.client_workspace_id ?? null,
    completed_at: row.completed_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }),
  eventKind: "task",
}

export const GET = (req: Request) => handleListOrCreate(req, TASK_CONFIG)
export const POST = (req: Request) => handleListOrCreate(req, TASK_CONFIG)
