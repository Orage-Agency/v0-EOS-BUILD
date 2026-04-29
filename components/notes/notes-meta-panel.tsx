"use client"

import { toast } from "sonner"
import { useNotesStore } from "@/lib/notes-store"
import { ROCKS, getUser } from "@/lib/mock-data"
import { OrageAvatar } from "@/components/orage/avatar"

export function NotesMetaPanel() {
  const note = useNotesStore((s) => s.notes.find((n) => n.id === s.activeNoteId))
  const backlinks = useNotesStore((s) => s.backlinks[s.activeNoteId] ?? [])

  if (!note) return <aside className="hidden xl:block w-[280px] shrink-0 border-l border-border-orage bg-bg-1" />

  const author = getUser(note.authorId)
  const parentRock =
    note.parent.kind === "rock"
      ? ROCKS.find((r) => r.id === (note.parent as { kind: "rock"; rockId: string }).rockId)
      : null

  return (
    <aside className="hidden xl:flex w-[280px] shrink-0 border-l border-border-orage bg-bg-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
        <Section label="PROPERTIES">
          <Row label="CREATED" value={fmtDate(note.createdAt)} />
          <Row label="UPDATED" value={relative(note.updatedAt)} />
          <Row
            label="AUTHOR"
            value={
              author && (
                <span className="flex items-center gap-1.5 justify-end">
                  <OrageAvatar user={author} size="xs" />
                  <span>{author.name.split(" ")[0].toUpperCase()}</span>
                </span>
              )
            }
          />
          <Row label="VISIBILITY" value={note.visibility.toUpperCase()} />
          {parentRock && (
            <Row
              label="PARENT ROCK"
              value={
                <button
                  type="button"
                  onClick={() => toast("OPENING ROCK")}
                  className="text-gold-400 hover:underline"
                >
                  ↗ {parentRock.tag}
                </button>
              }
            />
          )}
          <Row label="WORD COUNT" value={String(note.wordCount)} />
        </Section>

        <Section label={`↗ BACKLINKS · ${backlinks.length}`}>
          {backlinks.length === 0 && (
            <div className="px-2 py-3 text-[11px] text-text-muted text-center">
              No backlinks yet.
            </div>
          )}
          {backlinks.map((bl) => (
            <button
              key={bl.id}
              type="button"
              onClick={() => toast(`OPENING NOTE: ${bl.fromTitle}`)}
              className="w-full text-left p-2.5 rounded-sm border border-border-orage bg-bg-3 hover:border-gold-500/40 transition-colors mb-1.5"
            >
              <div className="font-display text-[9px] tracking-[0.18em] text-gold-400 mb-1">
                {bl.fromTitle} · {bl.fromAt}
              </div>
              <div
                className="text-[11px] text-text-secondary leading-relaxed"
                dangerouslySetInnerHTML={{ __html: bl.snippet }}
              />
            </button>
          ))}
        </Section>

        <Section label="↗ MENTIONS · 4">
          <Row label="Brooklyn" value="2 MENTIONS" mono={false} />
          <Row label="Baruc" value="2 MENTIONS" mono={false} />
        </Section>

        <Section label="REFERENCED IN">
          <Row label="Tasks" value="3" mono={false} />
          <Row label="Issues" value="1" mono={false} />
          <Row label="Meetings" value="2" mono={false} />
        </Section>
      </div>
    </aside>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-display text-[10px] tracking-[0.2em] text-text-muted mb-2">
        {label}
      </div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  )
}

function Row({
  label,
  value,
  mono = true,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-1 text-[11px]">
      <span
        className={
          mono
            ? "font-display tracking-[0.15em] text-text-muted"
            : "text-text-secondary"
        }
      >
        {label}
      </span>
      {/* P0-3: Row values include locale-formatted dates and "X mins ago"
          relative timestamps, both of which legitimately differ between
          server (UTC, build clock) and client (user TZ, render clock).
          Suppress the hydration warning here per React docs. */}
      <span
        suppressHydrationWarning
        className={mono ? "font-mono text-text-secondary" : "font-mono text-text-muted"}
      >
        {value}
      </span>
    </div>
  )
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).toUpperCase()
}

function relative(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const mins = Math.round((now - then) / 60000)
  if (mins < 60) return `${mins}M AGO`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}H AGO`
  const days = Math.round(hours / 24)
  return `${days}D AGO`
}
