import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock sonner before importing the module under test so toast.error is a spy.
const toastError = vi.fn()
vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
  },
}))

import { reconcile } from "./store-helpers"

beforeEach(() => {
  toastError.mockReset()
})

describe("reconcile()", () => {
  it("does NOT roll back on a successful response", async () => {
    const rollback = vi.fn()
    reconcile(Promise.resolve({ ok: true }), rollback, "Should not see this")
    // Wait a microtask for the .then chain.
    await Promise.resolve()
    await Promise.resolve()
    expect(rollback).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
  })

  it("rolls back when the action returns ok:false", async () => {
    const rollback = vi.fn()
    reconcile(
      Promise.resolve({ ok: false, error: "permission denied" }),
      rollback,
      "Couldn't save",
    )
    await Promise.resolve()
    await Promise.resolve()
    expect(rollback).toHaveBeenCalledOnce()
    expect(toastError).toHaveBeenCalledOnce()
    expect(toastError.mock.calls[0][0]).toContain("Couldn't save")
    expect(toastError.mock.calls[0][0]).toContain("permission denied")
  })

  it("rolls back when ok:false and no error string supplied", async () => {
    const rollback = vi.fn()
    reconcile(Promise.resolve({ ok: false }), rollback, "Saving")
    await Promise.resolve()
    await Promise.resolve()
    expect(rollback).toHaveBeenCalledOnce()
    expect(toastError.mock.calls[0][0]).toContain("save failed")
  })

  it("rolls back when the promise rejects", async () => {
    const rollback = vi.fn()
    reconcile(
      Promise.reject(new Error("network down")),
      rollback,
      "Couldn't update",
    )
    // Two microtasks: one for the .then path being skipped, one for .catch.
    await Promise.resolve()
    await Promise.resolve()
    expect(rollback).toHaveBeenCalledOnce()
    expect(toastError).toHaveBeenCalledOnce()
    expect(toastError.mock.calls[0][0]).toContain("Couldn't update")
    expect(toastError.mock.calls[0][0]).toContain("network down")
  })

  it("falls back to a generic message for non-Error rejections", async () => {
    const rollback = vi.fn()
    reconcile(Promise.reject("plain string"), rollback, "Saving")
    await Promise.resolve()
    await Promise.resolve()
    expect(rollback).toHaveBeenCalledOnce()
    expect(toastError.mock.calls[0][0]).toContain("network error")
  })
})
