// One-shot migration runner. Reads POSTGRES_URL_NON_POOLING (or POSTGRES_URL)
// from .env.production and applies the four SQL migrations under
// supabase/migrations in order, idempotently. Tracks state in a
// `_app_migrations` table so re-running is a no-op.
//
// Usage: node scripts/apply-migrations.mjs

import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import pg from "pg"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")

async function loadEnv() {
  const text = await readFile(join(ROOT, ".env.production"), "utf8")
  const env = {}
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)="?(.*?)"?$/)
    if (m) env[m[1]] = m[2]
  }
  return env
}

const FILES_TO_APPLY = [
  "20260502000000_ai_rate_limit.sql",
  "20260502000001_notifications.sql",
  "20260502000002_realtime.sql",
  "20260502000003_workspace_sso.sql",
  "20260503000000_workspaces_vto_data.sql",
  "20260503000001_repoint_tenant_fks.sql",
]

async function main() {
  const env = await loadEnv()
  const conn = env.POSTGRES_URL_NON_POOLING ?? env.POSTGRES_URL
  if (!conn) {
    console.error("Missing POSTGRES_URL_NON_POOLING and POSTGRES_URL")
    process.exit(2)
  }
  // Strip sslmode= from the URL because pg-connection-string parses it and
  // forces verify-full, which rejects Supabase's chain. We pass our own ssl
  // config (TLS on, but skip CA verification — fine for a one-shot script).
  const url = conn.replace(/[?&]sslmode=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "")
  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()

  await client.query(`
    CREATE TABLE IF NOT EXISTS _app_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  const { rows: applied } = await client.query("SELECT filename FROM _app_migrations")
  const done = new Set(applied.map((r) => r.filename))

  let ranCount = 0
  for (const file of FILES_TO_APPLY) {
    if (done.has(file)) {
      console.log(`-- SKIP ${file} (already applied)`)
      continue
    }
    const sql = await readFile(join(ROOT, "supabase/migrations", file), "utf8")
    console.log(`-- APPLY ${file} (${sql.length} bytes)`)
    try {
      await client.query("BEGIN")
      await client.query(sql)
      await client.query("INSERT INTO _app_migrations (filename) VALUES ($1)", [file])
      await client.query("COMMIT")
      ranCount++
      console.log(`   OK`)
    } catch (err) {
      await client.query("ROLLBACK")
      console.error(`   FAIL: ${err.message}`)
      throw err
    }
  }

  await client.end()
  console.log(`\nDone. Applied ${ranCount} migration${ranCount === 1 ? "" : "s"}.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
