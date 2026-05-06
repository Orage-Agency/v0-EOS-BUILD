// ═══════════════════════════════════════════════════════════
// app/login/page.tsx — top-level email + password sign-in
// We resolve the user's workspace server-side after a successful
// sign-in, so the user never has to know or type a workspace slug.
// ═══════════════════════════════════════════════════════════

"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { loginByEmail } from "@/app/actions/auth"

export default function LoginEntryPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  const initialError = searchParams.get("error")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(
    initialError === "no_access"
      ? "That workspace isn't linked to your account yet — sign in with the email you were invited under, or ask a teammate to add you."
      : null,
  )
  const justReset = searchParams.get("reset") === "ok"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    // loginByEmail redirects on success — only error responses come back.
    const result = await loginByEmail(email, password)
    if (result && !result.ok) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 1200px 800px at 75% -10%, rgba(182,128,57,0.07) 0%, transparent 60%), radial-gradient(ellipse 800px 600px at -10% 100%, rgba(228,175,122,0.04) 0%, transparent 55%)",
        }}
      />

      <div className="relative z-10 w-full max-w-[420px] mx-auto px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-[2px] flex items-center justify-center font-bold text-black"
              style={{
                background: "linear-gradient(135deg, #B68039, #543C1C)",
                fontFamily: "Bebas Neue",
                letterSpacing: "0.05em",
              }}
            >
              O
            </div>
            <div
              className="text-[20px] tracking-[0.18em]"
              style={{ fontFamily: "Bebas Neue", color: "#E4AF7A" }}
            >
              ORAGE CORE
            </div>
          </div>
          <p className="text-[12px] text-[#8a7860]">Sign in</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-[10px] uppercase tracking-[0.18em] text-[#8a7860] mb-2"
              style={{ fontFamily: "Bebas Neue" }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
              className="w-full px-4 py-3 bg-[#151515] border border-[rgba(182,128,57,0.18)] rounded-[2px] text-[#FFD69C] focus:outline-none focus:border-[#B68039]"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label
              className="block text-[10px] uppercase tracking-[0.18em] text-[#8a7860] mb-2"
              style={{ fontFamily: "Bebas Neue" }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="current-password"
              className="w-full px-4 py-3 bg-[#151515] border border-[rgba(182,128,57,0.18)] rounded-[2px] text-[#FFD69C] focus:outline-none focus:border-[#B68039]"
              placeholder="••••••••"
            />
          </div>

          {justReset && !error && (
            <div className="px-4 py-3 bg-[rgba(111,170,107,0.08)] border-l-2 border-[#6FAA6B] text-[12px] text-[#6FAA6B]">
              Password updated. Sign in with your new password below.
            </div>
          )}

          {error && (
            <div className="px-4 py-3 bg-[rgba(194,84,80,0.1)] border-l-2 border-[#C25450] text-[12px] text-[#C25450]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            data-testid="login-submit"
            className="w-full py-3 rounded-[2px] text-black font-semibold text-[12px] tracking-[0.1em] uppercase disabled:opacity-50 flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, #B68039, #E4AF7A)",
              fontFamily: "Bebas Neue",
            }}
          >
            {loading && (
              <span
                aria-hidden
                className="inline-block w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"
              />
            )}
            <span>{loading ? "Signing in…" : "Sign in"}</span>
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <Link
            href="/forgot-password"
            className="block text-[11px] text-[#8a7860] hover:text-[#E4AF7A] underline-offset-4 hover:underline"
          >
            Forgot your password?
          </Link>
          <Link
            href="/signup"
            className="block text-[11px] text-[#8a7860] hover:text-[#E4AF7A] underline-offset-4 hover:underline"
          >
            Don&apos;t have an account? Create one →
          </Link>
        </div>
      </div>
    </div>
  )
}
