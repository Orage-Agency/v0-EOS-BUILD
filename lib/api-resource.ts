import "server-only"
import { supabaseAdmin } from "@/lib/supabase/admin"
import {
  authenticateApiRequest,
  jsonError,
  requiresScope,
  type ApiKeyContext,
} from "@/lib/api-key-auth"
import { enqueueWebhookEvent } from "@/lib/webhooks"
import {
  checkAndRecordApiRequest,
  rateLimitHeaders,
} from "@/lib/api-rate-limit"
import {
  checkIdempotency,
  idempotencyReplayResponse,
} from "@/lib/api-idempotency"

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

  const limit = await checkAndRecordApiRequest(ctx.keyId)
  const rlHeaders = rateLimitHeaders(limit)
  if (!limit.ok) {
    return jsonErrorWithHeaders(429, limit.message, undefined, {
      ...rlHeaders,
      "Retry-After": String(limit.retryAfterSec),
    })
  }

  if (req.method === "GET") {
    if (!requiresScope(ctx, "read"))
      return jsonErrorWithHeaders(403, "Key missing 'read' scope", undefined, rlHeaders)
    return withHeaders(await listResource(req, ctx, cfg), rlHeaders)
  }
  if (req.method === "POST") {
    if (!requiresScope(ctx, "write"))
      return jsonErrorWithHeaders(403, "Key missing 'write' scope", undefined, rlHeaders)
    return withHeaders(await createResource(req, ctx, cfg), rlHeaders)
  }
  return jsonErrorWithHeaders(405, "Method not allowed", undefined, rlHeaders)
}

export async function handleSingleResource(
  req: Request,
  id: string,
  cfg: ResourceConfig,
): Promise<Response> {
  const ctx = await authenticateApiRequest(req)
  if (!ctx) return jsonError(401, "Invalid or missing API key")

  const limit = await checkAndRecordApiRequest(ctx.keyId)
  const rlHeaders = rateLimitHeaders(limit)
  if (!limit.ok) {
    return jsonErrorWithHeaders(429, limit.message, undefined, {
      ...rlHeaders,
      "Retry-After": String(limit.retryAfterSec),
    })
  }

  if (req.method === "GET") {
    if (!requiresScope(ctx, "read"))
      return jsonErrorWithHeaders(403, "Key missing 'read' scope", undefined, rlHeaders)
    return withHeaders(await getResource(ctx, id, cfg), rlHeaders)
  }
  if (req.method === "PATCH") {
    if (!requiresScope(ctx, "write"))
      return jsonErrorWithHeaders(403, "Key missing 'write' scope", undefined, rlHeaders)
    return withHeaders(await updateResource(req, ctx, id, cfg), rlHeaders)
  }
  if (req.method === "DELETE") {
    if (!requiresScope(ctx, "write"))
      return jsonErrorWithHeaders(403, "Key missing 'write' scope", undefined, rlHeaders)
    return withHeaders(await deleteResource(ctx, id, cfg), rlHeaders)
  }
  return jsonErrorWithHeaders(405, "Method not allowed", undefined, rlHeaders)
}

// Helpers that re-emit a Response with extra headers — the public REST
// endpoints want both the rate-limit telemetry and the idempotency-replay
// flag to ride alongside the resource payload.
function withHeaders(res: Response, headers: HeadersInit): Response {
  const merged = new Headers(res.headers)
  for (const [k, v] of new Headers(headers)) merged.set(k, v)
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: merged,
  })
}

function jsonErrorWithHeaders(
  status: number,
  message: string,
  hint: string | undefined,
  headers: HeadersInit,
): Response {
  const body = hint ? { error: message, hint } : { error: message }
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...Object.fromEntries(new Headers(headers)) },
  })
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
  // Read the body as text first so the idempotency hash sees the exact
  // bytes the caller sent (JSON.stringify would normalize key order).
  const rawBody = await req.text()
  let body: Record<string, unknown>
  try {
    body = rawBody.length > 0 ? (JSON.parse(rawBody) as Record<string, unknown>) : {}
  } catch {
    return jsonError(400, "Body must be JSON")
  }

  const idem = await checkIdempotency(req, ctx.keyId, rawBody)
  if (idem.kind === "conflict") return jsonError(422, idem.message)
  if (idem.kind === "replay") {
    return idempotencyReplayResponse(idem.status, idem.body)
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
  if (idem.kind === "first-time") {
    void idem.record(201, json)
  }
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
