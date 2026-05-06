// One-shot: check whether Resend has verified the orage.agency domain
// yet, and if so, flip RESEND_FROM_EMAIL on Vercel production from
// the temporary `onboarding@resend.dev` back to
// `Orage Core <notifications@orage.agency>` and trigger a redeploy.
//
// Idempotent — safe to run repeatedly. If Resend hasn't verified yet,
// prints the current per-record status and exits 2.
//
// Run: node scripts/resend-flip-when-verified.mjs

import { readFileSync } from "node:fs"
import { execSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")

const envText = readFileSync(join(ROOT, ".env.production"), "utf8")
const env = {}
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?$/)
  if (m) env[m[1]] = m[2]
}
const RESEND_KEY = process.env.RESEND_API_KEY || env.RESEND_API_KEY
if (!RESEND_KEY) {
  console.error("Missing RESEND_API_KEY (env or .env.production)")
  process.exit(2)
}

// Hardcoded domain id from when we POST'd to /domains earlier.
const DOMAIN_ID = "83d05fc7-c4f0-4b51-acad-4ee09f638360"
const TARGET_FROM = "Orage Core <notifications@orage.agency>"

const res = await fetch(`https://api.resend.com/domains/${DOMAIN_ID}`, {
  headers: { Authorization: `Bearer ${RESEND_KEY}` },
})
const body = await res.json()
console.log(`domain status: ${body.status}`)
for (const r of body.records ?? []) {
  console.log(`  ${r.record.padEnd(6)} ${r.name.padEnd(25)} status=${r.status}`)
}

if (body.status !== "verified") {
  console.log("\nNot verified yet. Run again later.")
  process.exit(2)
}

console.log("\n✓ Verified! Flipping RESEND_FROM_EMAIL on Vercel and redeploying…")

// Use Vercel CLI to update + redeploy. We pipe the value via stdin so
// it never lands in shell history.
execSync(
  `cmd.exe /c echo ${TARGET_FROM}| vercel env add RESEND_FROM_EMAIL production --force`,
  { cwd: ROOT, stdio: "inherit", shell: "cmd.exe" },
)
execSync("vercel deploy --prod --yes", {
  cwd: ROOT,
  stdio: "inherit",
})
console.log("✓ Done. Next email send will brand as notifications@orage.agency.")
