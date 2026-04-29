"use client"

import { useEffect } from "react"
import { useUIStore, type SessionUser } from "@/lib/store"

export function SessionInit({ user }: { user: SessionUser }) {
  const setCurrentUser = useUIStore((s) => s.setCurrentUser)

  useEffect(() => {
    setCurrentUser(user)
  }, [user.id, setCurrentUser]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
