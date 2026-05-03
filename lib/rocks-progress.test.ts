import { describe, expect, it } from "vitest"
import { rockProgress, type Milestone } from "./rocks-store"

const ms = (rockId: string, done: boolean): Milestone => ({
  id: `m_${Math.random()}`,
  rockId,
  title: "x",
  due: "",
  done,
})

describe("rockProgress", () => {
  it("returns the fallback when no milestones exist", () => {
    expect(rockProgress("r1", [], 42)).toBe(42)
  })

  it("ignores milestones for other rocks", () => {
    const milestones = [ms("r2", true), ms("r2", true)]
    expect(rockProgress("r1", milestones, 17)).toBe(17)
  })

  it("returns 0% when no milestone is done", () => {
    const milestones = [ms("r1", false), ms("r1", false)]
    expect(rockProgress("r1", milestones, 99)).toBe(0)
  })

  it("returns 100% when every milestone is done", () => {
    const milestones = [ms("r1", true), ms("r1", true)]
    expect(rockProgress("r1", milestones, 0)).toBe(100)
  })

  it("rounds the percentage", () => {
    // 1 of 3 done → 33.33% → rounds to 33
    const milestones = [ms("r1", true), ms("r1", false), ms("r1", false)]
    expect(rockProgress("r1", milestones, 0)).toBe(33)
  })
})
