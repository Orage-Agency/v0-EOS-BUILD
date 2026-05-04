import { test, expect } from "@playwright/test"

/**
 * End-to-end smoke for the public REST API + MCP server.
 *
 * Skips when ORAGE_API_KEY isn't set so the suite stays runnable in
 * environments that don't have a key provisioned. Locally, mint a key
 * from /{workspace}/settings/integrations and export it as ORAGE_API_KEY.
 */
const API_KEY = process.env.ORAGE_API_KEY
const BASE = process.env.BASE_URL ?? "http://localhost:3000"

test.skip(!API_KEY, "ORAGE_API_KEY not set — skipping public API + MCP suite")

const auth = { Authorization: `Bearer ${API_KEY}` }

test.describe("REST /api/v1/tasks", () => {
  test("GET list returns items + pagination", async ({ request }) => {
    const res = await request.get(`${BASE}/api/v1/tasks?limit=5`, {
      headers: auth,
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.items)).toBe(true)
    expect(body.pagination).toMatchObject({
      limit: 5,
      offset: 0,
    })
  })

  test("POST creates, PATCH updates, DELETE soft-deletes", async ({ request }) => {
    const created = await request.post(`${BASE}/api/v1/tasks`, {
      headers: { ...auth, "Content-Type": "application/json" },
      data: { title: "API e2e: created at " + Date.now() },
    })
    expect(created.status()).toBe(201)
    const task = await created.json()
    expect(task).toMatchObject({ title: expect.stringContaining("API e2e") })
    const id = task.id

    const updated = await request.patch(`${BASE}/api/v1/tasks/${id}`, {
      headers: { ...auth, "Content-Type": "application/json" },
      data: { priority: "high" },
    })
    expect(updated.status()).toBe(200)
    expect((await updated.json()).priority).toBe("high")

    const deleted = await request.delete(`${BASE}/api/v1/tasks/${id}`, {
      headers: auth,
    })
    expect(deleted.status()).toBe(204)

    // GET should now return 404 since deleted_at is set.
    const after = await request.get(`${BASE}/api/v1/tasks/${id}`, {
      headers: auth,
    })
    expect(after.status()).toBe(404)
  })

  test("rejects missing auth with 401", async ({ request }) => {
    const res = await request.get(`${BASE}/api/v1/tasks`)
    expect(res.status()).toBe(401)
  })
})

test.describe("MCP /api/mcp", () => {
  test("initialize returns server info", async ({ request }) => {
    const res = await request.post(`${BASE}/api/mcp`, {
      headers: { ...auth, "Content-Type": "application/json" },
      data: {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {},
      },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.jsonrpc).toBe("2.0")
    expect(body.result.serverInfo.name).toBe("orage-core")
    expect(body.result.capabilities.tools).toBeDefined()
  })

  test("tools/list returns the tool registry", async ({ request }) => {
    const res = await request.post(`${BASE}/api/mcp`, {
      headers: { ...auth, "Content-Type": "application/json" },
      data: { jsonrpc: "2.0", id: 2, method: "tools/list" },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    const names = (body.result.tools as Array<{ name: string }>).map(
      (t) => t.name,
    )
    expect(names).toContain("list_tasks")
    expect(names).toContain("create_task")
    expect(names).toContain("list_rocks")
    expect(names).toContain("list_people")
  })

  test("tools/call list_tasks returns content array", async ({ request }) => {
    const res = await request.post(`${BASE}/api/mcp`, {
      headers: { ...auth, "Content-Type": "application/json" },
      data: {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "list_tasks",
          arguments: { limit: 3 },
        },
      },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.result.isError).toBeFalsy()
    expect(Array.isArray(body.result.content)).toBe(true)
    expect(body.result.content[0].type).toBe("text")
    const parsed = JSON.parse(body.result.content[0].text)
    expect(Array.isArray(parsed.tasks)).toBe(true)
  })

  test("rejects missing auth with 401", async ({ request }) => {
    const res = await request.post(`${BASE}/api/mcp`, {
      headers: { "Content-Type": "application/json" },
      data: { jsonrpc: "2.0", id: 99, method: "initialize" },
    })
    expect(res.status()).toBe(401)
  })

  test("unknown method returns JSON-RPC error", async ({ request }) => {
    const res = await request.post(`${BASE}/api/mcp`, {
      headers: { ...auth, "Content-Type": "application/json" },
      data: { jsonrpc: "2.0", id: 4, method: "totally.fake" },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.error?.code).toBe(-32601)
  })
})
