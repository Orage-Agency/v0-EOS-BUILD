"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useWorkspaceSlug } from "@/hooks/use-workspace-slug"

/**
 * On mobile (<768px), the dashboard home redirects to /{workspace}/tasks so
 * that the primary mobile landing surface is the Tasks list. No-op on desktop.
 */
export function MobileHomeRedirect() {
  const router = useRouter()
  const workspaceSlug = useWorkspaceSlug()
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!workspaceSlug) return
    if (window.matchMedia("(max-width: 767px)").matches) {
      router.replace(`/${workspaceSlug}/tasks`)
    }
  }, [router, workspaceSlug])
  return null
}
