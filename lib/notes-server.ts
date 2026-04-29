/**
 * Orage Core · Notes server-side data helpers
 * Server-only; never imported by client components.
 */
import "server-only"

import { requireUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { NoteRef, Block } from "@/lib/notes-store"

type DbNote = {
  id: string
  title: string
  content: unknown
  parent_type: string | null
  parent_id: string | null
  is_pinned: boolean | null
  folder: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

function dbToNoteRef(row: DbNote): NoteRef {
  const parentType = row.parent_type ?? "personal"
  const parent: NoteRef["parent"] =
    parentType === "rock" && row.parent_id
      ? { kind: "rock", rockId: row.parent_id }
      : parentType === "meetings"
        ? { kind: "meetings" }
        : { kind: "personal" }

  const blocks = Array.isArray(row.content) ? (row.content as Block[]) : []
  const wordCount = blocks.reduce((acc, b) => {
    if ("html" in b) return acc + b.html.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length
    return acc
  }, 0)

  return {
    id: row.id,
    title: row.title,
    parent,
    authorId: row.created_by ?? "",
    createdAt: row.created_at.slice(0, 10),
    updatedAt: row.updated_at,
    visibility: row.folder === "private" ? "private" : "team",
    wordCount,
  }
}

export async function listNotesForWorkspace(workspaceSlug: string): Promise<NoteRef[]> {
  const user = await requireUser(workspaceSlug)
  try {
    const sb = supabaseAdmin()
    const { data, error } = await sb
      .from("notes")
      .select("id, title, content, parent_type, parent_id, is_pinned, folder, created_by, created_at, updated_at")
      .eq("tenant_id", user.workspaceId)
      .order("updated_at", { ascending: false })
    if (error) {
      console.error("[v0] listNotesForWorkspace error", error.message)
      return []
    }
    return ((data as DbNote[] | null) ?? []).map(dbToNoteRef)
  } catch (err) {
    console.error("[v0] listNotesForWorkspace exception", err)
    return []
  }
}

export async function getNoteBlocks(workspaceSlug: string, noteId: string): Promise<Block[]> {
  const user = await requireUser(workspaceSlug)
  try {
    const sb = supabaseAdmin()
    const { data, error } = await sb
      .from("notes")
      .select("content")
      .eq("id", noteId)
      .eq("tenant_id", user.workspaceId)
      .single()
    if (error || !data) return []
    return Array.isArray((data as { content: unknown }).content)
      ? ((data as { content: Block[] }).content)
      : []
  } catch {
    return []
  }
}
