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
const SEED_THREADS: Thread[] = [
  {
    id: "th_brief",
    title: "Weekly Briefing · Mon Apr 28",
    preview: "3 rocks on track, 1 at risk. Ivy's 1:1 overdue. Organic traffic down 22% — flagged for IDS.",
    section: "proactive",
    kind: "briefing",
    time: "8:02 AM",
    tag: "BRIEFING",
    contextChips: [
      { id: "cc1", kind: "date", label: "WK APR 28" },
      { id: "cc2", kind: "rock", label: "Toolkit T1" },
      { id: "cc3", kind: "person", label: "Ivy" },
    ],
  },
  {
    id: "th_t1",
    title: "Toolkit T1 · Velocity Alert",
    preview: "Velocity dropped 22% over 2 weeks. Brooklyn hasn't touched milestones in 6 days. Recommend escalating to L10.",
    section: "proactive",
    kind: "analysis",
    time: "7:58 AM",
    tag: "ANALYSIS",
    contextChips: [
      { id: "cc4", kind: "rock", label: "Toolkit T1" },
    ],
  },
  {
    id: "th_actions",
    title: "Monday Action Items",
    preview: "5 to-dos captured in L10 · Apr 27. 2 ready to auto-create. Awaiting approval.",
    section: "proactive",
    kind: "actions",
    time: "YESTERDAY",
    tag: "ACTIONS",
  },
  {
    id: "th_l10sum",
    title: "L10 Summary · Apr 27",
    preview: "3/4 attended. 2 IDS resolved (both to Rocks). Cascading message set. Rating avg: 8/10.",
    section: "recent",
    kind: "l10sum",
    time: "APR 27",
    tag: "L10 SUM",
  },
  {
    id: "th_okc",
    title: "OKC Outbound Analysis",
    preview: "50 prospects loaded. 6 discovery calls booked, 2 completed. On pace for 8 by EOM.",
    section: "recent",
    kind: "analysis",
    time: "APR 25",
    tag: "ANALYSIS",
  },
  {
    id: "th_quint",
    title: "Quintessa Agent · Live Status",
    preview: "STACY v1 live. 30 QA calls scheduled Apr 26. 100% transfer reliability last 72h.",
    section: "pinned",
    kind: "pin",
    time: "APR 22",
    tag: "PINNED",
    contextChips: [
      { id: "cc5", kind: "issue", label: "Quintessa QA" },
    ],
  },
]

const SEED_MESSAGES: Message[] = [
  // ── Briefing thread ──────────────────────────────────────────────────
  {
    id: "m_b1",
    threadId: "th_brief",
    author: "ai",
    authorName: "IMPLEMENTER",
    time: "8:02 AM",
    blocks: [
      {
        kind: "tool-call",
        id: "tc_b1",
        name: "analyze_workspace",
        status: "auto-executed",
        args: { quarter: '"Q2 2026"', depth: '"full"' },
      },
      {
        kind: "text",
        id: "m_b1t",
        html: "<p><strong>Good morning, George.</strong> Here's your Monday briefing for the week of Apr 28.</p><p><strong>Rocks:</strong> 3 of 4 on track. Toolkit T1 is at risk — velocity dropped 22% and 3 milestones are approaching without committed owners. I've flagged it for IDS.</p><p><strong>People:</strong> Ivy's last 1:1 was 18 days ago and a Quarterly Conversation is due this week. Brooklyn's capacity is at 95% — T1 launch + VSL shoot overlapping.</p><p><strong>Scorecard:</strong> Organic traffic dropped 22% week-over-week. Discovery calls at 5/week vs. 8/week target. Both are red for a second consecutive week — both auto-listed for IDS on Monday.</p>",
      },
      {
        kind: "rock-embed",
        id: "re_b1",
        rockId: "r6",
        title: "TOOLKIT T1 PUBLIC LAUNCH",
        subtitle: "Owner: Brooklyn · Due Jun 30",
        pct: 44,
        pctLabel: "44% complete",
        ownerInitials: "BR",
        ownerColor: "bro",
        status: "at_risk",
        milestoneText: "Next: Stripe checkout flow due May 2",
      },
      {
        kind: "chart-embed",
        id: "ce_b1",
        title: "TASK COMPLETION · LAST 4 WEEKS",
        meta: "Team avg vs 80% target",
        bars: [
          { label: "WK APR 7",  pct: 85, tone: "ok" },
          { label: "WK APR 14", pct: 82, tone: "ok" },
          { label: "WK APR 21", pct: 74, tone: "warning" },
          { label: "WK APR 28", pct: 71, tone: "warning" },
        ],
      },
      {
        kind: "approval",
        id: "ap_b1",
        category: "TASK",
        action: "Create 2 tasks from L10 Apr 27 captures",
        fields: [
          { label: "Task 1", value: "Brooklyn: update proposal template before Friday EOD" },
          { label: "Task 2", value: "Baruc: pull Q1 scorecard actuals and post in Slack by EOW" },
          { label: "Owner", value: "Assigned from capture tags" },
          { label: "Due", value: "May 2, 2026" },
        ],
        state: "pending",
      },
    ],
  },
  // ── T1 velocity thread ───────────────────────────────────────────────
  {
    id: "m_t1_1",
    threadId: "th_t1",
    author: "ai",
    authorName: "IMPLEMENTER",
    time: "7:58 AM",
    blocks: [
      {
        kind: "tool-call",
        id: "tc_t1",
        name: "analyze_rock_velocity",
        status: "auto-executed",
        args: { rock_id: '"r6"', window_days: '"14"' },
      },
      {
        kind: "text",
        id: "m_t1t",
        html: "<p><strong>Toolkit T1 velocity alert.</strong> Over the last 14 days, milestone completion velocity has dropped 22%. The last committed milestone (internal QA pass) was closed Apr 21 — 8 days ago. Brooklyn hasn't touched any milestones since.</p><p>5 milestones remain, 4 of them unstarted. At current pace, the Jun 30 deadline will be missed by approximately 2 weeks.</p><p><strong>Recommended actions:</strong></p><ul class=\"list-disc pl-5 space-y-1\"><li>Escalate to L10 IDS on May 4 — add to agenda now</li><li>Break Stripe checkout into 3 sub-tasks to surface daily progress</li><li>Schedule a pair-session: Brooklyn + Baruc on entitlement gating spec</li></ul>",
      },
    ],
  },
  // ── L10 summary thread ───────────────────────────────────────────────
  {
    id: "m_l10_1",
    threadId: "th_l10sum",
    author: "ai",
    authorName: "IMPLEMENTER",
    time: "APR 27 7:12 PM",
    blocks: [
      {
        kind: "tool-call",
        id: "tc_l10",
        name: "generate_meeting_summary",
        status: "auto-executed",
        args: { meeting_id: '"mtg-apr27"' },
      },
      {
        kind: "text",
        id: "m_l10t",
        html: "<p><strong>L10 Meeting Summary · Mon Apr 27.</strong></p><p><strong>Attendance:</strong> 3/4 (Ivy away)</p><p><strong>IDS resolved:</strong> 2 of 2 issues brought to IDS were resolved — client onboarding timeline (→ Rock, owned by Brooklyn) and proposal template misquote (→ Task, owned by Brooklyn, due Friday).</p><p><strong>Headlines:</strong> Verdictly AZ deal closed — $250 CPL, leads flowing.</p><p><strong>To-dos captured:</strong> 4. I'll create these as tasks pending your approval.</p><p><strong>Ratings:</strong> George 8/10 · Brooklyn 9/10 · Baruc 7/10</p><p><strong>Cascading message:</strong> Align on Q2 rock priorities — onboarding checklist becomes the flagship Rock.</p>",
      },
    ],
  },
]

const SEED_CAPABILITIES: Capability[] = [
  { id: "cap1", name: "Auto-scan scorecard for red metrics", status: "auto", mode: "RUNS WEEKLY · MON 7AM", enabled: true },
  { id: "cap2", name: "Draft weekly briefings", status: "auto", mode: "RUNS WEEKLY · MON 8AM", enabled: true },
  { id: "cap3", name: "Create tasks from L10 captures", status: "approval", mode: "AWAITS YOUR APPROVAL", enabled: true },
  { id: "cap4", name: "Update rock status from milestone data", status: "approval", mode: "AWAITS YOUR APPROVAL", enabled: true },
  { id: "cap5", name: "Propose IDS issues from scorecard", status: "auto", mode: "RUNS AFTER SCORECARD UPDATE", enabled: true },
  { id: "cap6", name: "Post meeting summary to team", status: "approval", mode: "AWAITS YOUR APPROVAL", enabled: false },
  { id: "cap7", name: "Flag overdue 1:1s + quarterly convos", status: "auto", mode: "RUNS DAILY · 9AM", enabled: true },
]

const SEED_BRIEFINGS: Briefing[] = [
  { id: "br1", name: "Monday Morning Briefing", cron: "WEEKLY · MON 8:00 AM", nextLabel: "ACTIVE · NEXT MON 8:00 AM", paused: false },
  { id: "br2", name: "Daily Digest", cron: "DAILY · 9:00 AM", nextLabel: "ACTIVE · NEXT TOMORROW 9:00 AM", paused: false },
  { id: "br3", name: "L10 Pre-meeting Prep", cron: "WEEKLY · MON 4:00 PM", nextLabel: "ACTIVE · NEXT MON 4:00 PM", paused: false },
  { id: "br4", name: "Quarterly Rock Review", cron: "MONTHLY · 1ST MON", nextLabel: "ACTIVE · NEXT JUN 1", paused: false },
  { id: "br5", name: "People Pulse (1:1 overdue alert)", cron: "WEEKLY · FRI 5:00 PM", nextLabel: "PAUSED", paused: true },
]

const SEED_AUDIT: AuditRow[] = [
  { id: "a_1", time: "8:02 AM", action: "ANALYZE_WORKSPACE", text: "analyze_workspace(quarter=Q2, depth=full)", status: "auto" },
  { id: "a_2", time: "8:02 AM", action: "ANALYZE_ROCK_VELOCITY", text: "analyze_rock_velocity(rock_id=r6, window_days=14)", status: "auto" },
  { id: "a_3", time: "7:58 AM", action: "FLAG_IDS_ISSUE", text: "flag_ids_issue(title=Organic traffic drop 22%)", status: "auto" },
  { id: "a_4", time: "APR 27 7:12 PM", action: "GENERATE_MEETING_SUMMARY", text: "generate_meeting_summary(meeting_id=mtg-apr27)", status: "auto" },
  { id: "a_5", time: "APR 27 7:13 PM", action: "CREATE_TASK", text: "create_task(title=Brooklyn update proposal...) → pending approval", status: "pending" },
  { id: "a_6", time: "APR 26 9:01 AM", action: "SEND_SCORECARD_ALERT", text: "send_scorecard_alert(metric=organic_traffic, delta=-22%)", status: "auto" },
]

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
  activeThreadId: "th_brief",
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
