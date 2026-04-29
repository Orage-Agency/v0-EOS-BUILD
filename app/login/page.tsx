// ═══════════════════════════════════════════════════════════
// app/login/page.tsx — workspace-agnostic entry point
// ═══════════════════════════════════════════════════════════

import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getUserWorkspaces } from "@/lib/auth"

/**
 * Top-level `/login` route. The middleware redirects unauthenticated visitors
 * here when they hit `/`, and `requireUser` redirects to `/{workspace}/login`
 * for known workspaces. This page handles two cases:
 *
 *   1. The visitor IS signed in but landed at `/` with no membership: send
 *      them to their first workspace, or to `/signup` to create one.
 *   2. The visitor is signed out and there is no workspace context: ask for
 *      a workspace slug so we can forward them to `/{slug}/login`.
 */
export default async function LoginEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const workspaces = await getUserWorkspaces()
    if (workspaces.length > 0) {
      redirect(`/${workspaces[0].slug}`)
    }
    redirect("/signup")
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
            <div
              className="text-[20px] tracking-[0.18em]"
              style={{ fontFamily: "Bebas Neue", color: "#E4AF7A" }}
            >
              ORAGE CORE
            </div>
          </div>
          <p className="text-[12px] text-[#8a7860]">
            Sign in to your workspace
          </p>
        </div>

        {error === "no_access" && (
          <div className="mb-4 px-4 py-3 bg-[rgba(194,84,80,0.1)] border-l-2 border-[#C25450] text-[12px] text-[#C25450]">
            You don&apos;t have access to that workspace. Ask the owner for an
            invite.
          </div>
        )}

        <form action="/login" method="get" className="space-y-4">
          <div>
            <label
              className="block text-[10px] uppercase tracking-[0.18em] text-[#8a7860] mb-2"
              style={{ fontFamily: "Bebas Neue" }}
            >
              Workspace slug
            </label>
            <input
              name="workspace"
              required
              autoFocus
              className="w-full px-4 py-3 bg-[#151515] border border-[rgba(182,128,57,0.18)] rounded-[2px] text-[#FFD69C] focus:outline-none focus:border-[#B68039]"
              placeholder="orage"
            />
          </div>
          <button
            type="submit"
            formAction={async (formData: FormData) => {
              "use server"
              const slug = String(formData.get("workspace") ?? "").trim()
              if (!slug) redirect("/login")
              redirect(`/${slug}/login`)
            }}
            className="w-full py-3 rounded-[2px] text-black font-semibold text-[12px] tracking-[0.1em] uppercase"
            style={{
              background: "linear-gradient(135deg, #B68039, #E4AF7A)",
              fontFamily: "Bebas Neue",
            }}
          >
            Continue →
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/signup"
            className="text-[11px] text-[#8a7860] hover:text-[#E4AF7A] underline-offset-4 hover:underline"
          >
            Don&apos;t have a workspace? Create one →
          </Link>
        </div>
      </div>
    </div>
  )
}
