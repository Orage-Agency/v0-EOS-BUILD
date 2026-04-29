"use server"

/**
 * Orage Core · V/TO server actions
 * Persists VTO state to workspaces.vto_data (JSONB).
 */

import { requireUser } from "@/lib/auth"
import { requirePermission } from "@/lib/server/permissions"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { VTOSection } from "@/lib/vto-store"

export async function saveVTOData(
  workspaceSlug: string,
  data: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "vto:write")
    const sb = supabaseAdmin()
    const { error } = await sb
      .from("workspaces")
      .update({ vto_data: data })
      .eq("id", user.workspaceId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function addCoreValue(
  workspaceSlug: string,
  value: { name: string; description: string },
): Promise<{ ok: true; id: string }> {
  await requireUser(workspaceSlug)
  void value
  return { ok: true, id: `cv_${Date.now().toString(36)}` }
}

export async function reorderCoreValues(
  workspaceSlug: string,
  orderedIds: string[],
): Promise<{ ok: true }> {
  await requireUser(workspaceSlug)
  void orderedIds
  return { ok: true }
}

export async function saveVTORevision(
  workspaceSlug: string,
  summary: string,
): Promise<{ ok: true; revisionId: string; rev: number }> {
  const user = await requireUser(workspaceSlug)
  requirePermission(user, "vto:write")
  void summary
  return {
    ok: true,
    revisionId: `rev_${Date.now().toString(36)}`,
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
  return {
    ok: true,
    suggestion:
      "(server-side) AI suggestion will stream from the AI gateway in production.",
  }
}
