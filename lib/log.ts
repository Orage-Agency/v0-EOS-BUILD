import * as Sentry from "@sentry/nextjs"

/**
 * One-stop logger for "something went wrong on the server" paths.
 *
 * Logs to console (so local dev still sees it) AND captures to Sentry
 * (so production has a paper trail). The codebase used to use bare
 * console.error calls inline which meant Sentry never saw the actual
 * root cause — Sentry only got the user-facing surface error.
 *
 * Usage:
 *   import { logError } from "@/lib/log"
 *   logError("createIssue insert error", error, { workspaceId })
 */

export function logError(
  message: string,
  err?: unknown,
  context?: Record<string, unknown>,
): void {
  console.error(`[orage] ${message}`, err, context ?? "")
  try {
    if (err instanceof Error) {
      Sentry.captureException(err, {
        tags: { source: "orage-core" },
        extra: { message, ...(context ?? {}) },
      })
    } else {
      Sentry.captureMessage(message, {
        level: "error",
        tags: { source: "orage-core" },
        extra: { err: String(err ?? ""), ...(context ?? {}) },
      })
    }
  } catch {
    /* never break a request to log */
  }
}

/** Lower-severity sibling — for "happened, worth noting, not an error". */
export function logWarn(
  message: string,
  context?: Record<string, unknown>,
): void {
  console.warn(`[orage] ${message}`, context ?? "")
  try {
    Sentry.captureMessage(message, {
      level: "warning",
      tags: { source: "orage-core" },
      extra: context,
    })
  } catch {
    /* swallow */
  }
}
