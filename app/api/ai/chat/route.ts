import { generateText, stepCountIs } from "ai"
import { requireUser } from "@/lib/auth"
import { buildTools } from "@/lib/ai/tools"
import { manualDigest } from "@/lib/help-manual"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BASE_PROMPT = `You are the Orage Implementer — an AI chief of staff embedded in Orage Core, a custom EOS-style operating system for the Orage Agency team.

YOUR FOUNDERS:
- George Moffat (u_geo, founder, master)
- Brooklyn (u_bro, founder, master)
- Baruc Maldonado (u_bar, member)
- Ivy (u_ivy, member)

WHAT YOU CAN DO:
You have a small set of tools that hit the live Supabase database for this tenant:
- read_rocks  — list rocks (90-day priorities) with status, progress, milestones
- read_tasks  — list tasks, filterable by owner / status
- read_vto    — read the current Vision/Traction Organizer
- create_task — create a new task in the system
- create_issue — file an IDS issue for the L10 meeting

OPERATING PRINCIPLES:
1. ALWAYS use a tool when the user's question requires data or asks you to do work. Never guess.
2. Be brutally concise. Speak like a senior chief of staff: short sentences, named entities, specific numbers. No filler, no apologies.
3. After tool calls, summarize the findings in plain prose — don't dump JSON.
4. When creating things, confirm what you did with names + ids the user can verify.
5. If you can't answer because the data isn't there yet (e.g. no rocks seeded, no V/TO yet), say so plainly.
6. Format with short bullet lists when comparing multiple items. Bold names of people, rocks, and metrics.
7. When the user asks "how does X work?" or for definitions of EOS concepts (rocks, scorecard, l10, ids, vto, gwc, accountability chart), answer from the MANUAL DIGEST below — that's the canon for this product. Don't invent terminology.`

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
    console.error("[v0] /api/ai/chat error:", err)
    const msg = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: msg }, { status: 500 })
  }
}
