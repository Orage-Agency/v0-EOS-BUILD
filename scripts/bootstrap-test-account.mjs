/**
 * One-shot: create the team@orage.agency auth user + a fresh workspace
 * + founder membership, so the smoke test can log in and walk the
 * onboarding wizard. Idempotent — re-running just prints the existing IDs.
 */
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import pg from "pg"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")

const EMAIL = process.env.TEST_EMAIL ?? "team@orage.agency"
const PASSWORD = process.env.TEST_PASSWORD ?? "Or4ge-Onb0arding-Te5t!"
const FULL_NAME = "Orage Team"
const WORKSPACE_NAME = "Orage Team"
const WORKSPACE_SLUG = "orage-team"

async function loadEnv() {
  const text = await readFile(join(ROOT, ".env.production"), "utf8")
  const env = {}
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)="?(.*?)"?$/)
    if (m) env[m[1]] = m[2]
  }
  return env
}

async function main() {
  const env = await loadEnv()
  const conn = env.POSTGRES_URL_NON_POOLING
  if (!conn || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing POSTGRES_URL_NON_POOLING, SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY")
    process.exit(2)
  }
  const url = conn.replace(/[?&]sslmode=[^&]*/g, "").replace(/\?$/, "")
  const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await c.connect()

  // 1) Auth user via Supabase Admin REST API (the SDK avoids us juggling pg + auth schema).
  let userId
  const adminBase = `${env.SUPABASE_URL}/auth/v1/admin`
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  }
  // Look up first
  const lookup = await fetch(`${adminBase}/users?email=${encodeURIComponent(EMAIL)}`, { headers })
  const lookupJson = await lookup.json()
  const existing = (lookupJson.users ?? []).find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase())
  if (existing) {
    userId = existing.id
    console.log(`auth user exists → ${userId}`)
  } else {
    const create = await fetch(`${adminBase}/users`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: FULL_NAME },
      }),
    })
    const createJson = await create.json()
    if (!create.ok) {
      console.error("Failed to create auth user:", createJson)
      process.exit(1)
    }
    userId = createJson.id
    console.log(`auth user created → ${userId}`)
  }

  // 2) Profile (handle_new_user trigger should have done this; ensure it).
  await c.query(
    `INSERT INTO profiles (id, email, full_name, is_master)
     VALUES ($1, $2, $3, false)
     ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name`,
    [userId, EMAIL, FULL_NAME],
  )

  // 3) Workspace
  const wsExisting = await c.query(`SELECT id FROM workspaces WHERE slug = $1`, [WORKSPACE_SLUG])
  let workspaceId
  if (wsExisting.rows.length > 0) {
    workspaceId = wsExisting.rows[0].id
    console.log(`workspace exists → ${workspaceId}`)
  } else {
    const ws = await c.query(
      `INSERT INTO workspaces (slug, name, created_by, status)
       VALUES ($1, $2, $3, 'active')
       RETURNING id`,
      [WORKSPACE_SLUG, WORKSPACE_NAME, userId],
    )
    workspaceId = ws.rows[0].id
    console.log(`workspace created → ${workspaceId}`)
  }

  // 4) Membership (founder)
  const mExisting = await c.query(
    `SELECT id, role FROM workspace_memberships
     WHERE workspace_id = $1 AND user_id = $2`,
    [workspaceId, userId],
  )
  if (mExisting.rows.length > 0) {
    console.log(`membership exists → ${mExisting.rows[0].id} (role=${mExisting.rows[0].role})`)
  } else {
    const m = await c.query(
      `INSERT INTO workspace_memberships (workspace_id, user_id, role, status)
       VALUES ($1, $2, 'founder', 'active')
       RETURNING id`,
      [workspaceId, userId],
    )
    console.log(`membership created → ${m.rows[0].id}`)
  }

  await c.end()
  console.log("\nReady. Login at:")
  console.log(`  https://v0-project-foundation-setup-nu.vercel.app/${WORKSPACE_SLUG}/login`)
  console.log(`  email: ${EMAIL}`)
  console.log(`  password: ${PASSWORD}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
