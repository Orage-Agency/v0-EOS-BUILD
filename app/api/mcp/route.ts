/**
 * MCP server endpoint — Model Context Protocol over HTTP/JSON-RPC 2.0.
 *
 * Spec: https://modelcontextprotocol.io/specification
 *
 * What it exposes:
 *   - tools/list  → all read + write tools the workspace supports
 *   - tools/call  → execute a tool against the workspace's data
 *   - initialize  → handshake (server name, version, capabilities)
 *
 * How clients connect:
 *   POST https://<host>/api/mcp
 *   Authorization: Bearer oc_<prefix>_<secret>     (Orage workspace API key)
 *   Content-Type: application/json
 *
 * The same API keys that gate the REST surface gate this. n8n's "MCP Client"
 * node, Claude Desktop's HTTP MCP config, and any custom client speaking
 * JSON-RPC 2.0 can plug straight in.
 */
import {
  authenticateApiRequest,
  jsonError,
  type ApiKeyContext,
} from "@/lib/api-key-auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { enqueueWebhookEvent } from "@/lib/webhooks"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type JsonRpcRequest = {
  jsonrpc: "2.0"
  id?: number | string | null
  method: string
  params?: Record<string, unknown>
}

type JsonRpcResponse = {
  jsonrpc: "2.0"
  id: number | string | null
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

const SERVER_INFO = {
  name: "orage-core",
  version: "1.0.0",
}

const PROTOCOL_VERSION = "2025-06-18"

// ─────────────────────────────────────── tool registry ──────────────────

type ToolDef = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  handler: (
    ctx: ApiKeyContext,
    args: Record<string, unknown>,
  ) => Promise<unknown>
}

const TOOLS: ToolDef[] = [
  {
    name: "list_tasks",
    description:
      "List tasks in the workspace. Filter by status (open/in_progress/done/cancelled) or owner_id. Returns up to 50 by default.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["open", "in_progress", "done", "cancelled"],
        },
        owner_id: { type: "string" },
        limit: { type: "number", minimum: 1, maximum: 200 },
      },
    },
    handler: async (ctx, args) => {
      const sb = supabaseAdmin()
      let q = sb
        .from("tasks")
        .select(
          "id, title, description, status, priority, due_date, owner_id, parent_rock_id, client_workspace_id, created_at",
        )
        .eq("tenant_id", ctx.workspaceId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(typeof args.limit === "number" ? args.limit : 50)
      if (typeof args.status === "string") q = q.eq("status", args.status)
      if (typeof args.owner_id === "string") q = q.eq("owner_id", args.owner_id)
      const { data, error } = await q
      if (error) throw new Error(error.message)
      return { tasks: data ?? [] }
    },
  },
  {
    name: "create_task",
    description:
      "Create a task. Required: title. Optional: description, priority (high/med/low), due_date (YYYY-MM-DD), owner_id, parent_rock_id, client_workspace_id.",
    inputSchema: {
      type: "object",
      required: ["title"],
      properties: {
        title: { type: "string", minLength: 2 },
        description: { type: "string" },
        priority: { type: "string", enum: ["high", "med", "low"] },
        due_date: { type: "string" },
        owner_id: { type: "string" },
        parent_rock_id: { type: "string" },
        client_workspace_id: { type: "string" },
      },
    },
    handler: async (ctx, args) => {
      const sb = supabaseAdmin()
      const { data, error } = await sb
        .from("tasks")
        .insert({
          tenant_id: ctx.workspaceId,
          title: args.title,
          description: args.description ?? null,
          priority: args.priority ?? "med",
          due_date: args.due_date ?? null,
          owner_id: args.owner_id ?? null,
          parent_rock_id: args.parent_rock_id ?? null,
          client_workspace_id: args.client_workspace_id ?? null,
          status: "open",
        })
        .select(
          "id, title, status, priority, due_date, owner_id, parent_rock_id, client_workspace_id",
        )
        .single()
      if (error) throw new Error(error.message)
      void enqueueWebhookEvent(ctx.workspaceId, "task.created", data ?? {})
      return { task: data }
    },
  },
  {
    name: "update_task",
    description:
      "Update a task by id. Set status, priority, due_date, owner_id, or client_workspace_id.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string" },
        status: {
          type: "string",
          enum: ["open", "in_progress", "done", "cancelled"],
        },
        priority: { type: "string", enum: ["high", "med", "low"] },
        due_date: { type: "string" },
        owner_id: { type: "string" },
        client_workspace_id: { type: "string" },
      },
    },
    handler: async (ctx, args) => {
      const patch: Record<string, unknown> = {}
      for (const k of [
        "status",
        "priority",
        "due_date",
        "owner_id",
        "client_workspace_id",
      ]) {
        if (k in args) patch[k] = args[k]
      }
      if (args.status === "done") patch.completed_at = new Date().toISOString()
      const sb = supabaseAdmin()
      const { data, error } = await sb
        .from("tasks")
        .update(patch)
        .eq("id", args.id)
        .eq("tenant_id", ctx.workspaceId)
        .is("deleted_at", null)
        .select(
          "id, title, status, priority, due_date, owner_id, parent_rock_id",
        )
        .single()
      if (error) throw new Error(error.message)
      void enqueueWebhookEvent(ctx.workspaceId, "task.updated", data ?? {})
      return { task: data }
    },
  },
  {
    name: "list_rocks",
    description:
      "List quarterly rocks. Filter by status (on_track/at_risk/off_track/in_progress/done) or owner_id.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string" },
        owner_id: { type: "string" },
      },
    },
    handler: async (ctx, args) => {
      const sb = supabaseAdmin()
      let q = sb
        .from("rocks")
        .select(
          "id, title, status, progress, owner_id, due_date, quarter, tag, client_workspace_id",
        )
        .eq("tenant_id", ctx.workspaceId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
      if (typeof args.status === "string") q = q.eq("status", args.status)
      if (typeof args.owner_id === "string") q = q.eq("owner_id", args.owner_id)
      const { data, error } = await q
      if (error) throw new Error(error.message)
      return { rocks: data ?? [] }
    },
  },
  {
    name: "create_rock",
    description: "Create a quarterly rock. Required: title, due_date.",
    inputSchema: {
      type: "object",
      required: ["title", "due_date"],
      properties: {
        title: { type: "string", minLength: 2 },
        description: { type: "string" },
        owner_id: { type: "string" },
        due_date: { type: "string" },
        quarter: { type: "string" },
        tag: { type: "string" },
        client_workspace_id: { type: "string" },
      },
    },
    handler: async (ctx, args) => {
      const sb = supabaseAdmin()
      const { data, error } = await sb
        .from("rocks")
        .insert({
          tenant_id: ctx.workspaceId,
          title: args.title,
          description: args.description ?? null,
          owner_id: args.owner_id ?? null,
          due_date: args.due_date,
          quarter: args.quarter ?? "Q2-2026",
          tag: args.tag ?? null,
          client_workspace_id: args.client_workspace_id ?? null,
          status: "in_progress",
          progress: 0,
        })
        .select("id, title, status, progress, owner_id, due_date, quarter, tag")
        .single()
      if (error) throw new Error(error.message)
      void enqueueWebhookEvent(ctx.workspaceId, "rock.created", data ?? {})
      return { rock: data }
    },
  },
  {
    name: "list_issues",
    description: "List IDS issues. Filter by stage (identify/discuss/solve), status (open/solved), or pinned_for_l10.",
    inputSchema: {
      type: "object",
      properties: {
        stage: { type: "string" },
        status: { type: "string" },
        pinned_for_l10: { type: "boolean" },
      },
    },
    handler: async (ctx, args) => {
      const sb = supabaseAdmin()
      let q = sb
        .from("issues")
        .select(
          "id, title, severity, stage, status, owner_id, rank, pinned_for_l10, linked_rock_id",
        )
        .eq("tenant_id", ctx.workspaceId)
        .is("deleted_at", null)
        .order("rank", { ascending: true, nullsFirst: false })
      if (typeof args.stage === "string") q = q.eq("stage", args.stage)
      if (typeof args.status === "string") q = q.eq("status", args.status)
      if (typeof args.pinned_for_l10 === "boolean")
        q = q.eq("pinned_for_l10", args.pinned_for_l10)
      const { data, error } = await q
      if (error) throw new Error(error.message)
      return { issues: data ?? [] }
    },
  },
  {
    name: "create_issue",
    description: "Drop an issue into the IDS queue. Required: title.",
    inputSchema: {
      type: "object",
      required: ["title"],
      properties: {
        title: { type: "string", minLength: 2 },
        description: { type: "string" },
        severity: {
          type: "string",
          enum: ["critical", "high", "normal", "low"],
        },
        owner_id: { type: "string" },
        rank: { type: "number" },
      },
    },
    handler: async (ctx, args) => {
      const sb = supabaseAdmin()
      const { data, error } = await sb
        .from("issues")
        .insert({
          tenant_id: ctx.workspaceId,
          title: args.title,
          description: args.description ?? null,
          severity: args.severity ?? "normal",
          stage: "identify",
          status: "open",
          owner_id: args.owner_id ?? null,
          rank: args.rank ?? null,
        })
        .select("id, title, severity, stage, status, owner_id, rank")
        .single()
      if (error) throw new Error(error.message)
      void enqueueWebhookEvent(ctx.workspaceId, "issue.created", data ?? {})
      return { issue: data }
    },
  },
  {
    name: "list_people",
    description:
      "List active workspace members so you can resolve names to UUIDs before assigning rocks/tasks/issues.",
    inputSchema: { type: "object", properties: {} },
    handler: async (ctx) => {
      const sb = supabaseAdmin()
      const { data: memberships, error: mErr } = await sb
        .from("workspace_memberships")
        .select("user_id, role")
        .eq("workspace_id", ctx.workspaceId)
        .eq("status", "active")
      if (mErr) throw new Error(mErr.message)
      const ids = ((memberships ?? []) as Array<{ user_id: string; role: string }>)
        .map((m) => m.user_id)
      if (ids.length === 0) return { people: [] }
      const { data: profiles } = await sb
        .from("profiles")
        .select("id, email, full_name")
        .in("id", ids)
      const byId = new Map(
        ((profiles ?? []) as Array<{
          id: string
          email: string
          full_name: string | null
        }>).map((p) => [p.id, p]),
      )
      const people = ((memberships ?? []) as Array<{
        user_id: string
        role: string
      }>).flatMap((m) => {
        const p = byId.get(m.user_id)
        if (!p) return []
        return [
          {
            id: p.id,
            name: p.full_name ?? p.email,
            email: p.email,
            role: m.role,
          },
        ]
      })
      return { people }
    },
  },
]

// ─────────────────────────────────────── dispatch ───────────────────────

function rpcResult(
  id: number | string | null | undefined,
  result: unknown,
): JsonRpcResponse {
  return { jsonrpc: "2.0", id: id ?? null, result }
}

function rpcError(
  id: number | string | null | undefined,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcResponse {
  const error: { code: number; message: string; data?: unknown } = {
    code,
    message,
  }
  if (data !== undefined) error.data = data
  return { jsonrpc: "2.0", id: id ?? null, error }
}

async function handleRpc(
  body: JsonRpcRequest,
  ctx: ApiKeyContext,
): Promise<JsonRpcResponse> {
  const { method, params, id } = body
  if (method === "initialize") {
    return rpcResult(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {
        tools: { listChanged: false },
      },
      serverInfo: SERVER_INFO,
    })
  }
  if (method === "ping") {
    return rpcResult(id, {})
  }
  if (method === "tools/list") {
    return rpcResult(id, {
      tools: TOOLS.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    })
  }
  if (method === "tools/call") {
    const name = (params?.name as string) ?? ""
    const args = (params?.arguments as Record<string, unknown>) ?? {}
    const tool = TOOLS.find((t) => t.name === name)
    if (!tool) {
      return rpcError(id, -32601, `Tool not found: ${name}`)
    }
    try {
      const result = await tool.handler(ctx, args)
      // MCP wraps tool results in a content array; we use plain JSON
      // text since clients (n8n MCP node, Claude Desktop) parse it.
      return rpcResult(id, {
        content: [
          { type: "text", text: JSON.stringify(result, null, 2) },
        ],
        isError: false,
      })
    } catch (err) {
      return rpcResult(id, {
        content: [
          {
            type: "text",
            text:
              err instanceof Error ? err.message : "tool execution failed",
          },
        ],
        isError: true,
      })
    }
  }
  return rpcError(id, -32601, `Method not found: ${method}`)
}

export async function POST(req: Request) {
  const ctx = await authenticateApiRequest(req)
  if (!ctx) return jsonError(401, "Invalid or missing API key")

  let body: JsonRpcRequest
  try {
    body = (await req.json()) as JsonRpcRequest
  } catch {
    return jsonError(400, "Body must be JSON-RPC 2.0")
  }
  if (body.jsonrpc !== "2.0" || typeof body.method !== "string") {
    return jsonError(400, "Body must be JSON-RPC 2.0 with a `method` field")
  }
  const response = await handleRpc(body, ctx)
  return Response.json(response)
}

// Some MCP clients probe with HEAD or GET to confirm the endpoint exists.
export async function GET(req: Request) {
  const ctx = await authenticateApiRequest(req)
  if (!ctx) return jsonError(401, "Invalid or missing API key")
  return Response.json({
    server: SERVER_INFO.name,
    version: SERVER_INFO.version,
    transport: "http",
    protocolVersion: PROTOCOL_VERSION,
    workspaceId: ctx.workspaceId,
    tools: TOOLS.length,
  })
}
