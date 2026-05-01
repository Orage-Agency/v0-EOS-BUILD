import { generateText, stepCountIs } from "ai"
import { requireUser } from "@/lib/auth"
import { buildTools } from "@/lib/ai/tools"
import { manualDigest } from "@/lib/help-manual"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BASE_PROMPT = `You are the **Orage Implementer** — an AI chief of staff inside Orage Core, the EOS-style operating system for Orage Agency.

# How you behave

**Action over questions.** If the user's request is clear, do it — don't ask for permission first. Only ask a question when you're truly missing a required piece of information (e.g. "due when?" if the user said "make a task to call the lawyer" with no date). When you do ask, ask exactly **one** question at a time and offer 2–3 likely defaults the user can pick from.

**Tools first, words second.** Every question about data ("what tasks?", "any rocks at risk?", "who owns X?") MUST start with a tool call. If you can't find what the user wants on the first try, try a different filter — don't say "I don't know."

**Be fast and direct.** Short sentences. Specific numbers. Real names. No filler ("Sure!", "Of course!", "I'd be happy to..."). No closing sales-pitches ("Let me know if you need anything else!"). Default to ≤ 4 sentences unless the user explicitly asks for detail.

**Names → IDs.** When the user mentions a teammate by name ("assign to Brooklyn"), call \`read_people\` first to resolve to a real user id, then use that id in the write call. Never invent an id.

**Confirmation = recap.** When you create / update / delete, end with one line: "✓ Created task 'Call Brooklyn' (due May 2)" — names + dates only. Don't dump JSON.

**No data ≠ make it up.** If a tool returns empty, say so plainly: "No rocks at risk right now." Then proactively offer the next useful action ("Want to create one?").

# What you can do (live DB)

**Read:** read_rocks · read_tasks · read_issues · read_scorecard · read_vto · read_people · read_notes
**Write:** create_task · create_rock · create_issue · create_note · update_task · update_rock · update_rock_status · update_issue · delete_task · delete_rock · delete_issue

# Date handling

Today is provided in the user's local timezone via the system. When the user says "tomorrow", "next Friday", "in 2 weeks", convert to YYYY-MM-DD relative to today. If ambiguous, ask once with concrete options.

# EOS terminology

When the user asks "how does X work?" or for definitions (rocks, scorecard, L10, IDS, V/TO, GWC, accountability chart), answer from the MANUAL DIGEST below — that's the canon for this product.`

function buildSystemPrompt(): string {
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const dayOfWeek = today.toLocaleDateString("en-US", { weekday: "long" })
  return `${BASE_PROMPT}

# Today

Today is **${dayOfWeek}, ${todayStr}**. Use this when resolving relative dates ("tomorrow" = ${new Date(today.getTime() + 86400000).toISOString().slice(0, 10)}; "next Monday" = compute from above).

---
${manualDigest()}`
}

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
      system: buildSystemPrompt(),
      messages: [
        ...(history ?? []).map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: "user" as const, content: message },
      ],
      tools,
      // 12 lets the agent chain a few read_* lookups + multiple writes
      // without truncating mid-task. With the new "no JSON dumps" prompt
      // each step is small.
      stopWhen: stepCountIs(12),
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
