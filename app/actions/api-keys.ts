"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { requirePermission } from "@/lib/server/permissions"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { logAudit } from "@/lib/audit"
import { generateApiKey } from "@/lib/api-key-auth"

export type ApiKeyRow = {
  id: string
  name: string
  prefix: string
  scopes: string[]
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

export async function listApiKeys(
  workspaceSlug: string,
): Promise<{ ok: true; keys: ApiKeyRow[] } | { ok: false; error: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()
    const { data, error } = await sb
      .from("api_keys")
      .select("id, name, key_prefix, scopes, created_at, last_used_at, revoked_at")
      .eq("workspace_id", user.workspaceId)
      .order("created_at", { ascending: false })
    if (error) return { ok: false, error: error.message }
    return {
      ok: true,
      keys: ((data ?? []) as Array<{
        id: string
        name: string
        key_prefix: string
        scopes: string[]
        created_at: string
        last_used_at: string | null
        revoked_at: string | null
      }>).map((r) => ({
        id: r.id,
        name: r.name,
        prefix: r.key_prefix,
        scopes: r.scopes,
        createdAt: r.created_at,
        lastUsedAt: r.last_used_at,
        revokedAt: r.revoked_at,
      })),
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown" }
  }
}

export async function createApiKey(
  workspaceSlug: string,
  name: string,
  scopes: ("read" | "write")[] = ["read", "write"],
): Promise<
  | { ok: true; id: string; full: string; prefix: string }
  | { ok: false; error: string }
> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "tenants:admin")
    const trimmed = name.trim()
    if (!trimmed) return { ok: false, error: "Name is required" }
    const sb = supabaseAdmin()
    const { full, prefix, hash } = generateApiKey()
    const { data, error } = await sb
      .from("api_keys")
      .insert({
        workspace_id: user.workspaceId,
        name: trimmed,
        key_prefix: prefix,
        key_hash: hash,
        scopes,
        created_by: user.id,
      })
      .select("id")
      .single()
    if (error || !data) {
      return { ok: false, error: error?.message ?? "Insert failed" }
    }
    await logAudit({
      user,
      action: "create",
      entityType: "tenant",
      entityId: data.id as string,
      metadata: { kind: "api_key", name: trimmed, prefix },
    })
    revalidatePath(`/${workspaceSlug}/settings/integrations`)
    return { ok: true, id: data.id as string, full, prefix }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown" }
  }
}

export async function revokeApiKey(
  workspaceSlug: string,
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "tenants:admin")
    const sb = supabaseAdmin()
    const { error } = await sb
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id)
      .eq("workspace_id", user.workspaceId)
    if (error) return { ok: false, error: error.message }
    await logAudit({
      user,
      action: "delete",
      entityType: "tenant",
      entityId: id,
      metadata: { kind: "api_key" },
    })
    revalidatePath(`/${workspaceSlug}/settings/integrations`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown" }
  }
}
