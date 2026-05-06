import { describe, expect, it } from "vitest"
import { GET } from "@/app/api/v1/events/route"
import { ALL_WEBHOOK_EVENTS } from "@/lib/webhooks-types"

describe("/api/v1/events catalog", () => {
  it("lists every declared webhook event plus the synthetic test event", () => {
    const res = GET()
    return res.json().then((body) => {
      const advertised = (body.events as Array<{ event: string }>).map(
        (e) => e.event,
      )
      for (const e of ALL_WEBHOOK_EVENTS) {
        expect(advertised).toContain(e)
      }
      expect(advertised).toContain("webhook.test")
    })
  })

  it("ships every event with a non-empty description", async () => {
    const res = GET()
    const body = (await res.json()) as {
      events: Array<{ event: string; description: string }>
    }
    for (const ev of body.events) {
      expect(ev.description, `${ev.event} missing description`).not.toBe("")
      expect(ev.description, `${ev.event} description left as placeholder`).not.toBe("—")
    }
  })

  it("returns the payload version + envelope + signature contract", async () => {
    const res = GET()
    const body = (await res.json()) as Record<string, unknown>
    expect(body.version).toBeDefined()
    expect(body.envelope).toBeDefined()
    expect((body.signature as { header: string }).header).toContain("X-Orage-Signature")
  })

  it("ships cache headers so consumers can poll safely", () => {
    const res = GET()
    expect(res.headers.get("Cache-Control")).toContain("max-age=3600")
  })
})
