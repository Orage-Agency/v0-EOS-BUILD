/**
 * Server-only Supabase admin client (service role).
 *
 * Bypasses RLS. Used for Day 1's no-auth-UI mode: server actions and
 * server components resolve the current user via getCurrentUser() and
 * scope every query manually by tenant_id.
 *
 * NEVER import from a client component.
 */
import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let cached: SupabaseClient | null = null

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      "[supabase/admin] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars",
    )
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-orage-source": "server-admin" } },
  })
  return cached
}
