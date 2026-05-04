"use server"

import crypto from "crypto"
import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { requirePermission } from "@/lib/server/permissions"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { logAudit } from "@/lib/audit"

export type WebhookRow = {
  id: string
  name: string
  targetUrl: string
  eventTypes: string[]
  active: boolean
  createdAt: string
  lastDeliveredAt: string | null
  lastDeliveryStatus: number | null
  consecutiveFailures: number
}

export async function listWebhooks(
  workspaceSlug: string,
): Promise<{ ok: true; webhooks: WebhookRow[] } | { ok: false; error: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()
    const { data, error } = await sb
      .from("webhooks")
      .select(
        "id, name, target_url, event_types, active, created_at, last_delivered_at, last_delivery_status, consecutive_failures",
      )
      .eq("workspace_id", user.workspaceId)
      .order("created_at", { ascending: false })
    if (error) return { ok: false, error: error.message }
    return {
      ok: true,
      webhooks: ((data ?? []) as Array<{
        id: string
        name: string
        target_url: string
        event_types: string[]
        active: boolean
        created_at: string
        last_delivered_at: string | null
        last_delivery_status: number | null
        consecutive_failures: number
      }>).map((r) => ({
        id: r.id,
        name: r.name,
        targetUrl: r.target_url,
        eventTypes: r.event_types,
        active: r.active,
        createdAt: r.created_at,
        lastDeliveredAt: r.last_delivered_at,
        lastDeliveryStatus: r.last_delivery_status,
        consecutiveFailures: r.consecutive_failures,
      })),
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown" }
  }
}

export async function createWebhook(
  workspaceSlug: string,
  input: {
    name: string
    targetUrl: string
    eventTypes: string[]
  },
): Promise<
  | { ok: true; id: string; secret: string }
  | { ok: false; error: string }
> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "tenants:admin")
    const name = input.name.trim()
    const targetUrl = input.targetUrl.trim()
    if (!name) return { ok: false, error: "Name is required" }
    if (!/^https:\/\//i.test(targetUrl)) {
      return { ok: false, error: "Target URL must be HTTPS" }
    }
    const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`
    const sb = supabaseAdmin()
    const { data, error } = await sb
      .from("webhooks")
      .insert({
        workspace_id: user.workspaceId,
        name,
        target_url: targetUrl,
        secret,
        event_types: input.eventTypes,
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
      metadata: { kind: "webhook", name, target_url: targetUrl },
    })
    revalidatePath(`/${workspaceSlug}/settings/integrations`)
    return { ok: true, id: data.id as string, secret }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown" }
  }
}

export async function deleteWebhook(
  workspaceSlug: string,
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "tenants:admin")
    const sb = supabaseAdmin()
    const { error } = await sb
      .from("webhooks")
      .delete()
      .eq("id", id)
      .eq("workspace_id", user.workspaceId)
    if (error) return { ok: false, error: error.message }
    await logAudit({
      user,
      action: "delete",
      entityType: "tenant",
      entityId: id,
      metadata: { kind: "webhook" },
    })
    revalidatePath(`/${workspaceSlug}/settings/integrations`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown" }
  }
}
