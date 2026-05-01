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
        "List the open IDS issues for the current tenant. Returns id, title, severity, stage, owner_id, rank, linkedRockId. Use this when the user asks 'what's on the IDS list' or 'what's blocking us'.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(50).nullable(),
      }),
      execute: async ({ limit }) => {
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
          }))
        return { issues }
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
        "List the active members of the workspace (real users from the workspace_memberships table). Returns id, name, email, role. Use when the user asks 'who is on the team' or to resolve a name like 'Brooklyn' to a real user id.",
      inputSchema: z.object({}),
      execute: async () => {
        const { data, error } = await sb
          .from("workspace_memberships")
          .select("user_id, role, status, profiles:profiles!inner(id, email, full_name)")
          .eq("workspace_id", tenantId)
          .eq("status", "active")
        if (error) return { error: error.message, people: [] }
        type Row = {
          user_id: string
          role: string
          profiles:
            | { id: string; email: string; full_name: string | null }
            | { id: string; email: string; full_name: string | null }[]
            | null
        }
        const people = ((data as unknown as Row[]) ?? []).flatMap((r) => {
          const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
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
  }
}

export type AITools = ReturnType<typeof buildTools>
