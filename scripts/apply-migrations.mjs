// One-shot migration runner. Reads POSTGRES_URL_NON_POOLING (or POSTGRES_URL)
// from .env.production and applies every *.sql file under
// supabase/migrations in lexicographic order, idempotently. Tracks state
// in a `_app_migrations` table so re-running is a no-op.
//
// Usage: node scripts/apply-migrations.mjs

import { readdir, readFile } from "node:fs/promises"
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

async function discoverMigrations() {
  const dir = join(ROOT, "supabase/migrations")
  const entries = await readdir(dir)
  return entries.filter((f) => f.endsWith(".sql")).sort()
}

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
  const filesToApply = await discoverMigrations()

  let ranCount = 0
  for (const file of filesToApply) {
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

  // Configure pg_cron GUCs so trigger_webhook_delivery() knows what URL
  // and bearer secret to call. ALTER DATABASE persists across restarts;
  // we re-apply on every migration run so a rotated CRON_SECRET picks up.
  const appUrl =
    env.NEXT_PUBLIC_APP_URL ||
    (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : null)
  const cronSecret = env.CRON_SECRET ?? null
  if (appUrl && cronSecret) {
    try {
      // Store config in app_settings (created in 20260505000001).
      // Supabase doesn't grant ALTER DATABASE SET to the connect role,
      // so a GUC-based approach was a non-starter.
      await client.query(`
        INSERT INTO app_settings (key, value, updated_at)
        VALUES ('app_url', $1, NOW()),
               ('cron_secret', $2, NOW())
        ON CONFLICT (key) DO UPDATE SET
          value = EXCLUDED.value,
          updated_at = NOW()
      `, [appUrl, cronSecret])
      console.log(`-- app_settings updated: app_url=${appUrl}`)
    } catch (err) {
      console.warn(`-- app_settings update skipped: ${err.message}`)
    }
  } else {
    console.warn(
      "-- pg_cron config skipped: NEXT_PUBLIC_APP_URL or CRON_SECRET missing in .env.production",
    )
  }

  await client.end()
  console.log(`\nDone. Applied ${ranCount} migration${ranCount === 1 ? "" : "s"}.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
