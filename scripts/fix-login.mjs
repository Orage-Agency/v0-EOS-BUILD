import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { randomInt } from "crypto";

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

const password = "Hessed0411@";

const target = "georgemoffat@orage.agency";
const { data: list } = await supabase.auth.admin.listUsers({ perPage: 200 });
const u = list.users.find(x => x.email?.toLowerCase() === target);
if (!u) { console.error("user not found"); process.exit(1); }

// 1. Reset password
const { error: updErr } = await supabase.auth.admin.updateUserById(u.id, { password, email_confirm: true });
if (updErr) { console.error("password reset failed:", updErr); process.exit(1); }
console.log("password reset OK");

// 2. Ensure profile row exists
const { error: profErr } = await supabase.from("profiles").upsert({
  id: u.id,
  email: target,
  full_name: "George Moffat",
}, { onConflict: "id" });
if (profErr) { console.error("profile upsert failed:", profErr); process.exit(1); }
console.log("profile upsert OK");

console.log("");
console.log("==========================================");
console.log(`Email:    ${target}`);
console.log(`Password: ${password}`);
console.log("==========================================");
console.log("Login URL: https://flow.orage.agency/login");
