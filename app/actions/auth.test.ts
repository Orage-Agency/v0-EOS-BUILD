import { describe, expect, it } from "vitest"
import { slugify, SLUG_RE } from "@/lib/slug"

describe("slugify (workspace name → URL slug)", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(slugify("Acme Co")).toBe("acme-co")
  })

  it("strips special characters", () => {
    expect(slugify("Acme & Sons, Inc.")).toBe("acme-sons-inc")
  })

  it("collapses repeated hyphens and underscores", () => {
    expect(slugify("foo___bar---baz")).toBe("foo-bar-baz")
  })

  it("trims leading and trailing hyphens", () => {
    expect(slugify("  -hello-  ")).toBe("hello")
  })

  it("caps length at 40 characters", () => {
    const long = "a".repeat(60)
    const result = slugify(long)
    expect(result.length).toBeLessThanOrEqual(40)
  })

  it("returns empty string when nothing usable remains", () => {
    expect(slugify("!!!")).toBe("")
    expect(slugify("   ")).toBe("")
  })

  it("preserves digits", () => {
    expect(slugify("Q4 2026 Sprint")).toBe("q4-2026-sprint")
  })

  it("normalizes unicode whitespace too", () => {
    expect(slugify("Foo\tBar\nBaz")).toBe("foo-bar-baz")
  })
})

describe("SLUG_RE — DB-safe slug guard", () => {
  it.each([
    ["acme", true],
    ["acme-co", true],
    ["q4-2026", true],
    ["a", true],
    ["a-b-c-d-e-f-g-h-i-j-k-l-m-n-o-p-q-r-s-t", true],
  ])("accepts valid slug %s", (slug, expected) => {
    expect(SLUG_RE.test(slug)).toBe(expected)
  })

  it.each([
    ["", false],
    ["-acme", false],
    ["acme-", false],
    ["Acme", false],
    ["acme co", false],
    ["acme.co", false],
    ["acme/co", false],
  ])("rejects invalid slug %s", (slug, expected) => {
    expect(SLUG_RE.test(slug)).toBe(expected)
  })
})
