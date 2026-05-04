import { handleSingleResource } from "@/lib/api-resource"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const NOTE_CONFIG = {
  table: "notes" as const,
  selectColumns:
    "id, title, content, parent_type, parent_id, folder, created_at, updated_at",
  writableColumns: ["title", "content", "parent_type", "parent_id", "folder"],
  requiredOnCreate: ["title"],
  createDefaults: () => ({
    content: [{ id: "b1", type: "p", html: "" }],
    parent_type: "personal",
    folder: "personal",
  }),
  toJson: (row: Record<string, unknown>) => ({
    id: row.id,
    title: row.title,
    content: row.content ?? [],
    parent_type: row.parent_type ?? null,
    parent_id: row.parent_id ?? null,
    folder: row.folder ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }),
  eventKind: "note" as const,
}

async function handle(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  return handleSingleResource(req, id, NOTE_CONFIG)
}

export const GET = handle
export const PATCH = handle
export const DELETE = handle
