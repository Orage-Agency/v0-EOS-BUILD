import "server-only"
import { tool } from "ai"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { ROCKS, TASKS, USERS } from "@/lib/mock-data"
import { SEED_ISSUES } from "@/lib/issues-seed"

// All tools are scoped to a single tenant. The route handler resolves the
// caller's tenantId from getCurrentUser() and binds it via this factory so
// the model never has the chance to escape its tenant.
//
// Read-tool source-of-truth (P0-5): rocks/tasks/issues read the same demo
// dataset the module pages and dashboard render — `lib/mock-data` plus
// `lib/issues-seed` — and merge any AI-created Supabase rows on top so the
// AI sees its own writes immediately. Previously read_rocks queried only
// Supabase (which was empty) and returned [] for every prompt.

export function buildTools({
  tenantId,
  userId,
}: {
  tenantId: string
  userId: string
}) {
  const sb = supabaseAdmin()

  // Confirm `ownerId` (when supplied by the model) is an active member of
  // the current workspace before we let it be written to a row's owner_id
  // column. Demo user ids (u_geo etc.) are accepted — they map to mock
  // users surfaced via list_users, not real DB rows. Without this guard
  // the AI could be coaxed into reassigning work to a UUID from a
  // different workspace if the id leaked.
  async function ownerIdAllowed(ownerId: string | null | undefined): Promise<boolean> {
    if (!ownerId) return true
    if (ownerId.startsWith("u_")) return true
    if (ownerId === userId) return true
    const { data } = await sb
      .from("workspace_memberships")
      .select("user_id")
      .eq("workspace_id", tenantId)
      .eq("user_id", ownerId)
      .eq("status", "active")
      .maybeSingle()
    return Boolean(data)
  }

  return {
    read_rocks: tool({
      description:
        "List the company's rocks (90-day priorities) for the current tenant. Returns id, title, status (on_track/at_risk/off_track/in_progress/done), progress %, owner_id, due_date, tag, milestone count. Use this when the user asks about rocks, priorities, what's at risk, or who owns what.",
      inputSchema: z.object({
        status: z
          .enum(["on_track", "at_risk", "off_track", "any"])
          .nullable()
          .describe("Optional status filter, or 'any' for everything"),
        ownerId: z
          .string()
          .nullable()
          .describe("Optional owner user id (e.g. u_geo)"),
      }),
      execute: async ({ status, ownerId }) => {
        // 1. Start with the demo rocks so the AI matches the UI.
        let rocks = ROCKS.map((r) => ({
          id: r.id,
          title: r.title,
          status: r.status,
          progress: r.progress,
          owner_id: r.owner,
          due_date: r.due,
          quarter: "Q2 2026",
          tag: r.tag,
          milestone_count: 0,
        }))

        // 2. Merge any AI-created rocks from Supabase (best effort).
        try {
          const { data } = await sb
            .from("rocks")
            .select(
              "id, title, status, progress, owner_id, due_date, quarter, tag",
            )
            .eq("tenant_id", tenantId)
          for (const r of data ?? []) {
            if (rocks.some((existing) => existing.id === r.id)) continue
            rocks.push({
              id: r.id as string,
              title: r.title as string,
              status: r.status as (typeof rocks)[number]["status"],
              progress: (r.progress as number) ?? 0,
              owner_id: (r.owner_id as string) ?? "",
              due_date: (r.due_date as string) ?? "",
              quarter: (r.quarter as string) ?? "",
              tag: (r.tag as string) ?? "",
              milestone_count: 0,
            })
          }
        } catch {
          /* Supabase unavailable — fall back to mocks only. */
        }

        if (status && status !== "any") {
          rocks = rocks.filter((r) => r.status === status)
        }
        if (ownerId) {
          rocks = rocks.filter((r) => r.owner_id === ownerId)
        }
        return { rocks }
      },
    }),

    read_tasks: tool({
      description:
        "List tasks for the current tenant. Filter by owner, status, or limit. Returns id, title, owner_id, status, priority, due_date, parent_rock_id.",
      inputSchema: z.object({
        ownerId: z.string().nullable().describe("Optional owner user id"),
        status: z
          .enum(["open", "in_progress", "done", "cancelled", "any"])
          .nullable(),
        limit: z.number().int().min(1).max(50).nullable(),
      }),
      execute: async ({ ownerId, status, limit }) => {
        let tasks = TASKS.map((t) => ({
          id: t.id,
          title: t.title,
          owner_id: t.owner,
          status: t.status,
          priority: t.priority,
          due_date: t.due,
          parent_rock_id: t.rockId ?? null,
        }))

        try {
          const { data } = await sb
            .from("tasks")
            .select(
              "id, title, owner_id, status, priority, due_date, parent_rock_id",
            )
            .eq("tenant_id", tenantId)
          for (const row of data ?? []) {
            if (tasks.some((existing) => existing.id === row.id)) continue
            tasks.push({
              id: row.id as string,
              title: row.title as string,
              owner_id: (row.owner_id as string) ?? "",
              status: row.status as (typeof tasks)[number]["status"],
              priority: row.priority as (typeof tasks)[number]["priority"],
              due_date: (row.due_date as string) ?? "",
              parent_rock_id: (row.parent_rock_id as string) ?? null,
            })
          }
        } catch {
          /* Supabase unavailable — fall back to mocks only. */
        }

        if (ownerId) tasks = tasks.filter((t) => t.owner_id === ownerId)
        if (status && status !== "any") {
          tasks = tasks.filter((t) => t.status === status)
        }
        const cap = limit ?? 25
        return { tasks: tasks.slice(0, cap) }
      },
    }),

    read_issues: tool({
      description:
        "List the open IDS issues for the current tenant from the live `issues` table. Returns id, title, severity, stage, owner_id, status. Use this when the user asks 'what's on the IDS list' or 'what's blocking us'.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(50).nullable(),
        includeSolved: z.boolean().nullable(),
      }),
      execute: async ({ limit, includeSolved }) => {
        let q = sb
          .from("issues")
          .select("id, title, severity, stage, owner_id, status, rank, linked_rock_id, created_at")
          .eq("tenant_id", tenantId)
          .order("rank", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(limit ?? 25)
        if (!includeSolved) q = q.neq("status", "solved")
        const { data, error } = await q
        if (error) {
          // Fall back to mock seed if the live table errors so the agent
          // can still describe what IDS looks like.
          const issues = SEED_ISSUES.filter((i) => i.queue === "open")
            .sort((a, b) => a.rank - b.rank)
            .slice(0, limit ?? 25)
            .map((i) => ({
              id: i.id,
              title: i.title,
              severity: i.severity,
              stage: i.stage,
              owner_id: i.ownerId,
              rank: i.rank,
              linked_rock_id: i.linkedRockId ?? null,
              status: "open" as const,
            }))
          return { issues, note: "fallback: live issues query failed" }
        }
        return { issues: data ?? [] }
      },
    }),

    read_vto: tool({
      description:
        "Read the current Vision/Traction Organizer (V/TO) for the tenant. Includes 10-year target, 3-year picture, 1-year plan, quarterly rocks, core values, and core focus.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const { data, error } = await sb
            .from("vto_documents")
            .select("version, payload, created_at")
            .eq("tenant_id", tenantId)
            .eq("is_current", true)
            .order("version", { ascending: false })
            .limit(1)
            .maybeSingle()
          if (error) return { error: error.message, vto: null }
          if (!data) return { vto: null, note: "No V/TO has been created yet." }
          return { vto: data.payload, version: data.version }
        } catch (e) {
          return {
            vto: null,
            note:
              "V/TO is not available right now. " +
              (e instanceof Error ? e.message : ""),
          }
        }
      },
    }),

    list_users: tool({
      description:
        "List the demo users / teammates so the model can resolve names like 'George' or 'Baruc' to ids before assigning tasks or issues. Returns id, name, email, role.",
      inputSchema: z.object({}),
      execute: async () => {
        return {
          users: USERS.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
          })),
        }
      },
    }),

    create_task: tool({
      description:
        "Create a new task in the current tenant. Use this whenever the user asks you to add, create, or remind them about a task. Always include a clear title; due_date is optional ISO date.",
      inputSchema: z.object({
        title: z.string().min(2),
        ownerId: z
          .string()
          .nullable()
          .describe("User id to assign; defaults to caller"),
        priority: z.enum(["high", "med", "low"]).nullable(),
        dueDate: z
          .string()
          .nullable()
          .describe("ISO date or null. e.g. 2026-04-30"),
        parentRockId: z.string().nullable(),
      }),
      execute: async ({ title, ownerId, priority, dueDate, parentRockId }) => {
        if (!(await ownerIdAllowed(ownerId))) {
          return { error: "ownerId is not a member of this workspace" }
        }
        const { data, error } = await sb
          .from("tasks")
          .insert({
            tenant_id: tenantId,
            title,
            owner_id: ownerId ?? userId,
            priority: priority ?? "med",
            due_date: dueDate ?? null,
            parent_rock_id: parentRockId ?? null,
            status: "open",
            created_by: userId,
          })
          .select("id, title, owner_id, due_date, priority")
          .single()
        if (error) return { error: error.message }
        return { task: data, created: true }
      },
    }),

    create_issue: tool({
      description:
        "Create a new IDS issue for the L10 issues list. Use this when the user surfaces a problem or blocker that should be discussed. Returns the new issue id.",
      inputSchema: z.object({
        title: z.string().min(2),
        description: z.string().nullable(),
        ownerId: z.string().nullable(),
        rank: z.number().int().nullable(),
      }),
      execute: async ({ title, description, ownerId, rank }) => {
        if (!(await ownerIdAllowed(ownerId))) {
          return { error: "ownerId is not a member of this workspace" }
        }
        const { data, error } = await sb
          .from("issues")
          .insert({
            tenant_id: tenantId,
            title,
            description: description ?? null,
            owner_id: ownerId ?? userId,
            rank: rank ?? null,
            status: "open",
            created_by: userId,
          })
          .select("id, title, rank")
          .single()
        if (error) return { error: error.message }
        return { issue: data, created: true }
      },
    }),

    update_task: tool({
      description:
        "Update an existing task's status, priority, due date, or owner. Use when the user asks to mark something done, reassign, change priority, or reschedule.",
      inputSchema: z.object({
        id: z.string().describe("The task id (uuid)"),
        status: z.enum(["open", "in_progress", "done", "cancelled"]).nullable(),
        priority: z.enum(["high", "med", "low"]).nullable(),
        dueDate: z.string().nullable().describe("YYYY-MM-DD or null to clear"),
        ownerId: z.string().nullable(),
      }),
      execute: async ({ id, status, priority, dueDate, ownerId }) => {
        if (ownerId !== null && !(await ownerIdAllowed(ownerId))) {
          return { error: "ownerId is not a member of this workspace" }
        }
        const patch: Record<string, unknown> = {}
        if (status !== null) {
          patch.status = status
          patch.completed_at = status === "done" ? new Date().toISOString() : null
        }
        if (priority !== null) patch.priority = priority
        if (dueDate !== null) patch.due_date = dueDate
        if (ownerId !== null) patch.owner_id = ownerId
        if (Object.keys(patch).length === 0) {
          return { error: "Nothing to update — provide status, priority, dueDate, or ownerId." }
        }
        const { data, error } = await sb
          .from("tasks")
          .update(patch)
          .eq("id", id)
          .eq("tenant_id", tenantId)
          .select("id, title, status, priority, due_date, owner_id")
          .single()
        if (error) return { error: error.message }
        return { task: data, updated: true }
      },
    }),

    update_rock_status: tool({
      description:
        "Update a rock's status (on_track / at_risk / off_track / in_progress / done). Use when the user reports a change in confidence on a rock.",
      inputSchema: z.object({
        id: z.string().describe("The rock id (uuid)"),
        status: z.enum(["on_track", "at_risk", "off_track", "in_progress", "done"]),
      }),
      execute: async ({ id, status }) => {
        const completedAt = status === "done" ? new Date().toISOString() : null
        const { data, error } = await sb
          .from("rocks")
          .update({ status, completed_at: completedAt, updated_at: new Date().toISOString() })
          .eq("id", id)
          .eq("tenant_id", tenantId)
          .select("id, title, status, progress")
          .single()
        if (error) return { error: error.message }
        return { rock: data, updated: true }
      },
    }),

    read_scorecard: tool({
      description:
        "Read the scorecard metrics + the most recent weekly entries for the tenant. Use when the user asks 'show me the scorecard', 'how are our numbers', or about a specific metric.",
      inputSchema: z.object({
        weeks: z.number().int().min(1).max(13).nullable().describe("How many recent weeks to include; default 4"),
      }),
      execute: async ({ weeks }) => {
        const limit = weeks ?? 4
        const { data: metrics, error } = await sb
          .from("scorecard_metrics")
          .select("id, name, owner_id, goal_value, goal_op, unit, frequency, archived_at, display_order")
          .eq("tenant_id", tenantId)
          .is("archived_at", null)
          .order("display_order", { ascending: true })
        if (error) return { error: error.message, metrics: [] }
        const ids = (metrics ?? []).map((m) => m.id)
        if (ids.length === 0) return { metrics: [], entries: [] }
        const { data: entries } = await sb
          .from("scorecard_entries")
          .select("id, metric_id, period_start, value, status_override")
          .in("metric_id", ids)
          .order("period_start", { ascending: false })
          .limit(ids.length * limit)
        return { metrics, entries: entries ?? [] }
      },
    }),

    read_people: tool({
      description:
        "List the active members of the workspace. Returns id, name, email, role. Use when the user asks 'who is on the team' or to resolve a name like 'Brooklyn' to a real user id.",
      inputSchema: z.object({}),
      execute: async () => {
        // Two-step query — avoids depending on a Supabase FK alias between
        // workspace_memberships and profiles, which has been flaky in prod.
        const { data: memberships, error: mErr } = await sb
          .from("workspace_memberships")
          .select("user_id, role")
          .eq("workspace_id", tenantId)
          .eq("status", "active")
        if (mErr) return { error: `workspace_memberships: ${mErr.message}`, people: [] }
        const rows = (memberships ?? []) as Array<{ user_id: string; role: string }>
        if (rows.length === 0) return { people: [] }
        const ids = rows.map((r) => r.user_id)
        const { data: profiles, error: pErr } = await sb
          .from("profiles")
          .select("id, email, full_name")
          .in("id", ids)
        if (pErr) return { error: `profiles: ${pErr.message}`, people: [] }
        const byId = new Map(
          ((profiles ?? []) as Array<{ id: string; email: string; full_name: string | null }>).map(
            (p) => [p.id, p],
          ),
        )
        const people = rows.flatMap((r) => {
          const p = byId.get(r.user_id)
          if (!p) return []
          return [
            {
              id: p.id,
              name: p.full_name ?? p.email,
              email: p.email,
              role: r.role,
            },
          ]
        })
        return { people }
      },
    }),

    read_notes: tool({
      description:
        "Read the most recently updated notes for the tenant. Returns id, title, updated_at. Use when the user asks 'what notes do I have' or 'find the note about X'.",
      inputSchema: z.object({
        query: z.string().nullable().describe("Optional case-insensitive title substring to filter by"),
        limit: z.number().int().min(1).max(50).nullable(),
      }),
      execute: async ({ query, limit }) => {
        let q = sb
          .from("notes")
          .select("id, title, updated_at")
          .eq("tenant_id", tenantId)
          .order("updated_at", { ascending: false })
          .limit(limit ?? 25)
        if (query) q = q.ilike("title", `%${query}%`)
        const { data, error } = await q
        if (error) return { error: error.message, notes: [] }
        return { notes: data ?? [] }
      },
    }),

    create_rock: tool({
      description:
        "Create a new 90-day Rock for the current tenant. Use this when the user wants to commit to a new quarterly priority. Always include a clear title and a target due date.",
      inputSchema: z.object({
        title: z.string().min(2),
        description: z.string().nullable().describe("The measurable outcome / definition of done"),
        ownerId: z.string().nullable().describe("User id to own; defaults to caller"),
        dueDate: z.string().describe("YYYY-MM-DD target completion date"),
        quarter: z.string().nullable().describe("e.g. Q2-2026"),
        tag: z.string().nullable().describe("Department/area tag, e.g. SALES, PRODUCT"),
      }),
      execute: async ({ title, description, ownerId, dueDate, quarter, tag }) => {
        if (!(await ownerIdAllowed(ownerId))) {
          return { error: "ownerId is not a member of this workspace" }
        }
        const { data, error } = await sb
          .from("rocks")
          .insert({
            tenant_id: tenantId,
            title,
            description: description ?? null,
            owner_id: ownerId ?? userId,
            quarter: quarter ?? "Q2-2026",
            due_date: dueDate,
            status: "in_progress",
            progress: 0,
            tag: tag ?? null,
            created_by: userId,
          })
          .select("id, title, owner_id, due_date, quarter, status")
          .single()
        if (error) return { error: error.message }
        return { rock: data, created: true }
      },
    }),

    update_rock: tool({
      description:
        "Update any of a rock's editable fields: title, description, progress (0–100), owner, due date. Use update_rock_status separately for status changes.",
      inputSchema: z.object({
        id: z.string().describe("The rock id (uuid)"),
        title: z.string().nullable(),
        description: z.string().nullable(),
        progress: z.number().int().min(0).max(100).nullable(),
        ownerId: z.string().nullable(),
        dueDate: z.string().nullable().describe("YYYY-MM-DD or null"),
      }),
      execute: async ({ id, title, description, progress, ownerId, dueDate }) => {
        if (ownerId !== null && !(await ownerIdAllowed(ownerId))) {
          return { error: "ownerId is not a member of this workspace" }
        }
        const patch: Record<string, unknown> = {}
        if (title !== null) patch.title = title
        if (description !== null) patch.description = description
        if (progress !== null) patch.progress = progress
        if (ownerId !== null) patch.owner_id = ownerId
        if (dueDate !== null) patch.due_date = dueDate
        if (Object.keys(patch).length === 0) {
          return { error: "Nothing to update — provide at least one field." }
        }
        patch.updated_at = new Date().toISOString()
        const { data, error } = await sb
          .from("rocks")
          .update(patch)
          .eq("id", id)
          .eq("tenant_id", tenantId)
          .select("id, title, owner_id, due_date, status, progress")
          .single()
        if (error) return { error: error.message }
        return { rock: data, updated: true }
      },
    }),

    update_issue: tool({
      description:
        "Update an issue's stage (identify / discuss / solve), status (open / solved), severity, owner, or pin status. Use this to drive an issue through IDS.",
      inputSchema: z.object({
        id: z.string().describe("The issue id (uuid)"),
        stage: z.enum(["identify", "discuss", "solve"]).nullable(),
        status: z.enum(["open", "solved"]).nullable(),
        severity: z.enum(["critical", "high", "normal", "low"]).nullable(),
        ownerId: z.string().nullable(),
        pinnedForL10: z.boolean().nullable(),
      }),
      execute: async ({ id, stage, status, severity, ownerId, pinnedForL10 }) => {
        if (ownerId !== null && !(await ownerIdAllowed(ownerId))) {
          return { error: "ownerId is not a member of this workspace" }
        }
        const patch: Record<string, unknown> = {}
        if (stage !== null) patch.stage = stage
        if (status !== null) {
          patch.status = status
          patch.solved_at = status === "solved" ? new Date().toISOString() : null
        }
        if (severity !== null) patch.severity = severity
        if (ownerId !== null) patch.owner_id = ownerId
        if (pinnedForL10 !== null) patch.pinned_for_l10 = pinnedForL10
        if (Object.keys(patch).length === 0) {
          return { error: "Nothing to update." }
        }
        const { data, error } = await sb
          .from("issues")
          .update(patch)
          .eq("id", id)
          .eq("tenant_id", tenantId)
          .select("id, title, stage, status, severity, owner_id")
          .single()
        if (error) return { error: error.message }
        return { issue: data, updated: true }
      },
    }),

    create_note: tool({
      description:
        "Create a quick personal note for the caller. Use when the user says 'remember that X', 'jot down Y', or wants to capture a thought without context-switching to /notes.",
      inputSchema: z.object({
        title: z.string().min(2),
        bodyMarkdown: z.string().nullable().describe("Optional initial markdown body"),
      }),
      execute: async ({ title, bodyMarkdown }) => {
        const blocks = bodyMarkdown
          ? [{ id: "b1", type: "p", html: bodyMarkdown }]
          : [{ id: "b1", type: "p", html: "" }]
        const { data, error } = await sb
          .from("notes")
          .insert({
            tenant_id: tenantId,
            title,
            content: blocks,
            parent_type: "personal",
            parent_id: null,
            folder: "personal",
            created_by: userId,
          })
          .select("id, title")
          .single()
        if (error) return { error: error.message }
        return { note: data, created: true }
      },
    }),

    create_milestone: tool({
      description:
        "Add a milestone to a rock. Milestones are intermediate checkpoints that drive a rock's progress %. Use when the user breaks a rock down ('add a milestone for X'), or when you want to scaffold a rock you just created.",
      inputSchema: z.object({
        rockId: z.string().describe("The rock id (uuid)"),
        title: z.string().min(2),
        dueDate: z
          .string()
          .nullable()
          .describe("YYYY-MM-DD target date, or null"),
      }),
      execute: async ({ rockId, title, dueDate }) => {
        const { data: rock } = await sb
          .from("rocks")
          .select("id")
          .eq("id", rockId)
          .eq("tenant_id", tenantId)
          .maybeSingle()
        if (!rock) return { error: "Rock not found in this workspace" }
        const validDue = dueDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? dueDate : null
        const { data, error } = await sb
          .from("rock_milestones")
          .insert({
            rock_id: rockId,
            title,
            due_date: validDue,
            order_idx: Math.floor(Date.now() / 1000),
            ai_generated: true,
          })
          .select("id, rock_id, title, due_date")
          .single()
        if (error) return { error: error.message }
        return { milestone: data, created: true }
      },
    }),

    toggle_milestone: tool({
      description:
        "Mark a milestone done or not done. Use when the user reports completion of a sub-task on a rock.",
      inputSchema: z.object({
        id: z.string().describe("The milestone id (uuid)"),
        done: z.boolean(),
      }),
      execute: async ({ id, done }) => {
        // Tenant-scope via the parent rock to prevent cross-tenant writes.
        const { data: ms } = await sb
          .from("rock_milestones")
          .select("id, rock_id")
          .eq("id", id)
          .maybeSingle()
        if (!ms) return { error: "Milestone not found" }
        const { data: rock } = await sb
          .from("rocks")
          .select("id")
          .eq("id", ms.rock_id as string)
          .eq("tenant_id", tenantId)
          .maybeSingle()
        if (!rock) return { error: "Forbidden" }
        const { error } = await sb
          .from("rock_milestones")
          .update({ completed_at: done ? new Date().toISOString() : null })
          .eq("id", id)
        if (error) return { error: error.message }
        return { id, done, updated: true }
      },
    }),

    list_milestones: tool({
      description:
        "List the milestones of a single rock. Returns id, title, due_date, done. Use before suggesting a status change for a rock so you have grounded data.",
      inputSchema: z.object({
        rockId: z.string(),
      }),
      execute: async ({ rockId }) => {
        const { data: rock } = await sb
          .from("rocks")
          .select("id")
          .eq("id", rockId)
          .eq("tenant_id", tenantId)
          .maybeSingle()
        if (!rock) return { error: "Rock not found", milestones: [] }
        const { data } = await sb
          .from("rock_milestones")
          .select("id, title, due_date, completed_at, order_idx")
          .eq("rock_id", rockId)
          .order("order_idx", { ascending: true })
        return {
          milestones: ((data ?? []) as Array<{
            id: string
            title: string
            due_date: string | null
            completed_at: string | null
          }>).map((m) => ({
            id: m.id,
            title: m.title,
            due_date: m.due_date,
            done: Boolean(m.completed_at),
          })),
        }
      },
    }),

    delete_task: tool({
      description: "Permanently delete a task by id. Confirm with the user first if it's not obvious they want it gone.",
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }) => {
        const { error } = await sb.from("tasks").delete().eq("id", id).eq("tenant_id", tenantId)
        if (error) return { error: error.message }
        return { deleted: true, id }
      },
    }),

    delete_rock: tool({
      description: "Permanently delete a rock by id. Always confirm first.",
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }) => {
        const { error } = await sb.from("rocks").delete().eq("id", id).eq("tenant_id", tenantId)
        if (error) return { error: error.message }
        return { deleted: true, id }
      },
    }),

    delete_issue: tool({
      description: "Permanently delete an issue by id.",
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }) => {
        const { error } = await sb.from("issues").delete().eq("id", id).eq("tenant_id", tenantId)
        if (error) return { error: error.message }
        return { deleted: true, id }
      },
    }),
  }
}

export type AITools = ReturnType<typeof buildTools>
