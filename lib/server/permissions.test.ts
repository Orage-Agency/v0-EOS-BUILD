import { describe, expect, it } from "vitest"
import {
  PermissionError,
  hasServerPermission,
  requirePermission,
  type Action,
} from "./permissions"
import type { AuthUser } from "@/lib/auth"

function user(overrides: Partial<AuthUser>): AuthUser {
  return {
    id: "u_test",
    email: "test@example.com",
    fullName: "Test User",
    avatarUrl: null,
    timezone: "UTC",
    isMaster: false,
    onboardingCompleted: true,
    workspaceId: "w_test",
    workspaceSlug: "test",
    workspaceName: "Test",
    role: "member",
    ...overrides,
  } as AuthUser
}

describe("hasServerPermission", () => {
  it("allows master user every action", () => {
    const me = user({ isMaster: true, role: "viewer" })
    const all: Action[] = [
      "rocks:write", "rocks:delete", "tasks:delete", "vto:write", "tenants:admin",
    ]
    for (const a of all) expect(hasServerPermission(me, a)).toBe(true)
  })

  it("treats new-schema 'owner' as founder for permissions", () => {
    const me = user({ role: "owner" })
    expect(hasServerPermission(me, "vto:write")).toBe(true)
    expect(hasServerPermission(me, "rocks:delete")).toBe(true)
  })

  it("denies viewer from writing rocks", () => {
    const me = user({ role: "viewer" })
    expect(hasServerPermission(me, "rocks:write")).toBe(false)
  })

  it("lets members write tasks but not delete them", () => {
    const me = user({ role: "member" })
    expect(hasServerPermission(me, "tasks:write")).toBe(true)
    expect(hasServerPermission(me, "tasks:delete")).toBe(false)
  })

  it("locks vto:write to founder only", () => {
    expect(hasServerPermission(user({ role: "founder" }), "vto:write")).toBe(true)
    expect(hasServerPermission(user({ role: "admin" }), "vto:write")).toBe(false)
    expect(hasServerPermission(user({ role: "leader" }), "vto:write")).toBe(false)
  })
})

describe("requirePermission", () => {
  it("throws PermissionError when denied", () => {
    const me = user({ role: "viewer" })
    expect(() => requirePermission(me, "rocks:write")).toThrowError(PermissionError)
  })

  it("returns nothing on allow", () => {
    const me = user({ role: "founder" })
    expect(requirePermission(me, "rocks:write")).toBeUndefined()
  })
})
