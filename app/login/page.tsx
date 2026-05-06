// ═══════════════════════════════════════════════════════════
// app/login/page.tsx — top-level email + password sign-in
// We resolve the user's workspace server-side after a successful
// sign-in, so the user never has to know or type a workspace slug.
// ═══════════════════════════════════════════════════════════

"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { loginByEmail, startOAuthSignIn } from "@/app/actions/auth"

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

        <SsoButtons setError={setError} />

        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 h-px bg-[rgba(182,128,57,0.18)]" />
          <span className="text-[10px] tracking-[0.18em] text-[#5a4f3e] font-mono uppercase">or</span>
          <div className="flex-1 h-px bg-[rgba(182,128,57,0.18)]" />
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
              <div>{error}</div>
              {initialError === "no_access" && (
                <a
                  href="/auth/signout"
                  className="inline-block mt-2 text-[11px] text-[#E4AF7A] underline-offset-4 hover:underline"
                >
                  Sign out and try a different account →
                </a>
              )}
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

// SSO buttons render only when the project has the corresponding
// provider enabled in Supabase Auth. We surface that via two public env
// flags so the buttons don't render dead and confuse customers — flip
// them to "true" once Google/Microsoft are configured in the dashboard.
function SsoButtons({
  setError,
}: {
  setError: (s: string | null) => void
}) {
  const googleOn =
    process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true"
  const microsoftOn =
    process.env.NEXT_PUBLIC_AUTH_MICROSOFT_ENABLED === "true"
  if (!googleOn && !microsoftOn) return null

  async function go(provider: "google" | "azure") {
    setError(null)
    const result = await startOAuthSignIn(provider)
    if (result && !result.ok) setError(result.error)
  }

  return (
    <div className="flex flex-col gap-2">
      {googleOn && (
        <button
          type="button"
          data-testid="login-google"
          onClick={() => void go("google")}
          className="w-full py-2.5 rounded-[2px] bg-white text-black font-semibold text-[12px] flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.3l-6.3-5.3c-1.9 1.3-4.5 2.1-7.3 2.1-5.3 0-9.7-3.4-11.3-8H6.2v5C9.6 39.6 16.3 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2-2.1 3.7-3.9 5l6.3 5.3C40.8 35.5 44 30.2 44 24c0-1.2-.1-2.4-.4-3.5z" />
          </svg>
          Continue with Google
        </button>
      )}
      {microsoftOn && (
        <button
          type="button"
          data-testid="login-microsoft"
          onClick={() => void go("azure")}
          className="w-full py-2.5 rounded-[2px] bg-[#2f2f2f] text-white font-semibold text-[12px] flex items-center justify-center gap-2 hover:bg-[#3a3a3a] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 23 23" aria-hidden>
            <rect x="1" y="1" width="10" height="10" fill="#f25022" />
            <rect x="12" y="1" width="10" height="10" fill="#7fba00" />
            <rect x="1" y="12" width="10" height="10" fill="#00a4ef" />
            <rect x="12" y="12" width="10" height="10" fill="#ffb900" />
          </svg>
          Continue with Microsoft
        </button>
      )}
    </div>
  )
}
