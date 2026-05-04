import { readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")
const env = {}
for (const line of (await readFile(join(ROOT, ".env.production"), "utf8")).split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)="?(.*?)"?$/)
  if (m) env[m[1]] = m[2]
}
const conn = (env.POSTGRES_URL_NON_POOLING || env.POSTGRES_URL).replace(/[?&]sslmode=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "")
const client = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } })
await client.connect()
const sql = await readFile(join(ROOT, "supabase/migrations/20260504000009_invite_temp_password.sql"), "utf8")
await client.query(sql)
await client.query("INSERT INTO _app_migrations (filename) VALUES ('20260504000009_invite_temp_password.sql') ON CONFLICT (filename) DO NOTHING")
console.log("Migration applied")
const { rows } = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='workspace_invites' AND column_name='temp_password'")
console.log("Verified column:", rows)
await client.end()
