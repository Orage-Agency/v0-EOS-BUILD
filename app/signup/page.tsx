// ═══════════════════════════════════════════════════════════
// app/signup/page.tsx — master role bootstrap (George only)
// After George signs up here, run the bootstrap migration in
// Supabase to flip is_master = true and create the `orage`
// workspace + founding membership.
// ═══════════════════════════════════════════════════════════

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signUpMaster } from "@/app/actions/auth"

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await signUpMaster(email, password, fullName)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setTimeout(() => router.push("/orage/login"), 3000)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-center px-6">
        <div className="max-w-md">
          <div className="text-[48px] mb-4" style={{ fontFamily: "Bebas Neue", color: "#E4AF7A" }}>
            WELCOME
          </div>
          <p className="text-[#FFE8C7] mb-2">Your account is created.</p>
          <p className="text-[12px] text-[#8a7860]">
            Now run the bootstrap migration in Supabase to make yourself the master and create the Orage Agency
            workspace.
          </p>
          <p className="text-[12px] text-[#8a7860] mt-4">Redirecting to login in 3 seconds&hellip;</p>
        </div>
      </div>
    )
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
          <div
            className="text-[32px] mb-2"
            style={{ fontFamily: "Bebas Neue", color: "#E4AF7A", letterSpacing: "0.06em" }}
          >
            CREATE YOUR ACCOUNT
          </div>
          <div className="text-[11px] text-[#8a7860]">Master setup &middot; for the founder</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-[10px] uppercase tracking-[0.18em] text-[#8a7860] mb-2"
              style={{ fontFamily: "Bebas Neue" }}
            >
              Full name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-3 bg-[#151515] border border-[rgba(182,128,57,0.18)] rounded-[2px] text-[#FFD69C] focus:outline-none focus:border-[#B68039]"
              placeholder="George Moffat"
            />
          </div>

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
              className="w-full px-4 py-3 bg-[#151515] border border-[rgba(182,128,57,0.18)] rounded-[2px] text-[#FFD69C] focus:outline-none focus:border-[#B68039]"
              placeholder="george@orage.agency"
            />
          </div>

          <div>
            <label
              className="block text-[10px] uppercase tracking-[0.18em] text-[#8a7860] mb-2"
              style={{ fontFamily: "Bebas Neue" }}
            >
              Password (8+ characters)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-3 bg-[#151515] border border-[rgba(182,128,57,0.18)] rounded-[2px] text-[#FFD69C] focus:outline-none focus:border-[#B68039]"
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
            style={{ background: "linear-gradient(135deg, #B68039, #E4AF7A)", fontFamily: "Bebas Neue" }}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  )
}
