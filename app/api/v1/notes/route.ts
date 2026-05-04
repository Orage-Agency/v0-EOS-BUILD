import { handleListOrCreate, type ResourceConfig } from "@/lib/api-resource"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const NOTE_CONFIG: ResourceConfig = {
  table: "notes",
  selectColumns:
    "id, title, content, parent_type, parent_id, folder, created_at, updated_at",
  writableColumns: ["title", "content", "parent_type", "parent_id", "folder"],
  requiredOnCreate: ["title"],
  createDefaults: () => ({
    content: [{ id: "b1", type: "p", html: "" }],
    parent_type: "personal",
    folder: "personal",
  }),
  toJson: (row) => ({
    id: row.id,
    title: row.title,
    content: row.content ?? [],
    parent_type: row.parent_type ?? null,
    parent_id: row.parent_id ?? null,
    folder: row.folder ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }),
  eventKind: "note",
}

export const GET = (req: Request) => handleListOrCreate(req, NOTE_CONFIG)
export const POST = (req: Request) => handleListOrCreate(req, NOTE_CONFIG)
