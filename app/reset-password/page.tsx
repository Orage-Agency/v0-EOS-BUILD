"use client"

import { useState } from "react"
import Link from "next/link"
import { resetPasswordWithSession } from "@/app/actions/auth"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }
    if (password !== confirm) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)
    const result = await resetPasswordWithSession(password)
    if (result && !result.ok) {
      setError(result.error)
      setLoading(false)
    }
    // On success, the action redirects to /login?reset=ok.
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 1200px 800px at 75% -10%, rgba(182,128,57,0.07) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 w-full max-w-[420px] mx-auto px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-[2px] flex items-center justify-center font-bold text-black"
              style={{
                background: "linear-gradient(135deg, #B68039, #543C1C)",
                fontFamily: "Bebas Neue",
              }}
            >
              O
            </div>
            <div className="text-[20px] tracking-[0.18em]" style={{ fontFamily: "Bebas Neue", color: "#E4AF7A" }}>
              ORAGE CORE
            </div>
          </div>
          <h1
            className="text-[24px]"
            style={{ fontFamily: "Bebas Neue", color: "#E4AF7A", letterSpacing: "0.06em" }}
          >
            CHOOSE A NEW PASSWORD
          </h1>
          <p className="text-[12px] text-[#8a7860] mt-1">
            Pick something at least 8 characters long.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-[10px] uppercase tracking-[0.18em] text-[#8a7860] mb-2"
              style={{ fontFamily: "Bebas Neue" }}
            >
              New password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              autoFocus
              className="w-full px-4 py-3 bg-[#151515] border border-[rgba(182,128,57,0.18)] rounded-[2px] text-[#FFD69C] focus:outline-none focus:border-[#B68039]"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label
              className="block text-[10px] uppercase tracking-[0.18em] text-[#8a7860] mb-2"
              style={{ fontFamily: "Bebas Neue" }}
            >
              Confirm password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full px-4 py-3 bg-[#151515] border border-[rgba(182,128,57,0.18)] rounded-[2px] text-[#FFD69C] focus:outline-none focus:border-[#B68039]"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="px-4 py-3 bg-[rgba(194,84,80,0.1)] border-l-2 border-[#C25450] text-[12px] text-[#C25450]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-[2px] text-black font-semibold text-[12px] tracking-[0.1em] uppercase disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #B68039, #E4AF7A)",
              fontFamily: "Bebas Neue",
            }}
          >
            {loading ? "Updating…" : "Update password"}
          </button>

          <div className="text-center">
            <Link
              href="/login"
              className="text-[11px] text-[#8a7860] hover:text-[#E4AF7A] underline-offset-4 hover:underline"
            >
              ← Back to sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
