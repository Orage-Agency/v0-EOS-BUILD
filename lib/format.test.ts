import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { dueLabel, formatDayLabel, isToday } from "./format"

describe("dueLabel", () => {
  beforeEach(() => {
    // Freeze "today" to 2026-05-15 local. dueLabel uses local-midnight math
    // so we set both real Date and timezone-stable input.
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-15T12:00:00"))
  })
  afterEach(() => vi.useRealTimers())

  it("returns NO DUE DATE when due is null/empty", () => {
    expect(dueLabel(null).label).toBe("NO DUE DATE")
    expect(dueLabel(undefined).label).toBe("NO DUE DATE")
    expect(dueLabel("").label).toBe("NO DUE DATE")
  })

  it("returns NO DUE DATE when string is unparseable", () => {
    expect(dueLabel("not-a-date").label).toBe("NO DUE DATE")
  })

  it("returns OVERDUE for past dates", () => {
    expect(dueLabel("2026-05-14").label).toBe("OVERDUE")
    expect(dueLabel("2026-05-14").tone).toBe("overdue")
  })

  it("returns TODAY for today", () => {
    expect(dueLabel("2026-05-15").label).toBe("TODAY")
    expect(dueLabel("2026-05-15").tone).toBe("urgent")
  })

  it("returns TOMORROW for next day", () => {
    expect(dueLabel("2026-05-16").label).toBe("TOMORROW")
  })

  it("returns weekday inside 7-day window", () => {
    // 2026-05-19 = Tuesday
    expect(dueLabel("2026-05-19").label).toMatch(/^TUE MAY 19$/)
  })

  it("returns month-day past 7 days", () => {
    expect(dueLabel("2026-06-30").label).toBe("JUN 30")
  })
})

describe("isToday", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-15T08:00:00"))
  })
  afterEach(() => vi.useRealTimers())

  it("true for today's date string", () => {
    expect(isToday("2026-05-15")).toBe(true)
  })

  it("false for any other date", () => {
    expect(isToday("2026-05-14")).toBe(false)
    expect(isToday("2026-05-16")).toBe(false)
  })
})

describe("formatDayLabel", () => {
  it("emits 'WED · MAY 15' format for a Wednesday in May", () => {
    expect(formatDayLabel(new Date("2026-05-13T12:00:00"))).toBe("WED · MAY 13")
  })
})
