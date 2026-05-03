"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { requirePermission } from "@/lib/server/permissions"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { logAudit } from "@/lib/audit"

export type SsoConfig = {
  providerId: string | null
  providerType: "saml" | "oidc" | null
  displayName: string | null
  enforced: boolean
  allowedDomains: string[]
  updatedAt: string | null
}

const EMPTY: SsoConfig = {
  providerId: null,
  providerType: null,
  displayName: null,
  enforced: false,
  allowedDomains: [],
  updatedAt: null,
}

function normalizeDomain(d: string): string {
  return d.trim().toLowerCase().replace(/^@/, "").replace(/\s+/g, "")
}

export async function getSsoConfig(workspaceSlug: string): Promise<SsoConfig> {
  try {
    const user = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()
    const { data } = await sb
      .from("workspace_sso_config")
      .select("provider_id, provider_type, display_name, enforced, allowed_domains, updated_at")
      .eq("workspace_id", user.workspaceId)
      .maybeSingle()
    if (!data) return EMPTY
    return {
      providerId: (data.provider_id as string | null) ?? null,
      providerType: (data.provider_type as "saml" | "oidc" | null) ?? null,
      displayName: (data.display_name as string | null) ?? null,
      enforced: Boolean(data.enforced),
      allowedDomains: Array.isArray(data.allowed_domains)
        ? (data.allowed_domains as string[])
        : [],
      updatedAt: (data.updated_at as string | null) ?? null,
    }
  } catch {
    return EMPTY
  }
}

export async function saveSsoConfig(
  workspaceSlug: string,
  patch: {
    providerId?: string | null
    providerType?: "saml" | "oidc" | null
    displayName?: string | null
    enforced?: boolean
    allowedDomains?: string[]
  },
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "tenants:admin")
    const sb = supabaseAdmin()

    const row: Record<string, unknown> = {
      workspace_id: user.workspaceId,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    }
    if ("providerId" in patch) row.provider_id = patch.providerId ?? null
    if ("providerType" in patch) row.provider_type = patch.providerType ?? null
    if ("displayName" in patch) row.display_name = patch.displayName?.trim() || null
    if ("enforced" in patch) row.enforced = Boolean(patch.enforced)
    if (patch.allowedDomains) {
      row.allowed_domains = Array.from(
        new Set(patch.allowedDomains.map(normalizeDomain).filter(Boolean)),
      )
    }

    const { error } = await sb
      .from("workspace_sso_config")
      .upsert(row, { onConflict: "workspace_id" })
    if (error) return { ok: false, error: error.message }

    await logAudit({
      user,
      action: "update",
      entityType: "tenant",
      entityId: user.workspaceId,
      metadata: { field: "sso_config", changes: Object.keys(patch) },
    })
    revalidatePath(`/${workspaceSlug}/settings/sso`)
    revalidatePath(`/${workspaceSlug}/login`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

/**
 * Used by the login page to decide whether to deny password sign-in for
 * an email and bounce them to the SSO start URL instead.
 */
export async function ssoRequirementForEmail(
  workspaceSlug: string,
  email: string,
): Promise<{ enforced: boolean; providerId: string | null; displayName: string | null }> {
  const sb = supabaseAdmin()
  const { data: ws } = await sb
    .from("workspaces")
    .select("id")
    .eq("slug", workspaceSlug)
    .maybeSingle()
  if (!ws) return { enforced: false, providerId: null, displayName: null }
  const { data: cfg } = await sb
    .from("workspace_sso_config")
    .select("enforced, provider_id, allowed_domains, display_name")
    .eq("workspace_id", ws.id as string)
    .maybeSingle()
  if (!cfg || !cfg.enforced || !cfg.provider_id) {
    return { enforced: false, providerId: null, displayName: null }
  }
  const domain = email.split("@")[1]?.toLowerCase()
  const allowed = (cfg.allowed_domains as string[] | null) ?? []
  const matches = domain && allowed.includes(domain)
  if (!matches) return { enforced: false, providerId: null, displayName: null }
  return {
    enforced: true,
    providerId: cfg.provider_id as string,
    displayName: (cfg.display_name as string | null) ?? null,
  }
}
