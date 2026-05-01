/**
 * The Orage Core operating manual.
 *
 * Single source of truth for two consumers:
 *   1. The /help route — renders these sections with a TOC and search.
 *   2. The AI Implementer — `manualDigest()` returns a compact text version
 *      that gets injected into the system prompt so the AI can answer
 *      "how does X work?" questions verbatim from the same canon.
 *
 * Edit this file when the product behaviour changes; do NOT duplicate copy.
 */

export type ManualSection = {
  /** URL-safe id used for hash links + scroll-spy */
  id: string
  /** Short label for the TOC and breadcrumbs */
  label: string
  /** Display heading at the top of the section */
  title: string
  /** Optional one-liner under the title */
  lede?: string
  /** Plain-text body (will render as paragraphs split on blank lines) */
  body: string
  /** Bullet list rendered after the body */
  bullets?: string[]
  /** Linked-route hints (shown as small chips at the bottom) */
  related?: { label: string; href: string }[]
  /** Tags used by the search index */
  tags?: string[]
}

export type ManualGroup = {
  id: string
  label: string
  /** Eyebrow text above the group heading */
  eyebrow: string
  sections: ManualSection[]
}

export const MANUAL: ManualGroup[] = [
  {
    id: "intro",
    label: "Getting Started",
    eyebrow: "00 · INTRO",
    sections: [
      {
        id: "what-is-orage-core",
        label: "What is Orage Core?",
        title: "WHAT IS ORAGE CORE?",
        lede: "An operating system for the company — vision, weekly rhythm, quarterly priorities, with an AI that watches everything for drift.",
        body: `Orage Core is a custom-built EOS-style operating system. It puts the four pillars of running a company (vision, traction, scorecard, issues) into one app, and adds an AI Implementer that reads everything you do and proactively flags drift, escalations, and patterns.

Where most tools are passive databases, Orage Core is an active operating model. The AI doesn't just answer questions — it watches your scorecard for two-week reds, your rocks for stalled milestones, your handoffs for missing context, and your meetings for unresolved issues. Then it nudges the right person.`,
        bullets: [
          "Vision & Traction Organizer (V/TO) — your 10-year vision down to this year",
          "Rocks — 3-7 quarterly priorities, the only thing the team is allowed to be precious about",
          "Scorecard — 3-7 weekly numbers that tell you whether you're on track",
          "Issues — the IDS queue: identify, discuss, solve",
          "L10 — the weekly leadership meeting that ties it all together",
          "AI Implementer — a chief-of-staff that reads everything and nudges drift",
        ],
        related: [
          { label: "DASHBOARD", href: "/" },
          { label: "VTO", href: "/vto" },
        ],
        tags: ["overview", "what is", "intro", "purpose", "eos"],
      },
      {
        id: "navigation",
        label: "Getting around",
        title: "GETTING AROUND",
        lede: "Sidebar = modules. Topbar = identity + AI launcher. Cmd-K = command palette.",
        body: `The left sidebar is your module list — Dashboard, Rocks, Scorecard, Issues, V/TO, L10, People, Notes, Tasks, AI. The badges next to each module show your live counts: open rocks, red metrics, pending issues, today's tasks.

The topbar shows your tenant, the current user, and the AI launcher (the gold orb in the bottom-right). Press it, or use the chat dock at the bottom of the screen, to talk to the Implementer.

Cmd-K (or Ctrl-K) opens the command palette — fuzzy-search anything: rocks, people, settings pages, modules.`,
        bullets: [
          "Sidebar collapses to icons — click the chevron at the top",
          "Press / anywhere to focus search",
          "Press R to start a new rock from any page",
          "Press I to drop an issue from any page",
          "Press G then a letter to go: G+R rocks, G+I issues, G+S scorecard, G+V vto",
        ],
        tags: ["navigation", "shortcuts", "command palette", "cmd-k", "keyboard"],
      },
    ],
  },
  {
    id: "rocks",
    label: "Rocks",
    eyebrow: "01 · QUARTERLY ROCKS",
    sections: [
      {
        id: "rocks",
        label: "What rocks are",
        title: "ROCKS",
        lede: "3-7 priorities the company is married to this quarter. Outcomes, not tasks.",
        body: `A rock is a 90-day commitment. It's the single most important thing each leader is shipping this quarter, expressed as a finished outcome — not a task list, not an aspiration. "Quintessa intake agent live in production" is a rock; "work on intake agent" is not.

Each rock has an owner, a due date, milestones, and a status (on-track / at-risk / off-track). The AI watches milestone velocity weekly. When a rock falls two weeks behind on milestones, the AI auto-creates an issue tagged for the next L10.

Rocks roll up into the V/TO 1-year plan, and individual rocks resolve as the quarter ends. Don't ship rocks halfway — either it's done or it rolls into next quarter as a new rock with a new scope.`,
        bullets: [
          "3-7 per quarter, never more — if it isn't on the list, it isn't a priority",
          "One owner per rock, no committees",
          "Break into 3-5 milestones — that's how the AI tracks velocity",
          "Status auto-updates from milestone completion",
          "At end of quarter: ship, kill, or re-scope. Don't drag.",
        ],
        related: [
          { label: "ROCKS BOARD", href: "/rocks" },
          { label: "VTO", href: "/vto" },
        ],
        tags: ["rocks", "priorities", "quarterly", "smart goals", "milestones"],
      },
    ],
  },
  {
    id: "scorecard",
    label: "Scorecard",
    eyebrow: "02 · WEEKLY PULSE",
    sections: [
      {
        id: "scorecard",
        label: "How the scorecard works",
        title: "SCORECARD",
        lede: "3-7 numbers that tell you, every Monday, whether the company is on track.",
        body: `The scorecard is the company's heartbeat. Each row is a metric with an owner, a target, a direction (≥ or ≤), and 13 columns of weekly values. Green = hit target, red = missed.

Two reds in a row on the same metric auto-creates an issue for the next L10. The pattern engine looks for correlated drops (e.g. discovery calls red → MRR red 6 weeks later) and surfaces them in the dashboard.

Pick metrics that are leading indicators where possible — discovery calls booked, qualified leads, on-time rate. Lagging indicators (revenue, churn) belong on the scorecard too, but you can't act on them as quickly.`,
        bullets: [
          "3-7 metrics — fewer than 3 means you're not measuring; more than 7 means you can't focus",
          "Each metric has an owner, target, and direction",
          "Two consecutive red weeks = auto-issue",
          "Click any cell to edit · Enter saves, Esc cancels",
          "Rolling 13-week view; older weeks accessible via the archive",
        ],
        related: [{ label: "SCORECARD", href: "/scorecard" }],
        tags: ["scorecard", "kpi", "metrics", "weekly", "measurables"],
      },
    ],
  },
  {
    id: "issues",
    label: "Issues",
    eyebrow: "03 · IDS QUEUE",
    sections: [
      {
        id: "issues",
        label: "How issues work",
        title: "IDS — IDENTIFY, DISCUSS, SOLVE",
        lede: "The team's running list of bottlenecks, decisions, and risks.",
        body: `An issue is anything in the way: a bottleneck, a question, a decision, a risk. Drop it into the Issues queue and it gets worked through during the L10 meeting using the IDS protocol — identify the real issue, discuss it, solve it.

Issues come from three sources: the team logs them manually, the scorecard auto-creates them on two-week reds, and the AI Implementer creates them when it detects patterns (handoff context missing, rock velocity dropping, etc).

Resolution is one of: convert to a rock, convert to a task, log a decision, archive (no action needed), or escalate to the next L10. Solved issues stay in the archive for pattern analysis.`,
        bullets: [
          "Quick-add at the bottom of the issues list",
          "Drag to rank — top 3 surface in the L10",
          "Severity: critical → high → normal → low",
          "Resolution path: rock, task, decision, headline, archive",
          "Pinned-for-L10 issues get worked through every Monday",
        ],
        related: [
          { label: "ISSUES", href: "/issues" },
          { label: "L10", href: "/l10" },
        ],
        tags: ["issues", "ids", "identify", "discuss", "solve", "bottleneck"],
      },
    ],
  },
  {
    id: "vto",
    label: "V/TO",
    eyebrow: "04 · VISION & TRACTION",
    sections: [
      {
        id: "vto",
        label: "Vision & Traction Organizer",
        title: "V/TO",
        lede: "Where you write down what the company is and where it's going.",
        body: `The V/TO is the company's living document — core values, core focus (purpose + niche), 10-year target, marketing strategy, 3-year picture, 1-year plan, and quarterly rocks. It's the answer to every "what should we do?" conversation.

Update it quarterly during planning, not weekly. The V/TO is a long-cycle artifact; the scorecard, issues, and L10 handle the short cycle.

Every team member can read the V/TO; only masters can edit it. The AI uses it as context for every nudge — when it sees a task or rock that doesn't ladder up to the 1-year plan, it flags it.`,
        bullets: [
          "Core Values — 3-7 short rules of behaviour",
          "Core Focus — purpose (why) and niche (what you sell)",
          "10-Year Target — one audacious, concrete, numeric outcome",
          "Marketing Strategy — target market, three uniques, proven process, guarantee",
          "3-Year Picture — milestones halfway to the 10-year target",
          "1-Year Plan — outcomes, revenue/margin/measurables, top 3-7 goals",
        ],
        related: [{ label: "VTO", href: "/vto" }],
        tags: ["vto", "vision", "traction", "values", "ten year target", "core focus"],
      },
    ],
  },
  {
    id: "l10",
    label: "L10",
    eyebrow: "05 · WEEKLY MEETING",
    sections: [
      {
        id: "l10",
        label: "The level-10 meeting",
        title: "L10",
        lede: "90 minutes, same time every week, fixed agenda.",
        body: `The L10 is the leadership team's weekly operating meeting. The agenda is fixed: segue (5m) → scorecard (5m) → rock review (5m) → headlines (5m) → todos (5m) → issues (60m) → conclude (5m). 90 minutes, same time every week.

Orage Core walks you through the agenda automatically. Each section pulls live from the corresponding module — scorecard cells, current rocks, last week's todos, the issues queue. The bulk of the meeting is issues: the team works through the top 3 using IDS.

Run rate matters: if the meeting runs more than 90 minutes, an issue gets created automatically about the meeting itself. If a rock or metric stays red 2+ weeks, the AI Implementer adds it to the agenda before you walk in.`,
        bullets: [
          "Same day, same time, 90 minutes — discipline beats genius",
          "Cell-level limits keep the meeting on rails",
          "Rate the meeting at the end — drives meeting-quality issues over time",
          "Conclude = recap todos, message-to-organization, rate",
        ],
        related: [{ label: "L10", href: "/l10" }],
        tags: ["l10", "level 10", "meeting", "weekly", "agenda"],
      },
    ],
  },
  {
    id: "people",
    label: "People",
    eyebrow: "06 · PEOPLE & SEATS",
    sections: [
      {
        id: "people",
        label: "Right people, right seat",
        title: "PEOPLE",
        lede: "Profiles, GWC, 1:1 history, owned rocks. The accountability chart is one click away.",
        body: `The People module holds every team member's profile: title, seat roles, manager, GWC (gets it / wants it / capacity), 1:1 history, owned rocks, and behavioural signals (task on-time rate, rock velocity, handoff quality).

GWC is rated quarterly. If someone slips to "no" on any of the three, they're either re-coached, moved to a different seat, or out within 90 days — the framework is intentionally short-cycle.

1:1s are tracked here too: a manager-report pair has a cadence (weekly, bi-weekly, monthly), the next scheduled time, and a running thread of agenda + notes. Cancelled 1:1s show up in the dashboard for the manager to repair.`,
        bullets: [
          "GWC = gets-it · wants-it · capacity. Rated quarterly.",
          "Owned rocks visible from the profile page",
          "Behavioural signals roll up from tasks + scorecard automatically",
          "1:1 cadence is set per pair, not per company",
          "Org chart at /orgchart shows the seats and who's in them",
        ],
        related: [
          { label: "PEOPLE", href: "/people" },
          { label: "ORG CHART", href: "/orgchart" },
        ],
        tags: ["people", "team", "gwc", "1:1", "accountability chart", "seat"],
      },
    ],
  },
  {
    id: "tasks",
    label: "Tasks",
    eyebrow: "07 · TODAY",
    sections: [
      {
        id: "tasks",
        label: "Tasks vs Rocks",
        title: "TASKS",
        lede: "Day-to-day execution. Rocks are quarterly; tasks are days/weeks.",
        body: `Tasks are the day-to-day. Each task has an owner, a due date, a priority, and an optional rock link. Most tasks ladder up to a rock; a few stand alone (admin, ad-hoc, support).

The L10 generates tasks automatically — every "todo" coming out of issues becomes a task assigned to someone with a one-week due date by default. The AI Implementer can also create tasks via chat ("@ai create a task to follow up with Quintessa by Friday").

The dashboard shows your top 5 priorities for the next 3 days. Tasks without due dates show up in their own section — they're either real work that needs scheduling, or they should be archived.`,
        bullets: [
          "Owner + due date are required; priority is optional",
          "Link a task to a rock to make rock progress visible from the task",
          "L10 todos auto-create tasks with a 7-day due date",
          "Bulk: shift-click to multi-select, then assign / due-date / archive",
        ],
        related: [
          { label: "TASKS", href: "/tasks" },
          { label: "DASHBOARD", href: "/" },
        ],
        tags: ["tasks", "todo", "today", "priorities"],
      },
    ],
  },
  {
    id: "notes",
    label: "Notes",
    eyebrow: "08 · DOCS & CONTEXT",
    sections: [
      {
        id: "notes",
        label: "Notes & docs",
        title: "NOTES",
        lede: "Block-based docs, optionally attached to a rock, meeting, or person.",
        body: `Notes is the documentation layer. Each note is a block-based doc — paragraphs, headings, lists, code, callouts. Type / for the slash menu.

Notes attach to a parent: a rock, a meeting, a person, or stand alone (personal). Attached notes show up automatically in the parent's drawer — open a rock, see all notes about it.

@-mentions link people, ↗-mentions link rocks. Backlinks are visible at the top of every note. Auto-saved on every keystroke.`,
        bullets: [
          "Slash-menu commands for headings, lists, code, callouts",
          "@person mentions notify the person and link the note to their profile",
          "↗rock mentions link the note to a rock and show up in its drawer",
          "Backlinks at the top of each note show what links here",
        ],
        related: [{ label: "NOTES", href: "/notes" }],
        tags: ["notes", "docs", "documentation", "knowledge"],
      },
    ],
  },
  {
    id: "ai",
    label: "AI Implementer",
    eyebrow: "09 · CHIEF OF STAFF",
    sections: [
      {
        id: "ai-implementer",
        label: "What the AI does",
        title: "AI IMPLEMENTER",
        lede: "Reads everything. Nudges drift. Creates work on your behalf.",
        body: `The Implementer is the AI chief of staff. It has read access to your rocks, tasks, scorecard, issues, V/TO, and people, and write access to create tasks and issues on your behalf.

You can talk to it from anywhere — the gold orb in the bottom-right, the chat dock, or the /ai page. Ask it questions ("how is Brooklyn doing this quarter?"), give it work ("create a task for Baruc to test the intake agent by Friday"), or have it surface patterns ("what should I focus on this week?").

It also runs autonomously: every Monday morning it generates a briefing of the week ahead, and at any point it can create issues from detected drift (rock velocity, scorecard reds, handoff gaps).`,
        bullets: [
          "Read tools: rocks, tasks, scorecard, issues, V/TO",
          "Write tools: create_task, create_issue",
          "Autonomous: weekly briefings, drift detection, pattern alerts",
          "Confidential: all data stays inside your tenant",
          "Open in chat dock (bottom-right) or full page at /ai",
        ],
        related: [{ label: "AI", href: "/ai" }],
        tags: ["ai", "implementer", "chief of staff", "chat", "automation"],
      },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    eyebrow: "10 · MASTER & SETTINGS",
    sections: [
      {
        id: "settings",
        label: "Settings & permissions",
        title: "SETTINGS",
        lede: "Workspace identity, members, integrations, AI config, billing.",
        body: `Settings is split into Workspace (identity, brand, EOS defaults), Members (invite + role), Integrations (Slack, Google, Stripe), AI (system prompt, tools allowlist), Notifications, Security, and Danger Zone (export, archive, delete).

Roles: master (full edit, can edit V/TO, billing, members), member (read everything, edit their own rocks/tasks), guest (read-only, scoped to specific pages).

The Master Banner appears on /admin for users with the master role across all tenants. It's the Bird's Eye view — every tenant, every health flag, every audit event.`,
        bullets: [
          "Workspace · identity, brand colour, time zone, EOS defaults",
          "Members · invite by email, assign role, deactivate",
          "Integrations · Slack, Google, Stripe, custom webhooks",
          "AI · system prompt overrides, tools allowlist, retention",
          "Danger Zone · tenant export, archive, hard delete",
        ],
        related: [
          { label: "SETTINGS", href: "/settings" },
          { label: "MEMBERS", href: "/settings/members" },
          { label: "ADMIN", href: "/admin" },
        ],
        tags: ["admin", "settings", "members", "permissions", "roles", "master"],
      },
    ],
  },
]

/**
 * Compact text version of the manual, used as system-prompt context for the
 * AI Implementer. Keeps the digest under ~3KB so it fits cheaply alongside
 * the existing system prompt without bloating every chat turn.
 */
export function manualDigest(): string {
  const lines: string[] = ["ORAGE CORE MANUAL DIGEST"]
  for (const group of MANUAL) {
    for (const section of group.sections) {
      lines.push("")
      lines.push(`### ${section.title}`)
      if (section.lede) lines.push(section.lede)
      // First two sentences of body for each section
      const summary = section.body
        .replace(/\n+/g, " ")
        .split(". ")
        .slice(0, 2)
        .join(". ")
      lines.push(summary + (summary.endsWith(".") ? "" : "."))
      if (section.bullets?.length) {
        for (const b of section.bullets.slice(0, 3)) {
          lines.push(`- ${b}`)
        }
      }
    }
  }
  return lines.join("\n")
}

/** Flat list for search indexing. */
export function flatSections(): (ManualSection & {
  groupLabel: string
  groupId: string
})[] {
  const out: (ManualSection & { groupLabel: string; groupId: string })[] = []
  for (const g of MANUAL) {
    for (const s of g.sections) {
      out.push({ ...s, groupLabel: g.label, groupId: g.id })
    }
  }
  return out
}
