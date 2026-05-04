import { describe, it, expect } from "vitest"
import { summarizeToolOutput } from "./summarize-tool-output"

describe("summarizeToolOutput", () => {
  it("handles nullish output", () => {
    expect(summarizeToolOutput(null)).toBe("")
    expect(summarizeToolOutput(undefined)).toBe("")
  })

  it("returns scalar values verbatim, capped at 120 chars", () => {
    expect(summarizeToolOutput("hello")).toBe("hello")
    expect(summarizeToolOutput(42)).toBe("42")
    const long = "x".repeat(200)
    expect(summarizeToolOutput(long).length).toBe(120)
  })

  it("surfaces errors with an 'error:' prefix", () => {
    expect(summarizeToolOutput({ error: "boom" })).toBe("error: boom")
  })

  it("recognizes write-confirmation flags", () => {
    expect(summarizeToolOutput({ created: true })).toBe("✓ created")
    expect(summarizeToolOutput({ updated: true })).toBe("✓ updated")
    expect(summarizeToolOutput({ deleted: true })).toBe("✓ deleted")
  })

  it("counts known list shapes", () => {
    expect(summarizeToolOutput({ rocks: [1, 2, 3] })).toBe("3 rocks")
    expect(summarizeToolOutput({ tasks: [] })).toBe("0 tasks")
    expect(summarizeToolOutput({ issues: [{ id: "a" }] })).toBe("1 issues")
    expect(summarizeToolOutput({ people: ["a", "b"] })).toBe("2 people")
  })

  it("prefers the first list field when multiple are present", () => {
    // Iteration order is fixed inside the helper — `rocks` wins over `tasks`.
    expect(summarizeToolOutput({ rocks: [1], tasks: [1, 2] })).toBe("1 rocks")
  })

  it("returns empty for unknown shapes", () => {
    expect(summarizeToolOutput({ note: "no recognizable shape" })).toBe("")
    expect(summarizeToolOutput({})).toBe("")
  })
})
