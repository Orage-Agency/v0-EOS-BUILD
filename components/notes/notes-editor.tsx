"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useNotesStore } from "@/lib/notes-store"
import { ROCKS, USERS } from "@/lib/mock-data"
import { OrageAvatar } from "@/components/orage/avatar"
import { IcMore } from "@/components/orage/icons"
import { OrageEmpty } from "@/components/empty/orage-empty"
import { BlockRenderer } from "./blocks"

export function NotesEditor() {
  const activeNoteId = useNotesStore((s) => s.activeNoteId)
  const note = useNotesStore((s) => s.notes.find((n) => n.id === activeNoteId))
  const blocks = useNotesStore((s) => s.blocks[s.activeNoteId] ?? [])
  const [title, setTitle] = useState(note?.title ?? "")

  if (!note) {
    const createNote = useNotesStore.getState().createNote
    return (
      <main className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-xl">
          <OrageEmpty
            eyebrow="DOCS · CONTEXT · KNOWLEDGE"
            title="NO NOTE OPEN"
            description="Notes attach to a rock, a meeting, or stand alone. Slash-commands turn plain text into headings, lists, code blocks, and AI summaries."
            bullets={[
              "Type / for the slash menu",
              "Mention @people or link ↗ rocks inline",
              "Auto-saved · backlinks visible at the top",
            ]}
            ctas={[
              {
                label: "New Note",
                onClick: () => {
                  const id = createNote()
                  if (id) useNotesStore.getState().setActiveNote(id)
                },
              },
            ]}
          />
        </div>
      </main>
    )
  }

  const parentRock =
    note.parent.kind === "rock"
      ? ROCKS.find((r) => r.id === (note.parent as { kind: "rock"; rockId: string }).rockId)
      : null
  const parentLabel =
    note.parent.kind === "rock"
      ? parentRock?.title.split(" · ")[0] ?? "Rock"
      : note.parent.kind === "meetings"
        ? "Meetings"
        : "Personal"

  const presenceUsers = USERS.slice(1, 3)

  return (
    <main className="flex-1 min-w-0 flex flex-col bg-bg-1 overflow-hidden">
      <header className="flex items-center justify-between px-6 py-3 border-b border-border-orage">
        <nav className="flex items-center gap-1.5 text-[11px] text-text-muted min-w-0">
          <span className="hover:text-gold-400 cursor-pointer">Notes</span>
          <span className="text-text-dim">›</span>
          <span className="hover:text-gold-400 cursor-pointer">{parentLabel}</span>
          <span className="text-text-dim">›</span>
          <span className="text-gold-400 truncate">{note.title}</span>
        </nav>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {presenceUsers.map((u) => (
              <span
                key={u.id}
                title={`${u.name} editing`}
                className="ring-2 ring-bg-1 rounded-full"
              >
                <OrageAvatar user={u} size="xs" />
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => toast("SHARE LINK COPIED")}
            className="flex items-center justify-center w-7 h-7 rounded-sm bg-bg-3 border border-border-orage text-text-muted hover:border-gold-500 hover:text-gold-400 transition-colors"
            aria-label="Share"
            title="Share"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </button>
          <button
            type="button"
            className="flex items-center justify-center w-7 h-7 rounded-sm bg-bg-3 border border-border-orage text-text-muted hover:border-gold-500 hover:text-gold-400 transition-colors"
            aria-label="More"
          >
            <IcMore className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[760px] mx-auto px-8 py-10">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled"
            className="w-full bg-transparent border-none outline-none font-display text-[36px] tracking-wide text-text-primary placeholder:text-text-muted/50 mb-2.5"
          />

          <div className="flex items-center gap-2 text-[11px] text-text-muted mb-6 flex-wrap">
            {parentRock && (
              <span className="font-display text-[10px] tracking-[0.18em] text-gold-500 bg-gold-500/10 px-2 py-1 rounded-sm cursor-pointer hover:bg-gold-500/20">
                ↗ ROCK · {parentRock.tag}
              </span>
            )}
            <span>·</span>
            {/* Time labels intentionally diverge between SSR (UTC, server clock)
                and the client browser. Suppressing the hydration warning is the
                React-recommended fix for legitimately time-dependent text and
                eliminates Notes #418 (text variant). */}
            <span suppressHydrationWarning>
              Created {new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} ·
              Updated {relative(note.updatedAt)}
            </span>
            <span>·</span>
            <span className="text-gold-400 cursor-pointer hover:underline">3 backlinks ↗</span>
          </div>

          <div className="flex flex-col">
            {blocks.map((b, i) => (
              <BlockRenderer key={b.id} block={b} isLast={i === blocks.length - 1} />
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}

function relative(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const mins = Math.round((now - then) / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}
