"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en" className="dark">
      <body className="bg-black text-white flex items-center justify-center min-h-screen font-mono">
        <div className="text-center space-y-4 p-8">
          <div className="text-gold-400 font-display text-2xl tracking-widest">
            SOMETHING WENT WRONG
          </div>
          <p className="text-sm text-gray-400 max-w-md">
            An unexpected error occurred. The team has been notified.
          </p>
          <button
            onClick={reset}
            className="mt-4 px-6 py-2 bg-gold-500 text-black text-xs font-semibold uppercase tracking-widest rounded-sm hover:bg-gold-400 transition-colors"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  )
}
