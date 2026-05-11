import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { readFileSync } from "fs";

const envText = readFileSync(".env.production.pulled", "utf8");
const env = Object.fromEntries(
  envText.split(/\r?\n/).filter(l => l && !l.startsWith("#") && l.includes("="))
    .map(l => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const targets = ["georgemoffat@orage.agency", "team@orage.agency"];
const { data, error } = await supabase.auth.admin.listUsers({ perPage: 200 });
if (error) { console.error(error); process.exit(1); }

for (const t of targets) {
  const u = data.users.find(x => x.email?.toLowerCase() === t.toLowerCase());
  if (!u) {
    console.log(`${t} :: NOT FOUND`);
    continue;
  }
  console.log(`${t}`);
  console.log(`  id=${u.id}`);
  console.log(`  email_confirmed_at=${u.email_confirmed_at}`);
  console.log(`  last_sign_in_at=${u.last_sign_in_at}`);
  console.log(`  banned_until=${u.banned_until ?? "null"}`);
  console.log(`  created_at=${u.created_at}`);
}

// Also show profile + membership for each
for (const t of targets) {
  const u = data.users.find(x => x.email?.toLowerCase() === t.toLowerCase());
  if (!u) continue;
  const { data: prof } = await supabase.from("profiles").select("id, email, display_name, onboarding_completed_at").eq("id", u.id).maybeSingle();
  console.log(`profile[${t}]`, prof);
  const { data: mems } = await supabase
    .from("workspace_memberships")
    .select("workspace_id, role, status, workspaces(slug, name)")
    .eq("user_id", u.id);
  console.log(`memberships[${t}]`, mems);
}
