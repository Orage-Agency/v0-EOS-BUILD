"use client"

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"

/**
 * Workspace-scoped error boundary. A crash inside any (app)/* route used
 * to render a blank document — Sentry caught the trace but the user got
 * a white screen with no recovery path. This boundary keeps the shell
 * (sidebar/topbar) intact, surfaces a real message, and offers a retry
 * that re-runs the failed render without dropping the user back to login.
 */
export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Forward to Sentry with the digest Next assigns so we can correlate
    // the toast we show below to the error in the Sentry dashboard.
    Sentry.captureException(error, {
      tags: { boundary: "(app)" },
      extra: { digest: error.digest },
    })
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-md w-full glass-strong border-danger/40 rounded-md p-6 text-center">
        <div
          aria-hidden
          className="mx-auto mb-4 w-10 h-10 rounded-full bg-danger/10 border border-danger/40 flex items-center justify-center text-danger text-base"
        >
          ✕
        </div>
        <h2 className="font-display text-[14px] tracking-[0.22em] uppercase text-text-primary mb-2">
          Something fell over
        </h2>
        <p className="text-[12px] leading-relaxed text-text-muted mb-5">
          A page in this workspace crashed. The error has been logged. Try
          again — most of the time the next render works because the data
          gets re-fetched fresh.
        </p>
        {error.digest && (
          <div className="font-mono text-[10px] text-text-dim mb-4 break-all">
            ref · {error.digest}
          </div>
        )}
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="font-display text-[10px] tracking-[0.18em] px-4 py-2 rounded-sm bg-gold-500 hover:bg-gold-400 text-text-on-gold uppercase transition-colors"
          >
            Try again
          </button>
          <a
            href="/"
            className="font-display text-[10px] tracking-[0.18em] px-4 py-2 rounded-sm border border-border-orage text-text-secondary hover:border-gold-500 hover:text-gold-400 uppercase transition-colors"
          >
            Reload home
          </a>
        </div>
      </div>
    </div>
  )
}
