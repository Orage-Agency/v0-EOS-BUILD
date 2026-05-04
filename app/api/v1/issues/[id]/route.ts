import { handleSingleResource } from "@/lib/api-resource"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ISSUE_CONFIG = {
  table: "issues" as const,
  selectColumns:
    "id, title, description, severity, stage, status, owner_id, rank, pinned_for_l10, linked_rock_id, created_at, updated_at, solved_at",
  writableColumns: [
    "title",
    "description",
    "severity",
    "stage",
    "status",
    "owner_id",
    "rank",
    "pinned_for_l10",
    "linked_rock_id",
  ],
  requiredOnCreate: ["title"],
  createDefaults: () => ({ severity: "normal", stage: "identify", status: "open" }),
  toJson: (row: Record<string, unknown>) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    severity: row.severity,
    stage: row.stage,
    status: row.status,
    owner_id: row.owner_id ?? null,
    rank: row.rank ?? null,
    pinned_for_l10: row.pinned_for_l10 ?? false,
    linked_rock_id: row.linked_rock_id ?? null,
    solved_at: row.solved_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }),
  eventKind: "issue" as const,
}

async function handle(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  return handleSingleResource(req, id, ISSUE_CONFIG)
}

export const GET = handle
export const PATCH = handle
export const DELETE = handle
