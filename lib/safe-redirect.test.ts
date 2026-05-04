import { describe, it, expect } from "vitest"
import { safeRedirectPath } from "./safe-redirect"

describe("safeRedirectPath", () => {
  it("returns '/' for missing or empty input", () => {
    expect(safeRedirectPath(null)).toBe("/")
    expect(safeRedirectPath(undefined)).toBe("/")
    expect(safeRedirectPath("")).toBe("/")
  })

  it("allows clean same-origin paths", () => {
    expect(safeRedirectPath("/")).toBe("/")
    expect(safeRedirectPath("/dashboard")).toBe("/dashboard")
    expect(safeRedirectPath("/orage/rocks?filter=open")).toBe(
      "/orage/rocks?filter=open",
    )
    expect(safeRedirectPath("/inbox#item-1")).toBe("/inbox#item-1")
  })

  it("rejects absolute URLs", () => {
    expect(safeRedirectPath("https://evil.com")).toBe("/")
    expect(safeRedirectPath("http://evil.com/path")).toBe("/")
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/")
  })

  it("rejects protocol-relative redirects", () => {
    expect(safeRedirectPath("//evil.com")).toBe("/")
    expect(safeRedirectPath("//evil.com/path")).toBe("/")
  })

  it("rejects backslash-escape tricks browsers normalize", () => {
    expect(safeRedirectPath("/\\evil.com")).toBe("/")
    expect(safeRedirectPath("/path\\..\\..\\evil")).toBe("/")
  })

  it("rejects userinfo-split attacks", () => {
    expect(safeRedirectPath("/@evil.com")).toBe("/")
    expect(safeRedirectPath("/path?next=@evil.com")).toBe("/")
  })

  it("rejects whitespace-bypass attacks", () => {
    expect(safeRedirectPath("/ /evil.com")).toBe("/")
    expect(safeRedirectPath("/\tpath")).toBe("/")
    expect(safeRedirectPath("/\npath")).toBe("/")
  })

  it("rejects paths that don't start with /", () => {
    expect(safeRedirectPath("dashboard")).toBe("/")
    expect(safeRedirectPath("javascript:foo")).toBe("/")
  })
})
