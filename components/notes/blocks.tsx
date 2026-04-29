"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { useNotesStore, type Block } from "@/lib/notes-store"
import { ROCKS, getUser } from "@/lib/mock-data"
import { OrageAvatar } from "@/components/orage/avatar"
import { cn } from "@/lib/utils"

/** A contentEditable block. Calls onCommit on blur with the latest HTML. */
function Editable({
  block,
  className,
  placeholder,
}: {
  block: Extract<Block, { html: string }>
  className?: string
  placeholder?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const update = useNotesStore((s) => s.updateBlockHtml)
  const openSlash = useNotesStore((s) => s.openSlash)
  const closeSlash = useNotesStore((s) => s.closeSlash)
  const setSlashQuery = useNotesStore((s) => s.setSlashQuery)
  const insertBlock = useNotesStore((s) => s.insertBlock)

  // sync external updates without clobbering caret
  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (node.innerHTML !== block.html) node.innerHTML = block.html
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id])

  function onInput() {
    const node = ref.current
    if (!node) return
    const text = node.textContent ?? ""
    if (text.startsWith("/")) {
      const rect = node.getBoundingClientRect()
      openSlash(block.id, { left: rect.left, top: rect.bottom + 4 }, text)
      setSlashQuery(text)
    } else {
      closeSlash()
    }
  }

  function onBlur() {
    if (!ref.current) return
    update(block.id, ref.current.innerHTML)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      // commit current state then create a new paragraph
      if (ref.current) update(block.id, ref.current.innerHTML)
      insertBlock(block.id, "p")
    }
    if (e.key === "Escape") closeSlash()
  }

  return (
    <div
      ref={ref}
      role="textbox"
      contentEditable
      suppressContentEditableWarning
      onInput={onInput}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      data-placeholder={placeholder}
      className={cn(
        "outline-none focus:bg-bg-3/40 rounded-sm px-1 -mx-1 transition-colors",
        "empty:before:content-[attr(data-placeholder)] empty:before:text-text-muted/60",
        className,
      )}
    />
  )
}

function H1({ block }: { block: Extract<Block, { type: "h1" }> }) {
  return (
    <Editable
      block={block}
      className="font-display text-[28px] tracking-wide text-gold-400 leading-tight my-3"
    />
  )
}

function H2({ block }: { block: Extract<Block, { type: "h2" }> }) {
  return (
    <Editable
      block={block}
      className="font-display text-[20px] tracking-wide text-text-primary leading-tight mt-5 mb-2"
    />
  )
}

function H3({ block }: { block: Extract<Block, { type: "h3" }> }) {
  return (
    <Editable
      block={block}
      className="font-display text-[16px] tracking-wide text-text-secondary leading-tight mt-4 mb-1.5"
    />
  )
}

function Paragraph({
  block,
  placeholder,
}: {
  block: Extract<Block, { type: "p" }>
  placeholder?: string
}) {
  return (
    <Editable
      block={block}
      placeholder={placeholder}
      className="text-[14px] text-text-primary leading-relaxed my-1.5"
    />
  )
}

function Bullet({ block }: { block: Extract<Block, { type: "bullet" }> }) {
  return (
    <div className="flex items-baseline gap-2 my-1">
      <span className="text-gold-500 text-[12px] leading-none mt-1.5">●</span>
      <Editable
        block={block}
        className="flex-1 text-[14px] text-text-primary leading-relaxed"
      />
    </div>
  )
}

function Todo({ block }: { block: Extract<Block, { type: "todo" }> }) {
  const toggle = useNotesStore((s) => s.toggleTodo)
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 my-1.5 rounded-sm px-1 -mx-1 py-1",
        block.done && "opacity-60",
      )}
    >
      <button
        type="button"
        onClick={() => toggle(block.id)}
        aria-pressed={block.done}
        aria-label={block.done ? "Mark not done" : "Mark done"}
        className={cn(
          "shrink-0 mt-1 w-4 h-4 rounded-sm border-[1.5px] flex items-center justify-center transition-colors",
          block.done ? "bg-gold-500 border-gold-500" : "border-border-strong hover:border-gold-500",
        )}
      >
        {block.done && (
          <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-text-on-gold" fill="none" stroke="currentColor" strokeWidth={3}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
      <Editable
        block={block}
        className={cn(
          "flex-1 text-[14px] leading-relaxed",
          block.done ? "text-text-muted line-through" : "text-text-primary",
        )}
      />
    </div>
  )
}

function Quote({ block }: { block: Extract<Block, { type: "quote" }> }) {
  return (
    <div className="my-3 border-l-2 border-gold-500 pl-4">
      <Editable
        block={block}
        className="text-[14px] italic text-text-secondary leading-relaxed"
      />
    </div>
  )
}

function Code({ block }: { block: Extract<Block, { type: "code" }> }) {
  return (
    <div className="my-3 rounded-md border border-border-orage bg-bg-3 p-3 font-mono text-[12px] text-text-secondary">
      <Editable block={block} className="font-mono whitespace-pre-wrap" />
    </div>
  )
}

function Divider() {
  return <hr className="my-5 border-t border-border-orage" />
}

function EmbedRock({ rockId }: { rockId: string }) {
  const rock = ROCKS.find((r) => r.id === rockId)
  if (!rock) return null
  const owner = getUser(rock.owner)
  return (
    <button
      type="button"
      onClick={() => toast("OPENING ROCK")}
      className="my-3 w-full text-left p-3.5 rounded-md border border-gold-500/30 bg-gradient-to-br from-gold-500/10 to-gold-500/5 hover:border-gold-500 transition-colors"
    >
      <div className="font-display text-[10px] tracking-[0.18em] text-gold-400 mb-1.5">
        ● ROCK · Q2 2026
      </div>
      <div className="text-[14px] text-text-primary mb-2 font-medium">{rock.title}</div>
      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="font-mono text-sm font-semibold text-gold-400">{rock.progress}% complete</span>
        <div className="flex-1 min-w-[80px] h-1 bg-bg-base rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gold-500 to-gold-400 transition-all"
            style={{ width: `${rock.progress}%` }}
          />
        </div>
        <span className="font-mono text-[10px] text-text-muted">milestones</span>
        {owner && <OrageAvatar user={owner} size="xs" />}
      </div>
    </button>
  )
}

function AiBlock({ block }: { block: Extract<Block, { type: "ai" }> }) {
  const accept = useNotesStore((s) => s.acceptAi)
  const remove = useNotesStore((s) => s.removeBlock)
  return (
    <div className="my-4 rounded-md border border-gold-500/40 bg-gradient-to-br from-gold-500/8 to-transparent overflow-hidden">
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-gold-500/20">
        <span className="ai-orb" aria-hidden />
        <span className="font-display text-[10px] tracking-[0.2em] text-gold-400">
          AI IMPLEMENTER · GENERATED
        </span>
        <span className="ml-auto font-mono text-[10px] text-text-muted truncate max-w-[60%]">
          {block.prompt}
        </span>
      </div>
      <div
        className="px-3.5 py-3 text-[13px] text-text-primary leading-relaxed"
        dangerouslySetInnerHTML={{ __html: block.htmlContent }}
      />
      <div className="px-3.5 py-2.5 border-t border-gold-500/20 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => {
            accept(block.id)
            toast("INSERTED INTO NOTE")
          }}
          className="px-3 py-1 rounded-sm bg-gradient-to-br from-gold-500 to-gold-400 text-text-on-gold font-display text-[10px] tracking-[0.15em]"
        >
          ACCEPT
        </button>
        <button
          type="button"
          onClick={() => toast("REGENERATING · STREAMING NEW RESPONSE")}
          className="px-3 py-1 rounded-sm bg-bg-3 border border-border-orage text-text-secondary font-display text-[10px] tracking-[0.15em] hover:border-gold-500 hover:text-gold-400"
        >
          REGENERATE
        </button>
        <button
          type="button"
          className="px-3 py-1 rounded-sm bg-bg-3 border border-border-orage text-text-secondary font-display text-[10px] tracking-[0.15em] hover:border-gold-500 hover:text-gold-400"
        >
          EDIT PROMPT
        </button>
        <button
          type="button"
          onClick={() => remove(block.id)}
          className="ml-auto px-3 py-1 font-display text-[10px] tracking-[0.15em] text-text-muted hover:text-danger"
        >
          DISCARD
        </button>
      </div>
    </div>
  )
}

export function BlockRenderer({
  block,
  isLast,
}: {
  block: Block
  isLast: boolean
}) {
  switch (block.type) {
    case "h1":
      return <H1 block={block} />
    case "h2":
      return <H2 block={block} />
    case "h3":
      return <H3 block={block} />
    case "p":
      return (
        <Paragraph
          block={block}
          placeholder={isLast ? "Type '/' for commands · '@' to mention · '[[' to link" : undefined}
        />
      )
    case "bullet":
      return <Bullet block={block} />
    case "todo":
      return <Todo block={block} />
    case "quote":
      return <Quote block={block} />
    case "code":
      return <Code block={block} />
    case "divider":
      return <Divider />
    case "ai":
      return <AiBlock block={block} />
    case "embed_rock":
      return <EmbedRock rockId={block.rockId} />
    case "embed_task":
      return (
        <button
          type="button"
          onClick={() => toast("OPENING TASK")}
          className="my-2 w-full text-left p-2.5 rounded-md border border-border-orage bg-bg-3 text-[13px] text-text-secondary hover:border-gold-500/50"
        >
          ✓ Task embed · {block.taskId}
        </button>
      )
    default:
      return null
  }
}
