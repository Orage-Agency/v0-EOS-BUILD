import "server-only"
import crypto from "crypto"
import { cookies, headers } from "next/headers"
import { supabaseAdmin } from "@/lib/supabase/admin"

/**
 * "Remember this device for 30 days" — issue an opaque cookie after the
 * user passes TOTP, and on next login we let them skip the prompt if the
 * cookie hashes to a still-valid row.
 *
 * Cookie name is intentionally generic so an attacker doesn't immediately
 * know what it's for. HTTPOnly + Secure + SameSite=Lax + Path=/login
 * scope it to only ride the auth handshake.
 */

const COOKIE_NAME = "oc_td"
const TTL_DAYS = 30
const TTL_SEC = TTL_DAYS * 24 * 60 * 60

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

async function readContext() {
  let ip: string | null = null
  let userAgent: string | null = null
  try {
    const h = await headers()
    ip =
      (h.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
      h.get("x-real-ip") ||
      null
    userAgent = h.get("user-agent")
  } catch {
    /* unavailable in some runtimes */
  }
  return { ip, userAgent }
}

function deriveLabel(userAgent: string | null): string {
  if (!userAgent) return "Unknown device"
  const ua = userAgent.toLowerCase()
  let device = "Browser"
  if (ua.includes("iphone")) device = "iPhone"
  else if (ua.includes("ipad")) device = "iPad"
  else if (ua.includes("android")) device = "Android"
  else if (ua.includes("macintosh") || ua.includes("mac os x")) device = "Mac"
  else if (ua.includes("windows")) device = "Windows PC"
  else if (ua.includes("linux")) device = "Linux"
  let browser = ""
  if (ua.includes("edg/")) browser = "Edge"
  else if (ua.includes("chrome/")) browser = "Chrome"
  else if (ua.includes("safari/") && !ua.includes("chrome/")) browser = "Safari"
  else if (ua.includes("firefox/")) browser = "Firefox"
  return browser ? `${device} · ${browser}` : device
}

/**
 * Issue a fresh trusted-device cookie + DB row for the given user.
 * Call only after TOTP verify succeeds AND the user explicitly opted in.
 */
export async function issueTrustedDevice(userId: string): Promise<void> {
  const token = crypto.randomBytes(32).toString("hex")
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + TTL_SEC * 1000).toISOString()
  const { ip, userAgent } = await readContext()

  const sb = supabaseAdmin()
  await sb.from("mfa_trusted_devices").insert({
    user_id: userId,
    token_hash: tokenHash,
    label: deriveLabel(userAgent),
    ip,
    user_agent: userAgent,
    expires_at: expiresAt,
  })

  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/login",
    maxAge: TTL_SEC,
  })
}

/**
 * If the request carries a valid trusted-device cookie for the given
 * user, bump last_used_at and return true. Caller can then skip the
 * MFA prompt and complete login.
 */
export async function deviceIsTrusted(userId: string): Promise<boolean> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return false
  const tokenHash = hashToken(token)
  const sb = supabaseAdmin()
  const { data } = await sb
    .from("mfa_trusted_devices")
    .select("id, expires_at")
    .eq("user_id", userId)
    .eq("token_hash", tokenHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle()
  if (!data) return false
  // Best-effort touch; don't block the login on it.
  void sb
    .from("mfa_trusted_devices")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id as string)
  return true
}

/** Revoke every trusted device for the user. Used by /settings/security. */
export async function revokeAllTrustedDevices(userId: string): Promise<void> {
  const sb = supabaseAdmin()
  await sb.from("mfa_trusted_devices").delete().eq("user_id", userId)
}

/** List active devices for /settings/security. */
export async function listTrustedDevices(userId: string): Promise<
  Array<{
    id: string
    label: string | null
    ip: string | null
    createdAt: string
    expiresAt: string
    lastUsedAt: string
  }>
> {
  const sb = supabaseAdmin()
  const { data } = await sb
    .from("mfa_trusted_devices")
    .select("id, label, ip, created_at, expires_at, last_used_at")
    .eq("user_id", userId)
    .gt("expires_at", new Date().toISOString())
    .order("last_used_at", { ascending: false })
  return ((data ?? []) as Array<{
    id: string
    label: string | null
    ip: string | null
    created_at: string
    expires_at: string
    last_used_at: string
  }>).map((r) => ({
    id: r.id,
    label: r.label,
    ip: r.ip,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    lastUsedAt: r.last_used_at,
  }))
}
