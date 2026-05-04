/**
 * Validate a `next` redirect parameter against open-redirect tricks.
 *
 * Returns the path if it's a same-origin path, or "/" if it's missing,
 * malformed, or smells like an attempt to escape (`//evil.com`,
 * `\\evil.com`, `@evil.com` userinfo split, raw whitespace, etc.). Used
 * by /auth/callback so an attacker can't craft `?next=…` to bounce a
 * freshly-authenticated user off-domain.
 */
export function safeRedirectPath(raw: string | null | undefined): string {
  if (!raw) return "/"
  if (!raw.startsWith("/")) return "/"
  // protocol-relative or escaped slash
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/"
  // whitespace anywhere lets some browsers normalize past the check
  if (/[\\\s]/.test(raw)) return "/"
  // userinfo separator → `https://my.app@evil.com` parses host=evil.com
  if (raw.includes("@")) return "/"
  return raw
}
