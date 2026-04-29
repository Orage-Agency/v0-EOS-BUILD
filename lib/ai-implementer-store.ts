"use client"

import { create } from "zustand"

// ============================================================================
// TYPES
// ============================================================================
export type ThreadKind =
  | "briefing"
  | "digest"
  | "analysis"
  | "draft"
  | "l10sum"
  | "actions"
  | "pin"

export type ThreadSection = "proactive" | "recent" | "pinned"

export type Thread = {
  id: string
  title: string
  preview: string
  section: ThreadSection
  kind: ThreadKind
  time: string
  tag: string
  pinned?: boolean
  contextChips?: ContextChip[]
}

export type ContextChip = {
  id: string
  kind: "rock" | "person" | "date" | "issue" | "task" | "metric"
  label: string
  pinned?: boolean
}

// ----- Message blocks ---------------------------------------------------------
export type ToolCallStatus = "running" | "done" | "auto-executed" | "error"

export type ToolCallBlock = {
  kind: "tool-call"
  id: string
  name: string
  status: ToolCallStatus
  args: Record<string, string>
}

export type RockEmbedBlock = {
  kind: "rock-embed"
  id: string
  rockId: string
  title: string
  subtitle: string
  pct: number
  pctLabel: string
  ownerInitials: string
  ownerColor: "geo" | "bro" | "bar" | "ivy"
  status: "on_track" | "at_risk" | "off_track"
  milestoneText: string
}

export type ChartEmbedBlock = {
  kind: "chart-embed"
  id: string
  title: string
  meta: string
  bars: { label: string; pct: number; tone?: "ok" | "warning" | "danger" }[]
}

export type ApprovalField = { label: string; value: string }

export type ApprovalCardBlock = {
  kind: "approval"
  id: string
  category: string
  action: string
  fields: ApprovalField[]
  state: "pending" | "approved" | "rejected"
}

export type TextBlock = { kind: "text"; id: string; html: string }
export type CursorBlock = { kind: "cursor"; id: string }

export type MessageBlock =
  | TextBlock
  | ToolCallBlock
  | RockEmbedBlock
  | ChartEmbedBlock
  | ApprovalCardBlock
  | CursorBlock

export type Message = {
  id: string
  threadId: string
  author: "user" | "ai"
  authorName: string
  authorInitials?: string
  authorColor?: "geo" | "bro" | "bar" | "ivy"
  time: string
  blocks: MessageBlock[]
}

// ----- Capabilities -----------------------------------------------------------
export type CapabilityStatus = "auto" | "approval" | "blocked"

export type Capability = {
  id: string
  name: string
  status: CapabilityStatus
  mode: string
  enabled: boolean
}

// ----- Briefings --------------------------------------------------------------
export type Briefing = {
  id: string
  name: string
  cron: string
  nextLabel: string
  paused: boolean
}

// ----- Audit ------------------------------------------------------------------
export type AuditStatus = "auto" | "approved" | "pending" | "rejected"

export type AuditRow = {
  id: string
  time: string
  action: string
  text: string
  status: AuditStatus
}

// ============================================================================
// SEED DATA
// ============================================================================
const SEED_THREADS: Thread[] = []

const SEED_MESSAGES: Message[] = []

const SEED_CAPABILITIES: Capability[] = []

const SEED_BRIEFINGS: Briefing[] = []

const SEED_AUDIT: AuditRow[] = []

// ============================================================================
// STORE
// ============================================================================
type RightTab = "capabilities" | "briefings" | "audit"

type State = {
  threads: Thread[]
  messages: Message[]
  capabilities: Capability[]
  briefings: Briefing[]
  audit: AuditRow[]
  activeThreadId: string
  rightTab: RightTab
  threadSearch: string
  composerDraft: string
  deepMode: boolean

  setActiveThread: (id: string) => void
  setRightTab: (tab: RightTab) => void
  setThreadSearch: (q: string) => void
  setComposerDraft: (v: string) => void
  toggleDeepMode: () => void
  toggleCapability: (id: string) => void
  toggleBriefing: (id: string) => void
  approveCard: (cardId: string) => void
  rejectCard: (cardId: string) => void
  removeContextChip: (threadId: string, chipId: string) => void
  pinContextChip: (threadId: string, chipId: string, kind: ContextChip["kind"], label: string) => void
  newThread: () => string
    sendMessage: (text: string, workspaceSlug: string) => void | Promise<void>
  prependAudit: (row: Omit<AuditRow, "id" | "time">) => void
}

// ----- Helpers shared by sendMessage ----------------------------------------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/**
 * Tiny markdown → HTML pass for assistant narration. Just enough to render
 * **bold**, *italic*, line breaks and bullet lists. Anything fancier the
 * model emits comes through as escaped text.
 */
function renderMarkdownLite(input: string): string {
  const safe = escapeHtml(input)
  // Lists
  const withLists = safe.replace(
    /(^|\n)((?:[-*] .+(?:\n|$))+)/g,
    (_match, lead: string, block: string) => {
      const items = block
        .trim()
        .split(/\n/)
        .map((line) => line.replace(/^[-*] /, ""))
        .map((line) => `<li>${line}</li>`)
        .join("")
      return `${lead}<ul class="list-disc pl-5 space-y-1">${items}</ul>`
    },
  )
  // Bold + italic
  const withInline = withLists
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-text-primary">$1</strong>')
    .replace(/(^|\W)\*([^*\n]+)\*/g, '$1<em class="text-gold-300">$2</em>')
  // Paragraph breaks
  return withInline
    .split(/\n{2,}/)
    .map((p) => (p.startsWith("<ul") ? p : `<p>${p.replace(/\n/g, "<br/>")}</p>`))
    .join("")
}

function blocksToPlainText(blocks: MessageBlock[]): string {
  return blocks
    .map((b) => {
      if (b.kind === "text") return b.html.replace(/<[^>]+>/g, "")
      if (b.kind === "tool-call") return `[tool: ${b.name}]`
      return ""
    })
    .filter(Boolean)
    .join("\n")
}

let aid = 100
const newAuditId = () => `a_${++aid}`
let mid = 100
const newMsgId = () => `m_${++mid}`
let tid = 100
const newThreadId = () => `th_new_${++tid}`

const nowTime = () =>
  new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })

export const useAIImplementerStore = create<State>((set, get) => ({
  threads: SEED_THREADS,
  messages: SEED_MESSAGES,
  capabilities: SEED_CAPABILITIES,
  briefings: SEED_BRIEFINGS,
  audit: SEED_AUDIT,
  activeThreadId: "",
  rightTab: "capabilities",
  threadSearch: "",
  composerDraft: "",
  deepMode: true,

  setActiveThread: (id) => set({ activeThreadId: id }),
  setRightTab: (tab) => set({ rightTab: tab }),
  setThreadSearch: (q) => set({ threadSearch: q }),
  setComposerDraft: (v) => set({ composerDraft: v }),
  toggleDeepMode: () => set((s) => ({ deepMode: !s.deepMode })),

  toggleCapability: (id) =>
    set((s) => ({
      capabilities: s.capabilities.map((c) =>
        c.id === id ? { ...c, enabled: !c.enabled } : c,
      ),
    })),

  toggleBriefing: (id) =>
    set((s) => ({
      briefings: s.briefings.map((b) =>
        b.id === id
          ? {
              ...b,
              paused: !b.paused,
              nextLabel: !b.paused ? "PAUSED" : `ACTIVE · NEXT ${b.cron.split(" · ")[1] ?? "SOON"}`,
            }
          : b,
      ),
    })),

  approveCard: (cardId) => {
    set((s) => ({
      messages: s.messages.map((m) => ({
        ...m,
        blocks: m.blocks.map((b) =>
          b.kind === "approval" && b.id === cardId
            ? { ...b, state: "approved" as const }
            : b,
        ),
      })),
    }))
    get().prependAudit({
      action: "APPROVE_ACTION",
      text: `card ${cardId} · executed`,
      status: "approved",
    })
  },

  rejectCard: (cardId) => {
    set((s) => ({
      messages: s.messages.map((m) => ({
        ...m,
        blocks: m.blocks.map((b) =>
          b.kind === "approval" && b.id === cardId
            ? { ...b, state: "rejected" as const }
            : b,
        ),
      })),
    }))
    get().prependAudit({
      action: "REJECT_ACTION",
      text: `card ${cardId} · logged`,
      status: "rejected",
    })
  },

  removeContextChip: (threadId, chipId) =>
    set((s) => ({
      threads: s.threads.map((t) =>
        t.id === threadId
          ? {
              ...t,
              contextChips: (t.contextChips ?? []).filter((c) => c.id !== chipId),
            }
          : t,
      ),
    })),

  pinContextChip: (threadId, chipId, kind, label) =>
    set((s) => ({
      threads: s.threads.map((t) =>
        t.id === threadId
          ? {
              ...t,
              contextChips: [
                ...(t.contextChips ?? []),
                { id: chipId, kind, label, pinned: true },
              ],
            }
          : t,
      ),
    })),

  newThread: () => {
    const id = newThreadId()
    const thread: Thread = {
      id,
      section: "recent",
      kind: "draft",
      title: "New thread",
      preview: "Tap a starter or type below…",
      time: "NOW",
      tag: "DRAFT",
    }
    set((s) => ({ threads: [thread, ...s.threads], activeThreadId: id }))
    return id
  },

  sendMessage: async (text, workspaceSlug) => {
    const trimmed = text.trim()
    if (!trimmed) return
    if (!workspaceSlug) {
      console.error("[v0] AI store sendMessage missing workspaceSlug")
      return
    }
    const threadId = get().activeThreadId
    const userMsg: Message = {
      id: newMsgId(),
      threadId,
      author: "user",
      authorName: "GEORGE",
      authorInitials: "GM",
      authorColor: "geo",
      time: nowTime(),
      blocks: [{ kind: "text", id: newMsgId(), html: trimmed }],
    }
    const aiMsg: Message = {
      id: newMsgId(),
      threadId,
      author: "ai",
      authorName: "IMPLEMENTER",
      time: nowTime(),
      blocks: [{ kind: "cursor", id: newMsgId() }],
    }
    set((s) => ({
      messages: [...s.messages, userMsg, aiMsg],
      composerDraft: "",
    }))

    // Build a tiny rolling history (last 8 turns) of plain text so we don't
    // ship our internal block format to the model.
    const priorHistory = get()
      .messages.filter(
        (m) => m.threadId === threadId && m.id !== userMsg.id && m.id !== aiMsg.id,
      )
      .slice(-8)
      .map((m) => ({
        role: m.author === "user" ? ("user" as const) : ("assistant" as const),
        content: blocksToPlainText(m.blocks),
      }))
      .filter((m) => m.content.length > 0)

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: priorHistory,
          workspaceSlug,
        }),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(`HTTP ${res.status}: ${body}`)
      }
      const payload = (await res.json()) as {
        text: string
        toolCalls: {
          id: string
          name: string
          args: Record<string, unknown>
          result: unknown
        }[]
      }

      // Build blocks: tool calls first, then the assistant's narration.
      const newBlocks: MessageBlock[] = []
      for (const tc of payload.toolCalls) {
        const argsAsStrings: Record<string, string> = {}
        for (const [k, v] of Object.entries(tc.args ?? {})) {
          argsAsStrings[k] =
            typeof v === "string" ? `"${v}"` : JSON.stringify(v)
        }
        const isError =
          tc.result &&
          typeof tc.result === "object" &&
          "error" in (tc.result as Record<string, unknown>)
        newBlocks.push({
          kind: "tool-call",
          id: tc.id,
          name: tc.name,
          status: isError ? "error" : "auto-executed",
          args: argsAsStrings,
        })
      }
      if (payload.text?.trim()) {
        newBlocks.push({
          kind: "text",
          id: newMsgId(),
          html: renderMarkdownLite(payload.text),
        })
      }
      if (newBlocks.length === 0) {
        newBlocks.push({
          kind: "text",
          id: newMsgId(),
          html: "(empty response)",
        })
      }

      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === aiMsg.id ? { ...m, blocks: newBlocks } : m,
        ),
      }))

      for (const tc of payload.toolCalls) {
        get().prependAudit({
          action: tc.name.toUpperCase(),
          text: `${tc.name}(${Object.keys(tc.args).join(", ") || "—"})`,
          status: "auto",
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === aiMsg.id
            ? {
                ...m,
                blocks: [
                  {
                    kind: "text" as const,
                    id: newMsgId(),
                    html: `<span class="text-status-danger">Implementer error:</span> ${escapeHtml(msg)}`,
                  },
                ],
              }
            : m,
        ),
      }))
    }
  },

  prependAudit: (row) =>
    set((s) => ({
      audit: [
        { id: newAuditId(), time: nowTime().replace(" AM", "").replace(" PM", ""), ...row },
        ...s.audit,
      ].slice(0, 50),
    })),
}))
