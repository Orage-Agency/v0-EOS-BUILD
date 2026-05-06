/**
 * OpenAPI 3.1 spec for the Orage Core public REST API.
 *
 * Hand-written rather than generated because the route handlers are thin
 * wrappers around `lib/api-resource.ts` — there's no Zod schema to drive
 * a generator from. Drift-test below exists in the unit tests: the
 * resource configs in tasks/rocks/issues/notes routes are asserted to
 * match the columns documented here.
 *
 * Served from /api/v1/openapi so external integrators (n8n, Zapier,
 * Postman, OpenAI plugins) can fetch the spec without authentication.
 */
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-static"
export const revalidate = 3600

const RESOURCE_SHARED_PROPS = {
  id: { type: "string", format: "uuid" },
  created_at: { type: "string", format: "date-time" },
  updated_at: { type: "string", format: "date-time" },
}

function listEndpoint(name: string) {
  return {
    get: {
      summary: `List ${name}`,
      tags: [name],
      parameters: [
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", minimum: 1, maximum: 200, default: 50 },
        },
        {
          name: "offset",
          in: "query",
          schema: { type: "integer", minimum: 0, default: 0 },
        },
      ],
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: { $ref: `#/components/schemas/${capitalize(name)}` },
                  },
                  pagination: {
                    type: "object",
                    properties: {
                      limit: { type: "integer" },
                      offset: { type: "integer" },
                      total: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "429": { $ref: "#/components/responses/RateLimited" },
      },
    },
    post: {
      summary: `Create ${singular(name)}`,
      tags: [name],
      parameters: [{ $ref: "#/components/parameters/IdempotencyKey" }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: `#/components/schemas/${capitalize(name)}Create` },
          },
        },
      },
      responses: {
        "201": {
          description: "Created",
          content: {
            "application/json": {
              schema: { $ref: `#/components/schemas/${capitalize(name)}` },
            },
          },
        },
        "400": { $ref: "#/components/responses/BadRequest" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "422": { $ref: "#/components/responses/IdempotencyConflict" },
        "429": { $ref: "#/components/responses/RateLimited" },
      },
    },
  }
}

function singleEndpoint(name: string) {
  return {
    parameters: [
      {
        name: "id",
        in: "path",
        required: true,
        schema: { type: "string", format: "uuid" },
      },
    ],
    get: {
      summary: `Get ${singular(name)}`,
      tags: [name],
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: { $ref: `#/components/schemas/${capitalize(name)}` },
            },
          },
        },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
    patch: {
      summary: `Update ${singular(name)}`,
      tags: [name],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: `#/components/schemas/${capitalize(name)}Patch` },
          },
        },
      },
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: { $ref: `#/components/schemas/${capitalize(name)}` },
            },
          },
        },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
    delete: {
      summary: `Soft-delete ${singular(name)}`,
      tags: [name],
      responses: {
        "204": { description: "Deleted" },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  }
}

function singular(s: string): string {
  return s.endsWith("s") ? s.slice(0, -1) : s
}
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function GET(req: Request) {
  const url = new URL(req.url)
  const baseUrl = `${url.protocol}//${url.host}/api/v1`

  const spec = {
    openapi: "3.1.0",
    info: {
      title: "Orage Core API",
      version: "1.0",
      description:
        "Public REST API for Orage Core workspaces. Tasks, rocks, issues, notes — read-and-write with bearer-token auth, Idempotency-Key support, and outbound webhooks for change events.",
      contact: { email: "george@orage.agency" },
    },
    servers: [{ url: baseUrl }],
    tags: [
      { name: "tasks", description: "Discrete to-dos with optional due date and owner" },
      { name: "rocks", description: "90-day quarterly priorities" },
      { name: "issues", description: "Items in the IDS list (Identify, Discuss, Solve)" },
      { name: "notes", description: "Free-form notes and meeting captures" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "oc_<prefix>_<secret>",
          description:
            "Per-workspace API key. Create one at /{workspace}/settings/integrations.",
        },
      },
      parameters: {
        IdempotencyKey: {
          name: "Idempotency-Key",
          in: "header",
          required: false,
          schema: { type: "string", maxLength: 255 },
          description:
            "Stripe-style idempotency. Same key + same body = replay; same key + different body = 422. Cached for 24 hours.",
        },
      },
      responses: {
        Unauthorized: {
          description: "Missing or invalid API key.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        BadRequest: {
          description: "Validation error.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        NotFound: {
          description: "Resource not found in this workspace.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        IdempotencyConflict: {
          description:
            "Idempotency-Key was reused with a different request body.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        RateLimited: {
          description: "Per-key rate limit exceeded (60/min, 1000/hr).",
          headers: {
            "Retry-After": { schema: { type: "integer" } },
            "X-RateLimit-Remaining-Minute": { schema: { type: "integer" } },
            "X-RateLimit-Remaining-Hour": { schema: { type: "integer" } },
          },
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
            hint: { type: "string" },
          },
          required: ["error"],
        },
        Tasks: {
          type: "object",
          properties: {
            ...RESOURCE_SHARED_PROPS,
            title: { type: "string" },
            description: { type: ["string", "null"] },
            status: { type: "string", enum: ["open", "in_progress", "done", "cancelled"] },
            priority: { type: "string", enum: ["high", "med", "low"] },
            due_date: { type: ["string", "null"], format: "date" },
            owner_id: { type: ["string", "null"], format: "uuid" },
            parent_rock_id: { type: ["string", "null"], format: "uuid" },
            client_workspace_id: { type: ["string", "null"], format: "uuid" },
            completed_at: { type: ["string", "null"], format: "date-time" },
          },
        },
        TasksCreate: {
          type: "object",
          required: ["title"],
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            status: { type: "string", enum: ["open", "in_progress", "done", "cancelled"] },
            priority: { type: "string", enum: ["high", "med", "low"] },
            due_date: { type: "string", format: "date" },
            owner_id: { type: "string", format: "uuid" },
            parent_rock_id: { type: "string", format: "uuid" },
          },
        },
        TasksPatch: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            status: { type: "string", enum: ["open", "in_progress", "done", "cancelled"] },
            priority: { type: "string", enum: ["high", "med", "low"] },
            due_date: { type: "string", format: "date" },
            owner_id: { type: "string", format: "uuid" },
            parent_rock_id: { type: "string", format: "uuid" },
          },
        },
        Rocks: {
          type: "object",
          properties: {
            ...RESOURCE_SHARED_PROPS,
            title: { type: "string" },
            outcome: { type: ["string", "null"] },
            status: {
              type: "string",
              enum: ["on_track", "in_progress", "at_risk", "off_track", "done"],
            },
            progress: { type: "integer", minimum: 0, maximum: 100 },
            owner_id: { type: ["string", "null"], format: "uuid" },
            start_date: { type: ["string", "null"], format: "date" },
            due_date: { type: ["string", "null"], format: "date" },
            tag: { type: ["string", "null"] },
          },
        },
        RocksCreate: {
          type: "object",
          required: ["title"],
          properties: {
            title: { type: "string" },
            outcome: { type: "string" },
            owner_id: { type: "string", format: "uuid" },
            start_date: { type: "string", format: "date" },
            due_date: { type: "string", format: "date" },
            tag: { type: "string" },
          },
        },
        RocksPatch: {
          type: "object",
          properties: {
            title: { type: "string" },
            outcome: { type: "string" },
            status: {
              type: "string",
              enum: ["on_track", "in_progress", "at_risk", "off_track", "done"],
            },
            progress: { type: "integer", minimum: 0, maximum: 100 },
            owner_id: { type: "string", format: "uuid" },
            start_date: { type: "string", format: "date" },
            due_date: { type: "string", format: "date" },
            tag: { type: "string" },
          },
        },
        Issues: {
          type: "object",
          properties: {
            ...RESOURCE_SHARED_PROPS,
            title: { type: "string" },
            description: { type: ["string", "null"] },
            status: { type: "string", enum: ["open", "discussing", "solved", "dropped"] },
            stage: { type: "string" },
            owner_id: { type: ["string", "null"], format: "uuid" },
            pinned_for_l10: { type: "boolean" },
          },
        },
        IssuesCreate: {
          type: "object",
          required: ["title"],
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            owner_id: { type: "string", format: "uuid" },
            pinned_for_l10: { type: "boolean" },
          },
        },
        IssuesPatch: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            status: { type: "string", enum: ["open", "discussing", "solved", "dropped"] },
            stage: { type: "string" },
            owner_id: { type: "string", format: "uuid" },
            pinned_for_l10: { type: "boolean" },
          },
        },
        Notes: {
          type: "object",
          properties: {
            ...RESOURCE_SHARED_PROPS,
            title: { type: "string" },
            content: { type: "string" },
            parent_type: { type: ["string", "null"] },
            parent_id: { type: ["string", "null"], format: "uuid" },
          },
        },
        NotesCreate: {
          type: "object",
          required: ["title"],
          properties: {
            title: { type: "string" },
            content: { type: "string" },
            parent_type: { type: "string" },
            parent_id: { type: "string", format: "uuid" },
          },
        },
        NotesPatch: {
          type: "object",
          properties: {
            title: { type: "string" },
            content: { type: "string" },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      "/tasks": listEndpoint("tasks"),
      "/tasks/{id}": singleEndpoint("tasks"),
      "/rocks": listEndpoint("rocks"),
      "/rocks/{id}": singleEndpoint("rocks"),
      "/issues": listEndpoint("issues"),
      "/issues/{id}": singleEndpoint("issues"),
      "/notes": listEndpoint("notes"),
      "/notes/{id}": singleEndpoint("notes"),
    },
  }

  return NextResponse.json(spec, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  })
}
