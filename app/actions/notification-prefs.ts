"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type {
  NotificationKind,
  NotificationChannel,
  NotificationPrefs,
} from "@/lib/notification-prefs"

export async function loadNotificationPrefs(
  workspaceSlug: string,
): Promise<{ ok: true; prefs: NotificationPrefs } | { ok: false; error: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()
    const { data, error } = await sb
      .from("profiles")
      .select("notification_prefs")
      .eq("id", user.id)
      .maybeSingle()
    if (error) return { ok: false, error: error.message }
    return { ok: true, prefs: (data?.notification_prefs ?? {}) as NotificationPrefs }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown" }
  }
}

export async function setNotificationPref(
  workspaceSlug: string,
  kind: NotificationKind,
  channel: NotificationChannel,
  enabled: boolean,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()
    const { data: existing } = await sb
      .from("profiles")
      .select("notification_prefs")
      .eq("id", user.id)
      .maybeSingle()
    const prefs = ((existing?.notification_prefs ?? {}) as NotificationPrefs)
    const kindPrefs = { ...(prefs[kind] ?? {}) }
    kindPrefs[channel] = enabled
    // Strip the entry entirely if both channels are back to true (the
    // default), to keep the JSON tidy.
    if (kindPrefs.in_app !== false && kindPrefs.email !== false) {
      delete prefs[kind]
    } else {
      prefs[kind] = kindPrefs
    }
    const { error } = await sb
      .from("profiles")
      .update({ notification_prefs: prefs })
      .eq("id", user.id)
    if (error) return { ok: false, error: error.message }
    revalidatePath(`/${workspaceSlug}/settings/notifications`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown" }
  }
}
