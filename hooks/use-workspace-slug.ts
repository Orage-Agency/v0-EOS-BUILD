"use client"

import { useParams } from "next/navigation"

/**
 * Returns the current workspace slug from the URL.
 * All app routes live under /[workspace]/..., so this is always defined
 * inside the authenticated shell.
 */
export function useWorkspaceSlug(): string {
  const params = useParams<{ workspace: string }>()
  return (params?.workspace as string) ?? ""
}
