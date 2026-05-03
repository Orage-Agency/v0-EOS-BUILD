import { generateText, streamText, stepCountIs } from "ai"
import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { buildTools } from "@/lib/ai/tools"
import { checkAndRecordAIRequest } from "@/lib/ai/rate-limit"
import { manualDigest } from "@/lib/help-manual"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

// Tools that mutate state. After a turn that includes any of these we
// revalidate every module page so the client sees the AI's writes on the
// next render without a hard reload.
const WRITE_TOOLS = new Set([
  "create_task",
  "create_rock",
  "create_issue",
  "create_note",
  "create_milestone",
  "toggle_milestone",
  "update_task",
  "update_rock",
  "update_rock_status",
  "update_issue",
  "delete_task",
  "delete_rock",
  "delete_issue",
])

const PAGES_TO_REVALIDATE = [
  "rocks",
  "tasks",
  "issues",
  "notes",
  "scorecard",
  "vto",
  "people",
  "l10",
]

const BASE_PROMPT = `You are the **Orage Implementer** — an AI chief of staff inside Orage Core, the EOS-style operating system for Orage Agency.

# How you behave

**Action over questions.** If the user's request is clear, do it — don't ask for permission first. Only ask a question when you're truly missing a required piece of information (e.g. "due when?" if the user said "make a task to call the lawyer" with no date). When you do ask, ask exactly **one** question at a time and offer 2–3 likely defaults the user can pick from.

**Tools first, words second.** Every question about data ("what tasks?", "any rocks at risk?", "who owns X?") MUST start with a tool call. If you can't find what the user wants on the first try, try a different filter — don't say "I don't know."

**Be fast and direct.** Short sentences. Specific numbers. Real names. No filler ("Sure!", "Of course!", "I'd be happy to..."). No closing sales-pitches ("Let me know if you need anything else!"). Default to ≤ 4 sentences unless the user explicitly asks for detail.

**Names → IDs.** When the user mentions a teammate by name ("assign to Brooklyn"), call \`read_people\` first to resolve to a real user id, then use that id in the write call. Never invent an id.

**Confirmation = recap.** When you create / update / delete, end with one line: "✓ Created task 'Call Brooklyn' (due May 2)" — names + dates only. Don't dump JSON.

**No data ≠ make it up.** If a tool returns empty, say so plainly: "No rocks at risk right now." Then proactively offer the next useful action ("Want to create one?").

# What you can do (live DB)

**Read:** read_rocks · read_tasks · read_issues · read_scorecard · read_vto · read_people · read_notes · list_milestones
**Write:** create_task · create_rock · create_issue · create_note · create_milestone · toggle_milestone · update_task · update_rock · update_rock_status · update_issue · delete_task · delete_rock · delete_issue

# When the user wants you to "do" something
You are Orage's chief of staff and an action-taking agent. Behave like Claude Code: read first, plan briefly (one line), then call the tools. Chain reads → writes in one turn whenever it's clear. Don't ask "should I?" — if the user said "make a rock for X with milestones", create the rock, then call create_milestone for each milestone, then confirm in one line.

# Date handling

Today is provided in the user's local timezone via the system. When the user says "tomorrow", "next Friday", "in 2 weeks", convert to YYYY-MM-DD relative to today. If ambiguous, ask once with concrete options.

# EOS terminology

When the user asks "how does X work?" or for definitions (rocks, scorecard, L10, IDS, V/TO, GWC, accountability chart), answer from the MANUAL DIGEST below — that's the canon for this product.`

// Produce a short, human-friendly summary of a tool's output so the UI
// can render "read_tasks · 12 results" or "create_task · ✓ created" next
// to the tool block. Full payloads aren't shipped to the client to keep
// SSE frames small; the model narrates the specifics in the text stream.
function summarizeToolOutput(out: unknown): string {
  if (out == null) return ""
  if (typeof out !== "object") return String(out).slice(0, 120)
  const o = out as Record<string, unknown>
  if (typeof o.error === "string") return `error: ${o.error}`
  if (o.created === true) return "✓ created"
  if (o.updated === true) return "✓ updated"
  if (o.deleted === true) return "✓ deleted"
  for (const key of [
    "rocks",
    "tasks",
    "issues",
    "people",
    "users",
    "notes",
    "milestones",
    "metrics",
    "entries",
  ]) {
    const val = o[key]
    if (Array.isArray(val)) return `${val.length} ${key}`
  }
  return ""
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function collectToolCalls(steps: any[]): Array<{
  id: string
  name: string
  args: Record<string, unknown>
  result: unknown
}> {
  const out: Array<{ id: string; name: string; args: Record<string, unknown>; result: unknown }> = []
  for (const step of steps ?? []) {
    for (const call of step.toolCalls ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const matched = (step.toolResults ?? []).find((r: any) => r.toolCallId === call.toolCallId)
      out.push({
        id: call.toolCallId,
        name: call.toolName,
        args: (call.input as Record<string, unknown>) ?? {},
        result: matched?.output,
      })
    }
  }
  return out
}

function revalidateAll(workspaceSlug: string) {
  for (const seg of PAGES_TO_REVALIDATE) {
    try {
      revalidatePath(`/${workspaceSlug}/${seg}`)
    } catch {
      /* best-effort */
    }
  }
  try {
    revalidatePath(`/${workspaceSlug}`)
  } catch { /* best-effort */ }
}

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

/**
 * The chat route streams a Server-Sent Events response with three
 * frame types so the client can render progressively:
 *
 *   data: {"kind":"tool","name":"read_rocks","args":{...}}
 *   data: {"kind":"text","delta":"..."}
 *   data: {"kind":"done","didWrite":true}
 *
 * The final "done" frame carries metadata the client needs after the
 * stream closes (didWrite triggers a router.refresh).
 *
 * `?stream=false` falls back to the old single-shot JSON response — keeps
 * backwards compatibility with tooling and lets the e2e tests assert on
 * the final text without an SSE parser.
 */

export async function POST(req: Request) {
  try {
    const url = new URL(req.url)
    const wantsStream = url.searchParams.get("stream") !== "false"
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

    const me = await requireUser(workspaceSlug)

    const limit = await checkAndRecordAIRequest({
      tenantId: me.workspaceId,
      userId: me.id,
      endpoint: "/api/ai/chat",
    })
    if (!limit.ok) {
      return Response.json(
        { error: limit.message, hint: "Rate limit hit." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
      )
    }

    const tools = buildTools({ tenantId: me.workspaceId, userId: me.id })
    const messages = [
      ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: message },
    ]

    if (!wantsStream) {
      const result = await generateText({
        model: "openai/gpt-5-mini",
        system: buildSystemPrompt(),
        messages,
        tools,
        stopWhen: stepCountIs(12),
      })
      const toolCalls = collectToolCalls(result.steps ?? [])
      const didWrite = toolCalls.some((c) => WRITE_TOOLS.has(c.name))
      if (didWrite) revalidateAll(workspaceSlug)
      return Response.json({ text: result.text, toolCalls, didWrite })
    }

    // ---------- streaming path ----------
    // Tie the model run to the inbound request so client cancellation
    // (composer Stop button → fetch AbortController) actually stops gpt-5-mini
    // upstream instead of silently letting it finish on our dime.
    const result = streamText({
      model: "openai/gpt-5-mini",
      system: buildSystemPrompt(),
      messages,
      tools,
      stopWhen: stepCountIs(12),
      abortSignal: req.signal,
    })

    const encoder = new TextEncoder()
    const sse = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (frame: unknown) => {
          // Once the consumer disconnects, controller.enqueue throws. Skip
          // emits in that state so the catch below doesn't mask the abort
          // as a stream error.
          if (req.signal.aborted) return
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(frame)}\n\n`))
          } catch {
            /* consumer gone */
          }
        }
        try {
          for await (const chunk of result.fullStream) {
            switch (chunk.type) {
              case "text-delta":
                send({ kind: "text", delta: chunk.text })
                break
              case "tool-call":
                send({
                  kind: "tool",
                  id: chunk.toolCallId,
                  name: chunk.toolName,
                  args: chunk.input ?? {},
                })
                break
              case "tool-result": {
                const out = chunk.output as unknown
                const isErr =
                  Boolean(out) &&
                  typeof out === "object" &&
                  out !== null &&
                  "error" in (out as Record<string, unknown>)
                send({
                  kind: "tool-result",
                  id: chunk.toolCallId,
                  ok: !isErr,
                  // Lightweight summary the UI can render — full payloads can
                  // be megabytes, so we cap the JSON length and let the model
                  // narrate specifics in the text stream that follows.
                  summary: summarizeToolOutput(out),
                })
                break
              }
              case "error":
                send({ kind: "error", message: String(chunk.error) })
                break
            }
          }
          // Compute didWrite from the final step list. If the request was
          // aborted mid-stream we may have never reached a "done" step, so
          // skip revalidation in that case.
          if (!req.signal.aborted) {
            const steps = await result.steps
            const toolCalls = collectToolCalls(steps ?? [])
            const didWrite = toolCalls.some((c) => WRITE_TOOLS.has(c.name))
            if (didWrite) revalidateAll(workspaceSlug)
            send({ kind: "done", didWrite })
          }
        } catch (err) {
          // Aborts surface as either DOMException AbortError or the AI
          // SDK's own AbortError shape — treat both as a clean cancel.
          const aborted =
            req.signal.aborted ||
            (err instanceof Error &&
              (err.name === "AbortError" ||
                err.message.toLowerCase().includes("aborted")))
          if (!aborted) {
            send({
              kind: "error",
              message: err instanceof Error ? err.message : "Stream failed",
            })
          }
        } finally {
          try {
            controller.close()
          } catch {
            /* already closed */
          }
        }
      },
    })

    return new Response(sse, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
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
