/**
 * Outbound email. Uses Resend when RESEND_API_KEY is set, no-ops with a
 * console.log otherwise so dev / preview deploys never break for missing keys.
 *
 * Defaults:
 *   - From: process.env.RESEND_FROM_EMAIL or "Orage Core <noreply@orage.agency>"
 *   - Reply-To: process.env.RESEND_REPLY_TO or unset
 */
import "server-only"

import { Resend } from "resend"

let _client: Resend | null | undefined
function getClient(): Resend | null {
  if (_client !== undefined) return _client
  const key = process.env.RESEND_API_KEY
  if (!key) {
    _client = null
    return null
  }
  _client = new Resend(key)
  return _client
}

export type SendEmailInput = {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  replyTo?: string
  /**
   * Override the from address for this send. Otherwise we use
   * RESEND_FROM_EMAIL or the hardcoded fallback.
   */
  from?: string
}

export type SendEmailResult =
  | { ok: true; id: string | null; skipped?: boolean }
  | { ok: false; error: string }

const DEFAULT_FROM =
  process.env.RESEND_FROM_EMAIL ?? "Orage Core <noreply@orage.agency>"

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const client = getClient()
  if (!client) {
    // No-op fallback so a missing key doesn't blow up cron runs.
    console.log("[email] (skipped — no RESEND_API_KEY)", {
      to: input.to,
      subject: input.subject,
    })
    return { ok: true, id: null, skipped: true }
  }
  try {
    // Resend's discriminated-union type wants either {html} OR {text} OR
    // {react} OR {template}. We always have at least html in our templates,
    // so build the payload conditionally and let TS infer the html branch.
    const payload: Parameters<typeof client.emails.send>[0] = input.html
      ? {
          from: input.from ?? DEFAULT_FROM,
          to: input.to,
          subject: input.subject,
          html: input.html,
          text: input.text,
          replyTo: input.replyTo ?? process.env.RESEND_REPLY_TO,
        }
      : {
          from: input.from ?? DEFAULT_FROM,
          to: input.to,
          subject: input.subject,
          text: input.text ?? "",
          replyTo: input.replyTo ?? process.env.RESEND_REPLY_TO,
        }
    const result = await client.emails.send(payload)
    if (result.error) {
      return { ok: false, error: result.error.message }
    }
    return { ok: true, id: result.data?.id ?? null }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown email error",
    }
  }
}

/** Strip-tags helper for fallback text bodies. */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
}
