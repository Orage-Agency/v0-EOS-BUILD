import { describe, expect, it } from "vitest"
import { GET } from "@/app/api/v1/openapi/route"

/**
 * Sanity-test the OpenAPI 3.1 spec — verifies it's valid JSON, hits the
 * top-level fields a consumer (Postman, OpenAI Plugin store, n8n) needs,
 * and that every advertised resource is present in components.schemas.
 *
 * NOT a deep schema validator — that would pull in @apidevtools/swagger-parser
 * for one test. The intent here is a drift gate: if a contributor breaks
 * the spec shape, this test fails before review.
 */

const REQ = new Request("https://example.com/api/v1/openapi", { method: "GET" })

describe("OpenAPI 3.1 spec", () => {
  it("returns valid JSON with the right top-level fields", async () => {
    const res = GET(REQ)
    const body = (await res.json()) as Record<string, unknown>

    expect(body.openapi).toBe("3.1.0")
    expect(body.info).toBeDefined()
    expect((body.info as Record<string, unknown>).title).toBe("Orage Core API")
    expect(body.servers).toBeInstanceOf(Array)
    expect(body.paths).toBeDefined()
    expect(body.components).toBeDefined()
  })

  it("declares every resource path with full CRUD verbs", async () => {
    const res = GET(REQ)
    const body = (await res.json()) as { paths: Record<string, Record<string, unknown>> }
    const paths = body.paths
    for (const r of ["tasks", "rocks", "issues", "notes"]) {
      expect(paths[`/${r}`], `missing list path /${r}`).toBeDefined()
      expect(paths[`/${r}`].get, `missing GET /${r}`).toBeDefined()
      expect(paths[`/${r}`].post, `missing POST /${r}`).toBeDefined()
      expect(paths[`/${r}/{id}`], `missing single path /${r}/:id`).toBeDefined()
      expect(paths[`/${r}/{id}`].get).toBeDefined()
      expect(paths[`/${r}/{id}`].patch).toBeDefined()
      expect(paths[`/${r}/{id}`].delete).toBeDefined()
    }
  })

  it("documents the security scheme and rate-limit response", async () => {
    const res = GET(REQ)
    const body = (await res.json()) as {
      components: {
        securitySchemes: Record<string, { type: string }>
        responses: Record<string, unknown>
      }
    }
    expect(body.components.securitySchemes.bearerAuth.type).toBe("http")
    expect(body.components.responses.RateLimited).toBeDefined()
    expect(body.components.responses.IdempotencyConflict).toBeDefined()
  })

  it("exposes a schema for every resource (and Create/Patch variants)", async () => {
    const res = GET(REQ)
    const body = (await res.json()) as {
      components: { schemas: Record<string, unknown> }
    }
    const s = body.components.schemas
    for (const r of ["Tasks", "Rocks", "Issues", "Notes"]) {
      expect(s[r], `missing schema ${r}`).toBeDefined()
      expect(s[`${r}Create`], `missing schema ${r}Create`).toBeDefined()
      expect(s[`${r}Patch`], `missing schema ${r}Patch`).toBeDefined()
    }
  })

  it("ships cache headers (so external integrators can poll safely)", async () => {
    const res = GET(REQ)
    expect(res.headers.get("Cache-Control")).toContain("max-age=3600")
  })
})
