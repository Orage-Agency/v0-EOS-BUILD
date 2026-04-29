"use client"

/**
 * Orage Core · Notes client store
 * Tree of notes (by rock, meetings, personal) plus the active note's
 * blocks. Note creation is persisted via the createNote server action.
 */

import { create } from "zustand"
import {
  createNote as createNoteAction,
  saveNoteContent as saveNoteContentAction,
  updateNoteTitle as updateNoteTitleAction,
  fetchNoteBlocks as fetchNoteBlocksAction,
} from "@/app/actions/notes"

let _autosaveTimer: ReturnType<typeof setTimeout> | null = null
let _titleSaveTimer: ReturnType<typeof setTimeout> | null = null

function isDbId(id: string) {
  return !id.startsWith("n_")
}

function scheduleAutosave(slug: string, noteId: string, blocks: Block[]) {
  if (!slug || !isDbId(noteId)) return
  if (_autosaveTimer) clearTimeout(_autosaveTimer)
  _autosaveTimer = setTimeout(() => {
    saveNoteContentAction(slug, noteId, blocks).catch(console.error)
  }, 800)
}

function scheduleTitleSave(slug: string, noteId: string, title: string) {
  if (!slug || !isDbId(noteId)) return
  if (_titleSaveTimer) clearTimeout(_titleSaveTimer)
  _titleSaveTimer = setTimeout(() => {
    updateNoteTitleAction(slug, noteId, title).catch(console.error)
  }, 800)
}

export type BlockType =
  | "h1"
  | "h2"
  | "h3"
  | "p"
  | "bullet"
  | "todo"
  | "quote"
  | "code"
  | "divider"
  | "ai"
  | "embed_rock"
  | "embed_task"

export type Block =
  | { id: string; type: "h1" | "h2" | "h3" | "p" | "bullet" | "quote" | "code"; html: string }
  | { id: string; type: "todo"; html: string; done: boolean }
  | { id: string; type: "divider" }
  | {
      id: string
      type: "ai"
      prompt: string
      htmlContent: string
      streaming?: boolean
    }
  | { id: string; type: "embed_rock"; rockId: string }
  | { id: string; type: "embed_task"; taskId: string }

export type NoteFolder =
  | { kind: "rock"; rockId: string; label: string; badge: number; expanded: boolean }
  | { kind: "section"; key: "meetings" | "personal"; label: string; expanded: boolean }

export type NoteRef = {
  id: string
  title: string
  parent:
    | { kind: "rock"; rockId: string }
    | { kind: "meetings" }
    | { kind: "personal" }
  badge?: string
  authorId: string
  createdAt: string
  updatedAt: string
  visibility: "team" | "private"
  wordCount: number
}

export type Backlink = {
  id: string
  fromTitle: string
  fromAt: string
  snippet: string
}

const SEED_BLOCKS: Block[] = []

const NOTES: NoteRef[] = [
  {
    id: "n_module7",
    title: "Module 7 — Scarcity & Urgency",
    parent: { kind: "rock", rockId: "r1" },
    authorId: "u_geo",
    createdAt: "2026-04-18",
    updatedAt: "2026-04-25T08:00:00Z",
    visibility: "team",
    wordCount: 412,
  },
  {
    id: "n_pricing",
    title: "Tier 2 Pricing & Positioning",
    parent: { kind: "rock", rockId: "r1" },
    authorId: "u_geo",
    createdAt: "2026-04-12",
    updatedAt: "2026-04-23T10:00:00Z",
    visibility: "team",
    wordCount: 218,
  },
  {
    id: "n_vsl-hook",
    title: "VSL Hook Drafts (Brooklyn)",
    parent: { kind: "rock", rockId: "r1" },
    authorId: "u_bro",
    createdAt: "2026-04-15",
    updatedAt: "2026-04-24T11:00:00Z",
    visibility: "team",
    wordCount: 187,
  },
  {
    id: "n_l10_apr21",
    title: "L10 · Mon Apr 21",
    parent: { kind: "meetings" },
    badge: "L10",
    authorId: "u_geo",
    createdAt: "2026-04-21",
    updatedAt: "2026-04-21T11:00:00Z",
    visibility: "team",
    wordCount: 340,
  },
  {
    id: "n_brooklyn_11",
    title: "Brooklyn 1:1 · Apr 18",
    parent: { kind: "meetings" },
    badge: "1:1",
    authorId: "u_geo",
    createdAt: "2026-04-18",
    updatedAt: "2026-04-18T17:00:00Z",
    visibility: "team",
    wordCount: 156,
  },
  {
    id: "n_quintessa_qbr",
    title: "Quintessa QBR · Apr 15",
    parent: { kind: "meetings" },
    badge: "QBR",
    authorId: "u_bar",
    createdAt: "2026-04-15",
    updatedAt: "2026-04-15T15:00:00Z",
    visibility: "team",
    wordCount: 280,
  },
  {
    id: "n_reading",
    title: "George · Reading Notes",
    parent: { kind: "personal" },
    authorId: "u_geo",
    createdAt: "2026-03-30",
    updatedAt: "2026-04-22T10:00:00Z",
    visibility: "private",
    wordCount: 92,
  },
  {
    id: "n_parking",
    title: "Ideas Parking Lot",
    parent: { kind: "personal" },
    authorId: "u_geo",
    createdAt: "2026-03-15",
    updatedAt: "2026-04-20T18:00:00Z",
    visibility: "private",
    wordCount: 64,
  },
]

const BACKLINKS: Record<string, Backlink[]> = {
  n_module7: [
    {
      id: "bl1",
      fromTitle: "VSL HOOK DRAFTS",
      fromAt: "1D AGO",
      snippet:
        '"…pulling objection patterns from <em>Module 7 — Scarcity & Urgency</em> for the V2 hook…"',
    },
    {
      id: "bl2",
      fromTitle: "L10 · APR 21",
      fromAt: "4D AGO",
      snippet:
        '"George: locked pricing per <em>Module 7</em>, Brooklyn voice review by Friday."',
    },
    {
      id: "bl3",
      fromTitle: "TIER 2 PRICING",
      fromAt: "2W AGO",
      snippet:
        '"Cohort-based scarcity logic comes from <em>Module 7</em> — see ethical scarcity rules."',
    },
  ],
}

type SlashState = {
  open: boolean
  blockId: string | null
  rect: { left: number; top: number } | null
  query: string
}

type NotesState = {
  notes: NoteRef[]
  setNotes: (notes: NoteRef[]) => void
  workspaceSlug: string
  setWorkspaceSlug: (slug: string) => void
  blocks: Record<string, Block[]>
  backlinks: Record<string, Backlink[]>

  activeNoteId: string
  setActiveNote: (id: string) => void

  expandedRocks: Set<string>
  expandedSections: Set<"meetings" | "personal" | "rocks">
  toggleRock: (rockId: string) => void
  toggleSection: (key: "meetings" | "personal" | "rocks") => void

  // editor mutations
  updateActiveNoteTitle: (title: string) => void
  updateBlockHtml: (blockId: string, html: string) => void
  toggleTodo: (blockId: string) => void
  insertBlock: (afterId: string, type: BlockType, payload?: Partial<Block>) => string
  removeBlock: (blockId: string) => void
  acceptAi: (blockId: string) => void

  // slash menu
  slash: SlashState
  openSlash: (blockId: string, rect: { left: number; top: number }, query?: string) => void
  closeSlash: () => void
  setSlashQuery: (q: string) => void

  createNote: (parentType?: "rock" | "meetings" | "personal", parentId?: string) => Promise<string>
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [...NOTES],
  setNotes: (notes) => set({ notes }),
  workspaceSlug: "",
  setWorkspaceSlug: (slug) => set({ workspaceSlug: slug }),
  blocks: { n_module7: [...SEED_BLOCKS] },
  backlinks: BACKLINKS,

  activeNoteId: "n_module7",
  setActiveNote: (id) => {
    set({ activeNoteId: id })
    const { workspaceSlug, blocks } = get()
    if (workspaceSlug && isDbId(id) && !blocks[id]) {
      fetchNoteBlocksAction(workspaceSlug, id)
        .then((fetched) => {
          if (fetched.length > 0) {
            set((s) => ({ blocks: { ...s.blocks, [id]: fetched } }))
          }
        })
        .catch(console.error)
    }
  },

  expandedRocks: new Set(["r1"]),
  expandedSections: new Set<"meetings" | "personal" | "rocks">(["rocks", "meetings", "personal"]),
  toggleRock: (rockId) =>
    set((state) => {
      const next = new Set(state.expandedRocks)
      next.has(rockId) ? next.delete(rockId) : next.add(rockId)
      return { expandedRocks: next }
    }),
  toggleSection: (key) =>
    set((state) => {
      const next = new Set(state.expandedSections)
      next.has(key) ? next.delete(key) : next.add(key)
      return { expandedSections: next }
    }),

  updateActiveNoteTitle: (title) => {
    const id = get().activeNoteId
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, title } : n)),
    }))
    scheduleTitleSave(get().workspaceSlug, id, title)
  },

  updateBlockHtml: (blockId, html) => {
    set((state) => {
      const id = state.activeNoteId
      const blocks = state.blocks[id] ?? []
      return {
        blocks: {
          ...state.blocks,
          [id]: blocks.map((b) =>
            b.id === blockId && "html" in b ? { ...b, html } : b,
          ),
        },
      }
    })
    const s = get()
    scheduleAutosave(s.workspaceSlug, s.activeNoteId, s.blocks[s.activeNoteId] ?? [])
  },
  toggleTodo: (blockId) => {
    set((state) => {
      const id = state.activeNoteId
      const blocks = state.blocks[id] ?? []
      return {
        blocks: {
          ...state.blocks,
          [id]: blocks.map((b) =>
            b.id === blockId && b.type === "todo" ? { ...b, done: !b.done } : b,
          ),
        },
      }
    })
    const s = get()
    scheduleAutosave(s.workspaceSlug, s.activeNoteId, s.blocks[s.activeNoteId] ?? [])
  },
  insertBlock: (afterId, type, payload) => {
    const id = `b_${crypto.randomUUID().slice(0, 8)}`
    set((state) => {
      const noteId = state.activeNoteId
      const blocks = state.blocks[noteId] ?? []
      const idx = blocks.findIndex((b) => b.id === afterId)
      const newBlock = makeBlock(id, type, payload)
      const next = [...blocks]
      const insertAt = idx === -1 ? next.length : idx + 1
      next.splice(insertAt, 0, newBlock)
      return { blocks: { ...state.blocks, [noteId]: next } }
    })
    const s = get()
    scheduleAutosave(s.workspaceSlug, s.activeNoteId, s.blocks[s.activeNoteId] ?? [])
    return id
  },
  removeBlock: (blockId) => {
    set((state) => {
      const noteId = state.activeNoteId
      const blocks = state.blocks[noteId] ?? []
      return {
        blocks: { ...state.blocks, [noteId]: blocks.filter((b) => b.id !== blockId) },
      }
    })
    const s = get()
    scheduleAutosave(s.workspaceSlug, s.activeNoteId, s.blocks[s.activeNoteId] ?? [])
  },
  acceptAi: (blockId) => {
    set((state) => {
      const noteId = state.activeNoteId
      const blocks = state.blocks[noteId] ?? []
      const target = blocks.find((b) => b.id === blockId)
      if (!target || target.type !== "ai") return {}
      // Convert the AI block into a paragraph block carrying the same HTML
      return {
        blocks: {
          ...state.blocks,
          [noteId]: blocks.map((b) =>
            b.id === blockId
              ? ({ id: b.id, type: "p", html: target.htmlContent } as Block)
              : b,
          ),
        },
      }
    })
  },

  slash: { open: false, blockId: null, rect: null, query: "" },
  openSlash: (blockId, rect, query = "") =>
    set({ slash: { open: true, blockId, rect, query } }),
  closeSlash: () => set({ slash: { open: false, blockId: null, rect: null, query: "" } }),
  setSlashQuery: (q) =>
    set((state) => ({ slash: { ...state.slash, query: q } })),

  createNote: async (parentType = "personal", parentId) => {
    const slug = get().workspaceSlug
    const tempId = `n_${crypto.randomUUID().slice(0, 8)}`
    const now = new Date().toISOString()
    const parent: NoteRef["parent"] =
      parentType === "rock" && parentId
        ? { kind: "rock", rockId: parentId }
        : parentType === "meetings"
          ? { kind: "meetings" }
          : { kind: "personal" }
    set((state) => ({
      notes: [
        {
          id: tempId,
          title: "Untitled",
          parent,
          authorId: "",
          createdAt: now.slice(0, 10),
          updatedAt: now,
          visibility: "private",
          wordCount: 0,
        },
        ...state.notes,
      ],
      blocks: { ...state.blocks, [tempId]: [{ id: "b1", type: "p", html: "" }] },
      activeNoteId: tempId,
    }))
    if (slug) {
      const result = await createNoteAction(slug, { parentType, parentId })
      if (result.ok) {
        const realId = result.id
        set((state) => ({
          notes: state.notes.map((n) => (n.id === tempId ? { ...n, id: realId } : n)),
          blocks: (() => {
            const next = { ...state.blocks, [realId]: state.blocks[tempId] ?? [] }
            delete next[tempId]
            return next
          })(),
          activeNoteId: state.activeNoteId === tempId ? realId : state.activeNoteId,
        }))
        return realId
      }
    }
    return tempId
  },
}))

function makeBlock(id: string, type: BlockType, payload?: Partial<Block>): Block {
  switch (type) {
    case "divider":
      return { id, type }
    case "todo":
      return { id, type, html: "", done: false, ...(payload as object) }
    case "ai":
      return {
        id,
        type,
        prompt: (payload as { prompt?: string })?.prompt ?? "",
        htmlContent: (payload as { htmlContent?: string })?.htmlContent ?? "",
        streaming: false,
      }
    case "embed_rock":
      return {
        id,
        type,
        rockId: (payload as { rockId?: string })?.rockId ?? "r1",
      }
    case "embed_task":
      return {
        id,
        type,
        taskId: (payload as { taskId?: string })?.taskId ?? "t1",
      }
    default:
      return { id, type, html: "" }
  }
}
