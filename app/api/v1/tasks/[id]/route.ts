import { handleSingleResource } from "@/lib/api-resource"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Re-import the same shape the list route uses. Duplicated locally to
// keep this file standalone for readers; if the shape grows we can
// extract to a shared module.
const TASK_CONFIG = {
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
  toJson: (row: Record<string, unknown>) => ({
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
  eventKind: "task" as const,
} as const

async function handle(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  return handleSingleResource(req, id, TASK_CONFIG)
}

export const GET = handle
export const PATCH = handle
export const DELETE = handle
