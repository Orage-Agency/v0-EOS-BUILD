import { handleListOrCreate, type ResourceConfig } from "@/lib/api-resource"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ROCK_CONFIG: ResourceConfig = {
  table: "rocks",
  selectColumns:
    "id, title, description, status, progress, owner_id, due_date, quarter, tag, client_workspace_id, created_at, updated_at, completed_at",
  writableColumns: [
    "title",
    "description",
    "status",
    "progress",
    "owner_id",
    "due_date",
    "quarter",
    "tag",
    "client_workspace_id",
  ],
  requiredOnCreate: ["title", "due_date"],
  createDefaults: () => ({
    status: "in_progress",
    progress: 0,
    quarter: "Q2-2026",
  }),
  toJson: (row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    status: row.status,
    progress: row.progress,
    owner_id: row.owner_id ?? null,
    due_date: row.due_date ?? null,
    quarter: row.quarter ?? null,
    tag: row.tag ?? null,
    client_workspace_id: row.client_workspace_id ?? null,
    completed_at: row.completed_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }),
  eventKind: "rock",
}

export const GET = (req: Request) => handleListOrCreate(req, ROCK_CONFIG)
export const POST = (req: Request) => handleListOrCreate(req, ROCK_CONFIG)
