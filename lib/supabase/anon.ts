/**
 * Server-only Supabase anonymous client (no service role, no cookies).
 *
 * Used for fire-and-forget operations like signInWithOtp() that don't
 * need an authenticated context and must NOT touch the current user's
 * session cookies. The cookie-bound `createClient` (server.ts) would
 * otherwise inadvertently rewrite session cookies on the response.
 */
import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let cached: SupabaseClient | null = null

export function createAnonClient(): SupabaseClient {
  if (cached) return cached
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) {
    throw new Error(
      "[supabase/anon] Missing SUPABASE_URL or anon/publishable key env vars",
    )
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-orage-source": "server-anon" } },
  })
  return cached
}
