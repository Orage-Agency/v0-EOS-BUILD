"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { useNotesStore } from "@/lib/notes-store"
import { ROCKS } from "@/lib/mock-data"
import { IcPlus, IcSearch } from "@/components/orage/icons"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  MenuItem,
  MenuDivider,
} from "@/components/orage/dropdown-menu"

export function NotesSidebar() {
  const notes = useNotesStore((s) => s.notes)
  const activeNoteId = useNotesStore((s) => s.activeNoteId)
  const setActive = useNotesStore((s) => s.setActiveNote)
  const expandedRocks = useNotesStore((s) => s.expandedRocks)
  const toggleRock = useNotesStore((s) => s.toggleRock)
  const expandedSections = useNotesStore((s) => s.expandedSections)
  const toggleSection = useNotesStore((s) => s.toggleSection)
  const create = useNotesStore((s) => s.createNote)
  const renameNote = useNotesStore((s) => s.renameNote)
  const deleteNote = useNotesStore((s) => s.deleteNote)

  const [search, setSearch] = useState("")

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return notes
    return notes.filter((n) => n.title.toLowerCase().includes(q))
  }, [notes, search])

  const meetingNotes = filteredNotes.filter((n) => n.parent.kind === "meetings")
  const personalNotes = filteredNotes.filter((n) => n.parent.kind === "personal")

  return (
    <aside className="w-[260px] shrink-0 border-r border-border-orage bg-bg-1 flex flex-col h-full overflow-hidden">
      <div className="px-3.5 pt-4 pb-3 border-b border-border-orage flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[12px] tracking-[0.2em] text-gold-400">NOTES</h2>
          <button
            type="button"
            onClick={() => {
              create()
              toast("NEW NOTE · UNTITLED")
            }}
            className="flex items-center justify-center w-6 h-6 rounded-sm bg-bg-3 border border-border-orage text-text-muted hover:border-gold-500 hover:text-gold-400 transition-colors"
            aria-label="Create new note"
            title="New note"
          >
            <IcPlus className="w-3 h-3" />
          </button>
        </div>
        <div className="relative">
          <IcSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes…"
            className="w-full pl-7 pr-2 py-1.5 bg-bg-3 border border-border-orage rounded-sm text-[11px] text-text-primary placeholder:text-text-muted focus:border-gold-500 outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1.5 py-2">
        <Section
          label="↗ BY ROCK"
          expanded={expandedSections.has("rocks")}
          onToggle={() => toggleSection("rocks")}
        >
          {ROCKS.slice(0, 5).map((rock) => {
            const rockNotes = notes.filter(
              (n) => n.parent.kind === "rock" && n.parent.rockId === rock.id,
            )
            const isOpen = expandedRocks.has(rock.id)
            return (
              <div key={rock.id}>
                <button
                  type="button"
                  onClick={() => toggleRock(rock.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-[12px] text-text-secondary hover:bg-bg-3 transition-colors"
                >
                  <span className={cn("text-gold-500 text-[10px] transition-transform", isOpen && "rotate-90")}>
                    ▸
                  </span>
                  <span className="flex-1 text-left truncate">{rock.title.split(" · ")[0]}</span>
                  <span className="font-mono text-[9px] text-text-muted bg-bg-3 px-1.5 py-0.5 rounded-sm">
                    {rockNotes.length}
                  </span>
                </button>
                {isOpen && rockNotes.length > 0 && (
                  <div className="pl-5">
                    {rockNotes.map((n) => (
                      <NoteRow
                        key={n.id}
                        id={n.id}
                        title={n.title}
                        active={n.id === activeNoteId}
                        onClick={() => setActive(n.id)}
                        onRename={(t) => renameNote(n.id, t)}
                        onDelete={() => {
                          deleteNote(n.id)
                          toast(`Deleted "${n.title}"`)
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </Section>

        <Section
          label="◷ MEETINGS"
          expanded={expandedSections.has("meetings")}
          onToggle={() => toggleSection("meetings")}
        >
          {meetingNotes.map((n) => (
            <NoteRow
              key={n.id}
              id={n.id}
              title={n.title}
              badge={n.badge}
              active={n.id === activeNoteId}
              onClick={() => setActive(n.id)}
              onRename={(t) => renameNote(n.id, t)}
              onDelete={() => {
                deleteNote(n.id)
                toast(`Deleted "${n.title}"`)
              }}
            />
          ))}
        </Section>

        <Section
          label="⨯ PERSONAL"
          expanded={expandedSections.has("personal")}
          onToggle={() => toggleSection("personal")}
        >
          {personalNotes.map((n) => (
            <NoteRow
              key={n.id}
              id={n.id}
              title={n.title}
              active={n.id === activeNoteId}
              onClick={() => setActive(n.id)}
              onRename={(t) => renameNote(n.id, t)}
              onDelete={() => {
                deleteNote(n.id)
                toast(`Deleted "${n.title}"`)
              }}
            />
          ))}
        </Section>
      </div>
    </aside>
  )
}

function Section({
  label,
  expanded,
  onToggle,
  children,
}: {
  label: string
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="mb-3.5">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-2 py-1.5 font-display text-[10px] tracking-[0.2em] text-text-muted hover:text-gold-400 transition-colors"
      >
        <span className={cn("text-[8px] transition-transform", expanded && "rotate-90")}>▸</span>
        {label}
      </button>
      {expanded && <div className="flex flex-col gap-px">{children}</div>}
    </div>
  )
}

function NoteRow({
  id,
  title,
  badge,
  active,
  onClick,
  onRename,
  onDelete,
}: {
  id: string
  title: string
  badge?: string
  active?: boolean
  onClick: () => void
  onRename?: (next: string) => void
  onDelete?: () => void
}) {
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(title)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div
      className={cn(
        "group relative flex items-center gap-2 px-2 py-1.5 rounded-sm text-[12px]",
        active
          ? "bg-gold-500/10 text-gold-400"
          : "text-text-secondary hover:bg-bg-3 hover:text-text-primary",
      )}
    >
      <span className="text-text-muted text-[11px]">📄</span>
      {renaming ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const next = draft.trim()
            if (next && next !== title) onRename?.(next)
            setRenaming(false)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur()
            if (e.key === "Escape") {
              setDraft(title)
              setRenaming(false)
            }
            e.stopPropagation()
          }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 bg-bg-2 border border-gold-500 rounded-sm px-1 text-[12px] text-text-primary outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={onClick}
          className="flex-1 truncate text-left"
        >
          {title}
        </button>
      )}
      {badge && !renaming && (
        <span className="font-mono text-[9px] text-text-muted bg-bg-3 px-1.5 py-0.5 rounded-sm">
          {badge}
        </span>
      )}
      {!renaming && (onRename || onDelete) && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu
            align="right"
            width="w-40"
            trigger={({ toggle }) => (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  toggle()
                }}
                aria-label={`Note actions for ${title}`}
                className="w-5 h-5 rounded-sm flex items-center justify-center text-text-muted hover:text-gold-400 hover:bg-bg-2"
              >
                ⋯
              </button>
            )}
          >
            {(close) => (
              <>
                {onRename && (
                  <MenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      setDraft(title)
                      setRenaming(true)
                      close()
                    }}
                  >
                    Rename
                  </MenuItem>
                )}
                {onDelete && (
                  <>
                    <MenuDivider />
                    <MenuItem
                      danger
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!confirmDelete) {
                          setConfirmDelete(true)
                          setTimeout(() => setConfirmDelete(false), 3500)
                          return
                        }
                        onDelete()
                        close()
                        setConfirmDelete(false)
                      }}
                    >
                      {confirmDelete ? "Click again to confirm" : "Delete note…"}
                    </MenuItem>
                  </>
                )}
              </>
            )}
          </DropdownMenu>
        </div>
      )}
      <span aria-hidden hidden>
        {id}
      </span>
    </div>
  )
}
