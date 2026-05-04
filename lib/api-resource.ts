import "server-only"
import { supabaseAdmin } from "@/lib/supabase/admin"
import {
  authenticateApiRequest,
  jsonError,
  requiresScope,
  type ApiKeyContext,
} from "@/lib/api-key-auth"
import { enqueueWebhookEvent } from "@/lib/webhooks"

/**
 * Shared handler skeleton for the public REST API. Each resource (tasks,
 * rocks, issues, notes) registers its column shape + write validation,
 * and we get GET (list/single) + POST (create) + PATCH (update) + DELETE
 * (soft delete) for free.
 */
export type ResourceConfig = {
  /** DB table name. */
  table: "tasks" | "rocks" | "issues" | "notes"
  /** Columns returned on GET. */
  selectColumns: string
  /** Columns the caller may write on POST/PATCH. */
  writableColumns: readonly string[]
  /** Required columns on POST. */
  requiredOnCreate: readonly string[]
  /** Default values applied on POST when caller didn't supply them. */
  createDefaults: () => Record<string, unknown>
  /** Map a DB row to the public response shape. */
  toJson: (row: Record<string, unknown>) => Record<string, unknown>
  /** Webhook event prefix — e.g. "task" → emits task.created / task.updated / task.deleted */
  eventKind: "task" | "rock" | "issue" | "note"
}

const PAGE_SIZE_DEFAULT = 50
const PAGE_SIZE_MAX = 200

function pickWritable(
  body: Record<string, unknown>,
  allowed: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of allowed) {
    if (k in body) out[k] = body[k]
  }
  return out
}

export async function handleListOrCreate(
  req: Request,
  cfg: ResourceConfig,
): Promise<Response> {
  const ctx = await authenticateApiRequest(req)
  if (!ctx) return jsonError(401, "Invalid or missing API key", "Send `Authorization: Bearer oc_<prefix>_<secret>`.")

  if (req.method === "GET") {
    if (!requiresScope(ctx, "read")) return jsonError(403, "Key missing 'read' scope")
    return listResource(req, ctx, cfg)
  }
  if (req.method === "POST") {
    if (!requiresScope(ctx, "write")) return jsonError(403, "Key missing 'write' scope")
    return createResource(req, ctx, cfg)
  }
  return jsonError(405, "Method not allowed")
}

export async function handleSingleResource(
  req: Request,
  id: string,
  cfg: ResourceConfig,
): Promise<Response> {
  const ctx = await authenticateApiRequest(req)
  if (!ctx) return jsonError(401, "Invalid or missing API key")

  if (req.method === "GET") {
    if (!requiresScope(ctx, "read")) return jsonError(403, "Key missing 'read' scope")
    return getResource(ctx, id, cfg)
  }
  if (req.method === "PATCH") {
    if (!requiresScope(ctx, "write")) return jsonError(403, "Key missing 'write' scope")
    return updateResource(req, ctx, id, cfg)
  }
  if (req.method === "DELETE") {
    if (!requiresScope(ctx, "write")) return jsonError(403, "Key missing 'write' scope")
    return deleteResource(ctx, id, cfg)
  }
  return jsonError(405, "Method not allowed")
}

// ─────────────────────────────────────── list ────────────────────────────

async function listResource(
  req: Request,
  ctx: ApiKeyContext,
  cfg: ResourceConfig,
): Promise<Response> {
  const url = new URL(req.url)
  const limit = Math.min(
    Math.max(1, Number(url.searchParams.get("limit") ?? PAGE_SIZE_DEFAULT)),
    PAGE_SIZE_MAX,
  )
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0))
  const sb = supabaseAdmin()
  const { data, error, count } = await sb
    .from(cfg.table)
    .select(cfg.selectColumns, { count: "exact" })
    .eq("tenant_id", ctx.workspaceId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) return jsonError(500, error.message)
  const items = ((data ?? []) as unknown as Array<Record<string, unknown>>).map(cfg.toJson)
  return Response.json({
    items,
    pagination: {
      limit,
      offset,
      total: count ?? items.length,
    },
  })
}

// ─────────────────────────────────────── get ─────────────────────────────

async function getResource(
  ctx: ApiKeyContext,
  id: string,
  cfg: ResourceConfig,
): Promise<Response> {
  const sb = supabaseAdmin()
  const { data, error } = await sb
    .from(cfg.table)
    .select(cfg.selectColumns)
    .eq("tenant_id", ctx.workspaceId)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle()
  if (error) return jsonError(500, error.message)
  if (!data) return jsonError(404, "Not found")
  return Response.json(cfg.toJson(data as unknown as Record<string, unknown>))
}

// ─────────────────────────────────────── create ──────────────────────────

async function createResource(
  req: Request,
  ctx: ApiKeyContext,
  cfg: ResourceConfig,
): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonError(400, "Body must be JSON")
  }
  for (const k of cfg.requiredOnCreate) {
    if (body[k] == null) return jsonError(400, `Missing required field: ${k}`)
  }
  const insert = {
    ...cfg.createDefaults(),
    ...pickWritable(body, cfg.writableColumns),
    tenant_id: ctx.workspaceId,
  }
  const sb = supabaseAdmin()
  const { data, error } = await sb
    .from(cfg.table)
    .insert(insert)
    .select(cfg.selectColumns)
    .single()
  if (error) return jsonError(500, error.message)
  const json = cfg.toJson(data as unknown as Record<string, unknown>)
  void enqueueWebhookEvent(ctx.workspaceId, `${cfg.eventKind}.created`, json)
  return new Response(JSON.stringify(json), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  })
}

// ─────────────────────────────────────── update ──────────────────────────

async function updateResource(
  req: Request,
  ctx: ApiKeyContext,
  id: string,
  cfg: ResourceConfig,
): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonError(400, "Body must be JSON")
  }
  const patch = pickWritable(body, cfg.writableColumns)
  if (Object.keys(patch).length === 0) {
    return jsonError(400, "No writable fields supplied")
  }
  const sb = supabaseAdmin()
  const { data, error } = await sb
    .from(cfg.table)
    .update(patch)
    .eq("tenant_id", ctx.workspaceId)
    .eq("id", id)
    .is("deleted_at", null)
    .select(cfg.selectColumns)
    .maybeSingle()
  if (error) return jsonError(500, error.message)
  if (!data) return jsonError(404, "Not found")
  const json = cfg.toJson(data as unknown as Record<string, unknown>)
  void enqueueWebhookEvent(ctx.workspaceId, `${cfg.eventKind}.updated`, json)
  return Response.json(json)
}

// ─────────────────────────────────────── delete ──────────────────────────

async function deleteResource(
  ctx: ApiKeyContext,
  id: string,
  cfg: ResourceConfig,
): Promise<Response> {
  const sb = supabaseAdmin()
  const { data, error } = await sb
    .from(cfg.table)
    .update({ deleted_at: new Date().toISOString() })
    .eq("tenant_id", ctx.workspaceId)
    .eq("id", id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle()
  if (error) return jsonError(500, error.message)
  if (!data) return jsonError(404, "Not found")
  void enqueueWebhookEvent(ctx.workspaceId, `${cfg.eventKind}.deleted`, { id })
  return new Response(null, { status: 204 })
}
