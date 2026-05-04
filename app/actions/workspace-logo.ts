"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { requirePermission } from "@/lib/server/permissions"
import { supabaseAdmin } from "@/lib/supabase/admin"

const MAX_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED = new Set(["image/png", "image/jpeg", "image/svg+xml", "image/webp"])

/**
 * Upload a workspace logo to the `workspace-logos` Supabase storage
 * bucket and stamp the public URL onto `workspaces.logo_url`. Returns
 * the new URL on success.
 */
export async function uploadWorkspaceLogo(
  workspaceSlug: string,
  formData: FormData,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "tenants:admin")
    const file = formData.get("file") as File | null
    if (!file) return { ok: false, error: "No file uploaded" }
    if (file.size > MAX_BYTES) {
      return { ok: false, error: "File must be under 2 MB" }
    }
    if (!ALLOWED.has(file.type)) {
      return { ok: false, error: "PNG, JPEG, SVG, or WebP only" }
    }

    const sb = supabaseAdmin()
    // Stable filename per workspace so re-upload overwrites cleanly. The
    // cache-bust comes from the timestamp suffix we append to the URL we
    // store on workspaces.logo_url.
    const ext = file.type.split("/")[1].replace("svg+xml", "svg")
    const path = `${user.workspaceId}/logo.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadErr } = await sb.storage
      .from("workspace-logos")
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      })
    if (uploadErr) return { ok: false, error: uploadErr.message }

    const { data: pub } = sb.storage
      .from("workspace-logos")
      .getPublicUrl(path)
    // Append a cache-busting query so browsers refetch after re-upload.
    const url = `${pub.publicUrl}?v=${Date.now()}`

    const { error: updateErr } = await sb
      .from("workspaces")
      .update({ logo_url: url })
      .eq("id", user.workspaceId)
    if (updateErr) return { ok: false, error: updateErr.message }

    revalidatePath(`/${workspaceSlug}/settings/workspace`)
    revalidatePath(`/${workspaceSlug}`, "layout")
    return { ok: true, url }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown" }
  }
}

export async function removeWorkspaceLogo(
  workspaceSlug: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "tenants:admin")
    const sb = supabaseAdmin()
    const { error } = await sb
      .from("workspaces")
      .update({ logo_url: null })
      .eq("id", user.workspaceId)
    if (error) return { ok: false, error: error.message }
    revalidatePath(`/${workspaceSlug}/settings/workspace`)
    revalidatePath(`/${workspaceSlug}`, "layout")
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown" }
  }
}
