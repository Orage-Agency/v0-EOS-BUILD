"use server"

import { requireUser } from "@/lib/auth"
import { requirePermission } from "@/lib/server/permissions"
import type { GWCAnswer, HirePath } from "@/lib/orgchart-store"

type CreateSeatInput = {
  title: string
  department: string
  parentId: string | null
  roles: string[]
}

export async function createSeat(
  workspaceSlug: string,
  input: CreateSeatInput,
): Promise<{ ok: true; id: string }> {
  const user = await requireUser(workspaceSlug)
  requirePermission(user, "accountability:write")
  void input
  await delay(120)
  return { ok: true, id: serverId("seat") }
}

export async function updateSeatRoles(
  workspaceSlug: string,
  seatId: string,
  roles: string[],
): Promise<{ ok: true }> {
  const user = await requireUser(workspaceSlug)
  requirePermission(user, "accountability:write")
  void seatId
  void roles
  await delay(80)
  return { ok: true }
}

export async function assignPersonToSeat(
  workspaceSlug: string,
  seatId: string,
  userId: string,
): Promise<{ ok: true }> {
  const user = await requireUser(workspaceSlug)
  requirePermission(user, "accountability:write")
  void seatId
  void userId
  await delay(80)
  return { ok: true }
}

export async function vacateSeat(
  workspaceSlug: string,
  seatId: string,
  reason: string,
): Promise<{ ok: true }> {
  const user = await requireUser(workspaceSlug)
  requirePermission(user, "accountability:write")
  void seatId
  void reason
  await delay(80)
  return { ok: true }
}

export async function moveSeatInHierarchy(
  workspaceSlug: string,
  seatId: string,
  newParentId: string | null,
): Promise<{ ok: true }> {
  const user = await requireUser(workspaceSlug)
  requirePermission(user, "accountability:write")
  void seatId
  void newParentId
  await delay(80)
  return { ok: true }
}

export async function recordSeatGWC(
  workspaceSlug: string,
  seatId: string,
  quarter: string,
  g: GWCAnswer,
  w: GWCAnswer,
  c: GWCAnswer,
): Promise<{ ok: true }> {
  const user = await requireUser(workspaceSlug)
  requirePermission(user, "accountability:write")
  void seatId
  void quarter
  void g
  void w
  void c
  await delay(60)
  return { ok: true }
}

export async function deleteSeat(
  workspaceSlug: string,
  seatId: string,
  redistributeRolesTo: string[],
): Promise<{ ok: true }> {
  const user = await requireUser(workspaceSlug)
  requirePermission(user, "accountability:write")
  void seatId
  void redistributeRolesTo
  await delay(120)
  return { ok: true }
}

export async function executeHirePath(
  workspaceSlug: string,
  seatId: string,
  path: HirePath,
): Promise<{ ok: true }> {
  const user = await requireUser(workspaceSlug)
  requirePermission(user, "accountability:write")
  void seatId
  void path
  await delay(80)
  return { ok: true }
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

function serverId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 7)}`
}
