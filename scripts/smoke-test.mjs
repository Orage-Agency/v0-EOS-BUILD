/**
 * Live smoke test for team@orage.agency on the production deploy.
 * Authenticates via password grant, then walks every module page and
 * verifies the rendered HTML contains expected markers (not just 200).
 *
 * Run: node scripts/smoke-test.mjs
 */
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")
const BASE = "https://v0-project-foundation-setup-nu.vercel.app"
const SLUG = "orage-team"

async function loadEnv() {
  const text = await readFile(join(ROOT, ".env.production"), "utf8")
  const env = {}
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)="?(.*?)"?$/)
    if (m) env[m[1]] = m[2]
  }
  return env
}

async function getCookieHeader(env) {
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "team@orage.agency",
      password: "Or4ge-Onb0arding-Te5t!",
    }),
  })
  const j = await r.json()
  if (!r.ok) throw new Error(`auth failed: ${JSON.stringify(j)}`)
  const ref = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)\./)[1]
  const value =
    "base64-" +
    Buffer.from(
      JSON.stringify({
        access_token: j.access_token,
        refresh_token: j.refresh_token,
        expires_at: j.expires_at,
        expires_in: j.expires_in,
        token_type: "bearer",
        user: j.user,
      }),
    ).toString("base64")
  return `sb-${ref}-auth-token=${value}`
}

const CHECKS = [
  // [path, must-contain markers]
  ["/", null], // landing → workspace redirect
  [`/${SLUG}`, ["GOOD", "ORAGE TEAM"]],
  [`/${SLUG}/rocks`, ["Onboarding wizard live", "Email digest cron landed", "L10 module shipped"]],
  [`/${SLUG}/tasks`, ["Tasks", "Search"]],
  [`/${SLUG}/issues`, ["Issues"]],
  [`/${SLUG}/scorecard`, ["Scorecard"]],
  [`/${SLUG}/l10`, ["L10"]],
  [`/${SLUG}/notes`, ["Notes"]],
  [`/${SLUG}/vto`, ["V/TO"]],
  [`/${SLUG}/orgchart`, ["Accountability"]],
  [`/${SLUG}/people`, ["Orage Team"]],
  [`/${SLUG}/ai`, ["IMPLEMENTER"]],
  [`/${SLUG}/inbox`, ["INBOX"]],
  [`/${SLUG}/settings/audit`, ["AUDIT"]],
  [`/${SLUG}/settings/members`, ["MEMBERS"]],
  [`/${SLUG}/settings/sso`, ["SINGLE", "Single Sign-On"]],
  ["/api/notifications/count?slug=orage-team", null],
]

async function main() {
  const env = await loadEnv()
  const cookie = await getCookieHeader(env)
  console.log("✓ Authenticated as team@orage.agency\n")

  let passed = 0
  let failed = 0
  for (const [path, markers] of CHECKS) {
    const r = await fetch(BASE + path, { redirect: "manual", headers: { Cookie: cookie } })
    const status = r.status
    let body = ""
    if (status === 200) body = await r.text()
    let matched = true
    let missing = []
    if (markers && status === 200) {
      for (const m of markers) {
        if (!body.includes(m)) {
          matched = false
          missing.push(m)
        }
      }
    }
    const ok = (status === 200 || (path === "/" && status === 307)) && matched
    if (ok) {
      passed++
      console.log(`✓ ${status} ${path}${markers ? ` — found "${markers.join('", "')}"` : ""}`)
    } else {
      failed++
      console.log(`✗ ${status} ${path} ${missing.length ? `missing: ${missing.join(", ")}` : ""}`)
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
