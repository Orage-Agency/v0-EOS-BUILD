import "server-only"
import crypto from "crypto"
import { supabaseAdmin } from "@/lib/supabase/admin"

/**
 * Public API authentication via Bearer token.
 *
 * Keys look like: `oc_<12-char prefix>_<48-char secret>`
 * On creation we return the full key once; in the DB we store only:
 *   - key_prefix  (first 12 chars after `oc_`)
 *   - key_hash    (SHA-256 of the full key)
 *
 * On auth we extract the prefix, look up that one row, then constant-time
 * compare the hash. This avoids scanning every workspace's keys.
 */

export type ApiKeyContext = {
  keyId: string
  workspaceId: string
  scopes: string[]
}

const PREFIX_LEN = 12

export function generateApiKey(): { full: string; prefix: string; hash: string } {
  const prefix = crypto.randomBytes(6).toString("hex") // 12 chars
  const secret = crypto.randomBytes(24).toString("hex") // 48 chars
  const full = `oc_${prefix}_${secret}`
  const hash = crypto.createHash("sha256").update(full).digest("hex")
  return { full, prefix, hash }
}

function hashKey(full: string): string {
  return crypto.createHash("sha256").update(full).digest("hex")
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const ab = Buffer.from(a, "hex")
  const bb = Buffer.from(b, "hex")
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

/**
 * Resolve a Bearer token from a request to an authenticated workspace.
 * Returns null on any failure — callers should respond 401 when null.
 * Updates last_used_at on success (best-effort, doesn't block).
 */
export async function authenticateApiRequest(
  req: Request,
): Promise<ApiKeyContext | null> {
  const auth = req.headers.get("authorization") ?? ""
  const match = auth.match(/^Bearer\s+(oc_[a-f0-9]{12}_[a-f0-9]{48})$/i)
  if (!match) return null
  const fullKey = match[1]
  const prefix = fullKey.slice(3, 3 + PREFIX_LEN)
  const sb = supabaseAdmin()
  const { data, error } = await sb
    .from("api_keys")
    .select("id, workspace_id, key_hash, scopes, revoked_at")
    .eq("key_prefix", prefix)
    .is("revoked_at", null)
    .maybeSingle()
  if (error || !data) return null
  if (!timingSafeEqualHex(hashKey(fullKey), data.key_hash as string)) return null
  // Best-effort last_used_at bump — fire-and-forget so a slow write
  // doesn't block the caller's request.
  void sb
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
  return {
    keyId: data.id as string,
    workspaceId: data.workspace_id as string,
    scopes: (data.scopes as string[]) ?? ["read", "write"],
  }
}

export function jsonError(
  status: number,
  message: string,
  hint?: string,
): Response {
  return new Response(
    JSON.stringify({ error: message, ...(hint && { hint }) }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  )
}

export function requiresScope(
  ctx: ApiKeyContext,
  scope: "read" | "write",
): boolean {
  return ctx.scopes.includes(scope)
}
