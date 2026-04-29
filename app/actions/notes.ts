"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { Block } from "@/lib/notes-store"

function revalidateNoteRoutes(workspaceSlug: string) {
  revalidatePath(`/${workspaceSlug}/notes`)
}

export type CreateNoteInput = {
  title?: string
  parentType?: "rock" | "meetings" | "personal"
  parentId?: string
}

export async function createNote(
  workspaceSlug: string,
  input: CreateNoteInput = {},
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()
    const { data, error } = await sb
      .from("notes")
      .insert({
        tenant_id: user.workspaceId,
        title: input.title?.trim() || "Untitled",
        content: [{ id: "b1", type: "p", html: "" }],
        parent_type: input.parentType ?? "personal",
        parent_id: input.parentId ?? null,
        folder: "personal",
        created_by: user.id,
      })
      .select("id")
      .single()
    if (error || !data) {
      console.error("[v0] createNote error", error?.message)
      return { ok: false, error: error?.message ?? "Insert failed" }
    }
    revalidateNoteRoutes(workspaceSlug)
    return { ok: true, id: (data as { id: string }).id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return { ok: false, error: msg }
  }
}

export async function saveNoteContent(
  workspaceSlug: string,
  noteId: string,
  blocks: Block[],
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()
    const { error } = await sb
      .from("notes")
      .update({
        content: blocks,
        updated_at: new Date().toISOString(),
      })
      .eq("id", noteId)
      .eq("tenant_id", user.workspaceId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function updateNoteTitle(
  workspaceSlug: string,
  noteId: string,
  title: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()
    const { error } = await sb
      .from("notes")
      .update({ title: title.trim() || "Untitled", updated_at: new Date().toISOString() })
      .eq("id", noteId)
      .eq("tenant_id", user.workspaceId)
    if (error) return { ok: false, error: error.message }
    revalidateNoteRoutes(workspaceSlug)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function deleteNote(
  workspaceSlug: string,
  noteId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()
    const { error } = await sb
      .from("notes")
      .delete()
      .eq("id", noteId)
      .eq("tenant_id", user.workspaceId)
    if (error) return { ok: false, error: error.message }
    revalidateNoteRoutes(workspaceSlug)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}
