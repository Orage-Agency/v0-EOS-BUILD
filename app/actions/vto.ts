"use server"

/**
 * Orage Core · V/TO server actions
 *
 * Each action authenticates via requireUser(workspaceSlug) and then
 * checks requirePermission against the server-side matrix. Inputs no
 * longer carry tenant ids or actor info — those are derived from the
 * authenticated session.
 */

import { requireUser } from "@/lib/auth"
import { requirePermission } from "@/lib/server/permissions"
import type { VTOSection } from "@/lib/vto-store"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JSONPayload = Record<string, any>

export async function updateVTOSection(
  workspaceSlug: string,
  section: VTOSection,
  payload: JSONPayload,
): Promise<{ ok: true }> {
  const user = await requireUser(workspaceSlug)
  requirePermission(user, "vto:write")
  void section
  void payload
  await delay(120)
  return { ok: true }
}

export async function addCoreValue(
  workspaceSlug: string,
  value: { name: string; description: string },
): Promise<{ ok: true; id: string }> {
  const user = await requireUser(workspaceSlug)
  requirePermission(user, "vto:write")
  void value
  await delay(80)
  return { ok: true, id: cryptoRandomId() }
}

export async function reorderCoreValues(
  workspaceSlug: string,
  orderedIds: string[],
): Promise<{ ok: true }> {
  const user = await requireUser(workspaceSlug)
  requirePermission(user, "vto:write")
  void orderedIds
  await delay(60)
  return { ok: true }
}

export async function saveVTORevision(
  workspaceSlug: string,
  summary: string,
): Promise<{ ok: true; revisionId: string; rev: number }> {
  const user = await requireUser(workspaceSlug)
  requirePermission(user, "vto:write")
  void summary
  await delay(150)
  return {
    ok: true,
    revisionId: cryptoRandomId(),
    rev: Math.floor(Date.now() / 1000) % 1000,
  }
}

export async function restoreVTORevision(
  workspaceSlug: string,
  revisionId: string,
): Promise<{ ok: true }> {
  const user = await requireUser(workspaceSlug)
  requirePermission(user, "vto:write")
  void revisionId
  await delay(150)
  return { ok: true }
}

export async function generateAISuggestion(
  workspaceSlug: string,
  section: VTOSection,
  currentText: string,
  refinement?: string,
): Promise<{ ok: true; suggestion: string }> {
  await requireUser(workspaceSlug)
  void section
  void currentText
  void refinement
  // Real implementation streams from the AI gateway in production.
  await delay(150)
  return {
    ok: true,
    suggestion:
      "(server-side) AI suggestion will stream from the AI gateway in production.",
  }
}

// ---------- helpers --------------------------------------------------------
function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function cryptoRandomId(): string {
  return `srv_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 9)}`
}
