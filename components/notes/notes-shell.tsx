"use client"

import { useEffect } from "react"
import { useNotesStore, type NoteRef } from "@/lib/notes-store"
import { NotesSidebar } from "./notes-sidebar"
import { NotesEditor } from "./notes-editor"
import { NotesMetaPanel } from "./notes-meta-panel"
import { SlashMenu } from "./slash-menu"

export function NotesShell({
  initialNoteId,
  initialNotes,
  workspaceSlug,
}: {
  initialNoteId?: string
  initialNotes?: NoteRef[]
  workspaceSlug?: string
} = {}) {
  const closeSlash = useNotesStore((s) => s.closeSlash)
  const setActiveNote = useNotesStore((s) => s.setActiveNote)
  const setNotes = useNotesStore((s) => s.setNotes)
  const setWorkspaceSlug = useNotesStore((s) => s.setWorkspaceSlug)
  const noteExists = useNotesStore((s) =>
    initialNoteId ? Boolean(s.notes.find((n) => n.id === initialNoteId)) : false,
  )

  useEffect(() => {
    if (workspaceSlug) setWorkspaceSlug(workspaceSlug)
  }, [workspaceSlug, setWorkspaceSlug])

  useEffect(() => {
    if (initialNotes && initialNotes.length > 0) setNotes(initialNotes)
  }, [initialNotes, setNotes])

  useEffect(() => {
    if (initialNoteId && noteExists) setActiveNote(initialNoteId)
  }, [initialNoteId, noteExists, setActiveNote])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null
      if (!target) return
      if (target.closest('[role="menu"]') || target.closest('[contenteditable="true"]')) return
      closeSlash()
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [closeSlash])

  return (
    <div className="flex h-full overflow-hidden">
      <NotesSidebar />
      <NotesEditor />
      <NotesMetaPanel />
      <SlashMenu />
    </div>
  )
}
