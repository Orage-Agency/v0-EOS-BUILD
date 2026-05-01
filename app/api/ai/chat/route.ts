import { generateText, stepCountIs } from "ai"
import { requireUser } from "@/lib/auth"
import { buildTools } from "@/lib/ai/tools"
import { manualDigest } from "@/lib/help-manual"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BASE_PROMPT = `You are the Orage Implementer — an AI chief of staff embedded in Orage Core, a custom EOS-style operating system for the Orage Agency team.

WHAT YOU CAN DO:
You have a set of tools that hit the live Supabase database for the current tenant. ALWAYS use them when the user asks about data — never guess, never apologize for not knowing without trying.

READ tools:
- read_rocks      — list rocks (90-day priorities) with status, progress, milestones
- read_tasks      — list tasks, filterable by owner / status
- read_issues     — list open IDS issues
- read_scorecard  — list metrics + recent weekly entries
- read_vto        — read the current Vision/Traction Organizer
- read_people     — list real workspace members (use this to resolve names → ids)
- read_notes      — list recent notes, optionally filtered by title substring
- list_users      — list demo users (legacy; prefer read_people)

WRITE tools:
- create_task        — create a new task
- create_issue       — file an IDS issue
- update_task        — change status / priority / due date / owner of a task
- update_rock_status — change a rock's status (on_track, at_risk, off_track, done, in_progress)

OPERATING PRINCIPLES:
1. ALWAYS use a tool when the user's question requires data or asks you to do work. If you skip the tool, you will be wrong.
2. When the user names a person ("assign to Brooklyn"), call read_people first to find their real user id, then use that id.
3. Be brutally concise. Senior chief of staff voice: short sentences, named entities, specific numbers. No filler.
4. After tool calls, summarize in plain prose — don't dump JSON.
5. When creating or updating things, confirm what you did with names + ids the user can verify.
6. If a tool returns empty (e.g. no rocks yet, no V/TO yet), say so plainly. Don't pretend data exists.
7. Format with short bullet lists when comparing multiple items. Bold names of people, rocks, and metrics.
8. For "how does X work?" or EOS definitions (rocks, scorecard, l10, ids, vto, gwc, accountability chart), answer from the MANUAL DIGEST below.`

const SYSTEM_PROMPT = `${BASE_PROMPT}

---
${manualDigest()}`

export async function POST(req: Request) {
  try {
    const { message, history, workspaceSlug } = (await req.json()) as {
      message: string
      history?: { role: "user" | "assistant"; content: string }[]
      workspaceSlug?: string
    }
    if (!message || typeof message !== "string") {
      return Response.json({ error: "Missing message" }, { status: 400 })
    }
    if (!workspaceSlug) {
      return Response.json({ error: "Missing workspaceSlug" }, { status: 400 })
    }

    // requireUser asserts the caller is authenticated AND a member of the
    // workspace identified by `workspaceSlug` — it redirects on failure, so
    // by the time we have `me`, the tenant scoping below is already safe.
    const me = await requireUser(workspaceSlug)

    const tools = buildTools({ tenantId: me.workspaceId, userId: me.id })

    const result = await generateText({
      model: "openai/gpt-5-mini",
      system: SYSTEM_PROMPT,
      messages: [
        ...(history ?? []).map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: "user" as const, content: message },
      ],
      tools,
      stopWhen: stepCountIs(6),
    })

    // Walk the steps to surface tool calls for the UI.
    const toolCalls: {
      id: string
      name: string
      args: Record<string, unknown>
      result: unknown
    }[] = []
    for (const step of result.steps ?? []) {
      for (const call of step.toolCalls ?? []) {
        const matched = step.toolResults?.find(
          (r) => r.toolCallId === call.toolCallId,
        )
        toolCalls.push({
          id: call.toolCallId,
          name: call.toolName,
          args: (call.input as Record<string, unknown>) ?? {},
          result: matched?.output,
        })
      }
    }

    return Response.json({
      text: result.text,
      toolCalls,
    })
  } catch (err) {
    // requireUser throws a NEXT_REDIRECT to push the caller to /login
    // when there's no session. Don't swallow it — let Next handle it.
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err
    console.error("[v0] /api/ai/chat error:", err)
    const raw = err instanceof Error ? err.message : "Unknown error"
    // Translate the most common provider/credential failures into messages
    // the user can act on. The AI SDK gateway surfaces these as plain
    // "AI_APICallError" — without a hint, the chat just says "Sorry…".
    const lower = raw.toLowerCase()
    let hint: string | null = null
    if (lower.includes("api key") || lower.includes("unauthorized") || lower.includes("401")) {
      hint =
        "AI provider rejected the request. Check that AI_GATEWAY_API_KEY (or OPENAI_API_KEY) is set in the deployment environment."
    } else if (lower.includes("rate limit") || lower.includes("429")) {
      hint = "AI provider rate-limited the request. Wait a moment and try again."
    } else if (lower.includes("model") && (lower.includes("not found") || lower.includes("does not exist"))) {
      hint = "Configured model isn't available to this account. Update app/api/ai/chat/route.ts model id."
    }
    return Response.json({ error: raw, hint }, { status: 500 })
  }
}
