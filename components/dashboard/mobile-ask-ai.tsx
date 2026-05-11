"use client"

import { useParams } from "next/navigation"
import { TenantLink as Link } from "@/components/tenant-link"

/**
 * Mobile-only floating action button that jumps the user into the AI
 * Implementer chat. Keeps the dashboard's "see what to do" surface clean
 * (per user request to drop the AI panel from the dashboard) while still
 * giving thumb-reachable access to "ask the AI" — the two things the
 * user said matter most on mobile.
 *
 * Hidden on md+ (tablets / desktops) because the sidebar already has a
 * prominent AI link there. Only renders the destination once the
 * workspace slug is known so we don't blink an /undefined link.
 */
export function MobileAskAI() {
  const params = useParams<{ workspace: string }>()
  const slug = params?.workspace ?? ""
  if (!slug) return null

  return (
    <Link
      href="/ai"
      aria-label="Ask the AI Implementer"
      className="md:hidden fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 h-14 pl-4 pr-5 rounded-full bg-gradient-to-br from-gold-500 to-gold-400 text-text-on-gold shadow-orage-lg shadow-gold/40 font-display tracking-[0.15em] text-[12px] uppercase active:scale-95 transition-transform"
    >
      <span
        aria-hidden
        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-bg-base/30 text-[14px]"
      >
        ✦
      </span>
      Ask AI
    </Link>
  )
}
