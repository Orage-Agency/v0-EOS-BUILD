"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function markNotificationRead(
  workspaceSlug: string,
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()
    const { error } = await sb
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("recipient_id", user.id)
    if (error) return { ok: false, error: error.message }
    revalidatePath(`/${workspaceSlug}/inbox`)
    revalidatePath(`/${workspaceSlug}`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function markAllRead(
  workspaceSlug: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()
    const { error } = await sb
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", user.id)
      .eq("tenant_id", user.workspaceId)
      .is("read_at", null)
    if (error) return { ok: false, error: error.message }
    revalidatePath(`/${workspaceSlug}/inbox`)
    revalidatePath(`/${workspaceSlug}`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}
