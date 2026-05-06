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

export type DeliveryRow = {
  id: string
  webhookId: string
  eventType: string
  attempts: number
  deliveredAt: string | null
  lastAttemptAt: string | null
  lastStatus: number | null
  lastError: string | null
  createdAt: string
}

export async function listDeliveries(
  workspaceSlug: string,
  webhookId: string,
  limit = 25,
): Promise<{ ok: true; deliveries: DeliveryRow[] } | { ok: false; error: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()
    const { data, error } = await sb
      .from("webhook_deliveries")
      .select(
        "id, webhook_id, event_type, attempts, delivered_at, last_attempt_at, last_status, last_error, created_at",
      )
      .eq("webhook_id", webhookId)
      .eq("workspace_id", user.workspaceId)
      .order("created_at", { ascending: false })
      .limit(Math.min(limit, 100))
    if (error) return { ok: false, error: error.message }
    return {
      ok: true,
      deliveries: ((data ?? []) as Array<{
        id: string
        webhook_id: string
        event_type: string
        attempts: number
        delivered_at: string | null
        last_attempt_at: string | null
        last_status: number | null
        last_error: string | null
        created_at: string
      }>).map((r) => ({
        id: r.id,
        webhookId: r.webhook_id,
        eventType: r.event_type,
        attempts: r.attempts,
        deliveredAt: r.delivered_at,
        lastAttemptAt: r.last_attempt_at,
        lastStatus: r.last_status,
        lastError: r.last_error,
        createdAt: r.created_at,
      })),
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown" }
  }
}

/**
 * Send a test event so the user can verify the receiving end is wired
 * up correctly without waiting for a real domain event. The payload is
 * a synthetic `webhook.test` event signed with the real secret.
 */
export async function sendTestWebhook(
  workspaceSlug: string,
  webhookId: string,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "tenants:admin")
    const sb = supabaseAdmin()
    const { data: hook } = await sb
      .from("webhooks")
      .select("id, target_url, secret")
      .eq("id", webhookId)
      .eq("workspace_id", user.workspaceId)
      .maybeSingle()
    if (!hook) return { ok: false, error: "Webhook not found" }
    const { signPayload } = await import("@/lib/webhooks")
    const { WEBHOOK_PAYLOAD_VERSION } = await import("@/lib/webhooks-types")
    const nowIso = new Date().toISOString()
    const body = JSON.stringify({
      id: null,
      event: "webhook.test",
      version: WEBHOOK_PAYLOAD_VERSION,
      workspace_id: user.workspaceId,
      created_at: nowIso,
      data: {
        triggered_by: user.email,
        message:
          "If you can see this in your consumer logs, the wire is healthy.",
      },
    })
    const signature = signPayload(hook.secret as string, body)
    let status = 0
    try {
      const res = await fetch(hook.target_url as string, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Orage-Core-Webhooks/1",
          "X-Orage-Event": "webhook.test",
          "X-Orage-Delivery": "test",
          "X-Orage-Signature": `sha256=${signature}`,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      })
      status = res.status
      if (status < 200 || status >= 300) {
        return { ok: false, status, error: `HTTP ${status}` }
      }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Fetch failed",
      }
    }
    await logAudit({
      user,
      action: "create",
      entityType: "tenant",
      entityId: webhookId,
      metadata: { kind: "webhook_test_sent", status },
    })
    return { ok: true, status }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown" }
  }
}

/**
 * Re-queue an existing delivery so the next pg_cron / Vercel cron pass
 * picks it up again. Resets `delivered_at`, decrements attempts back to
 * 0, and pushes `next_attempt_at` to NOW so it goes out on the very next
 * minute. Caller must be a workspace admin.
 */
export async function redeliverWebhookDelivery(
  workspaceSlug: string,
  deliveryId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "tenants:admin")
    const sb = supabaseAdmin()
    const { data: existing } = await sb
      .from("webhook_deliveries")
      .select("id, webhook_id, workspace_id")
      .eq("id", deliveryId)
      .eq("workspace_id", user.workspaceId)
      .maybeSingle()
    if (!existing) return { ok: false, error: "Delivery not found" }
    const { error } = await sb
      .from("webhook_deliveries")
      .update({
        delivered_at: null,
        last_attempt_at: null,
        last_status: null,
        last_error: null,
        attempts: 0,
        next_attempt_at: new Date().toISOString(),
      })
      .eq("id", deliveryId)
    if (error) return { ok: false, error: error.message }
    await logAudit({
      user,
      action: "update",
      entityType: "tenant",
      entityId: existing.webhook_id as string,
      metadata: { kind: "webhook_redeliver", delivery_id: deliveryId },
    })
    revalidatePath(`/${workspaceSlug}/settings/integrations`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown" }
  }
}

/**
 * Rotate a webhook's signing secret. Returns the new secret once so the
 * UI can display it; subsequent reads will only return the prefix.
 * Existing pending deliveries get the new secret on next attempt.
 */
export async function rotateWebhookSecret(
  workspaceSlug: string,
  webhookId: string,
): Promise<
  | { ok: true; secret: string }
  | { ok: false; error: string }
> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "tenants:admin")
    const sb = supabaseAdmin()
    const newSecret = `whsec_${crypto.randomBytes(24).toString("hex")}`
    const { data, error } = await sb
      .from("webhooks")
      .update({ secret: newSecret })
      .eq("id", webhookId)
      .eq("workspace_id", user.workspaceId)
      .select("id")
      .maybeSingle()
    if (error) return { ok: false, error: error.message }
    if (!data) return { ok: false, error: "Webhook not found" }
    await logAudit({
      user,
      action: "update",
      entityType: "tenant",
      entityId: webhookId,
      metadata: { kind: "webhook_secret_rotated" },
    })
    revalidatePath(`/${workspaceSlug}/settings/integrations`)
    return { ok: true, secret: newSecret }
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
