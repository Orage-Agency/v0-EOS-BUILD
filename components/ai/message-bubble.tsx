"use client"

import type { Message } from "@/lib/ai-implementer-store"
import { useAIImplementerStore } from "@/lib/ai-implementer-store"
import { useWorkspaceSlug } from "@/hooks/use-workspace-slug"
import { OrageAvatar } from "@/components/orage/avatar"
import { AIOrb } from "@/components/orage/ai-orb"
import { ToolCall } from "./tool-call-block"
import { RockEmbed } from "./rock-embed-block"
import { ChartEmbed } from "./chart-embed-block"
import { ApprovalCard } from "./approval-card"
import { cn } from "@/lib/utils"

export function MessageBubble({
  message,
  isLastAi = false,
}: {
  message: Message
  /** True when this is the most recent AI message in the thread; controls
   *  whether the Regenerate action row renders. */
  isLastAi?: boolean
}) {
  const streaming = useAIImplementerStore((s) => s.streaming)
  const regenerate = useAIImplementerStore((s) => s.regenerateLastResponse)
  const workspaceSlug = useWorkspaceSlug()
  const showActions = isLastAi && message.author === "ai" && !streaming

  return (
    <article className="flex gap-3 px-2">
      <div className="shrink-0 pt-0.5">
        {message.author === "user" ? (
          <OrageAvatar
            size="sm"
            user={{
              initials: message.authorInitials ?? "??",
              color: message.authorColor ?? "geo",
              name: message.authorName,
            }}
          />
        ) : (
          <span className="w-7 h-7 rounded-sm border border-gold-500/50 bg-[rgba(228,175,122,0.08)] flex items-center justify-center">
            <AIOrb size="xs" />
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <header className="flex items-center gap-2 mb-1.5 text-[11px]">
          <span
            className={cn(
              "font-display tracking-[0.2em]",
              message.author === "ai" ? "text-gold-400" : "text-text-primary",
            )}
          >
            {message.authorName}
          </span>
          <span className="text-text-dim">·</span>
          <span className="font-mono text-text-muted">{message.time}</span>
        </header>
        <div className="text-[13px] text-text-secondary leading-relaxed space-y-0.5">
          {message.blocks.map((block) => {
            switch (block.kind) {
              case "text":
                return (
                  <div
                    key={block.id}
                    className="prose-orage [&_strong]:text-text-primary [&_em]:text-gold-300"
                    dangerouslySetInnerHTML={{ __html: block.html }}
                  />
                )
              case "tool-call":
                return <ToolCall key={block.id} block={block} />
              case "rock-embed":
                return <RockEmbed key={block.id} block={block} />
              case "chart-embed":
                return <ChartEmbed key={block.id} block={block} />
              case "approval":
                return <ApprovalCard key={block.id} block={block} />
              case "cursor":
                return (
                  <span
                    key={block.id}
                    className="inline-block w-2 h-4 align-middle bg-gold-400 animate-pulse"
                    aria-label="streaming"
                  />
                )
            }
          })}
        </div>
        {showActions && (
          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => regenerate(workspaceSlug)}
              className="font-display text-[10px] tracking-[0.18em] uppercase px-2 py-1 rounded-sm border border-border-orage text-text-muted hover:border-gold-500/60 hover:text-gold-400 transition-colors inline-flex items-center gap-1.5"
              title="Re-run the last prompt — gives the model another swing without retyping."
            >
              ↻ Regenerate
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
