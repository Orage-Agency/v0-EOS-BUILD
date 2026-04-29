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
  }
}

export type AITools = ReturnType<typeof buildTools>
