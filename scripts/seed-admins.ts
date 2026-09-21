/**
 * Seed predefined admin accounts from ADMIN_EMAILS using the service-role
 * client. Each admin gets a generated password that is printed to the console
 * ONCE — copy it somewhere safe. Re-running is idempotent: existing users are
 * looked up and simply (re)flagged as admins.
 *
 * Usage:
 *   pnpm tsx scripts/seed-admins.ts
 * (loads .env.local automatically)
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Minimal .env.local loader (no dependency on dotenv).
function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env.local is optional if the env is already populated.
  }
}

function generatePassword() {
  // URL-safe, ~24 chars.
  return randomBytes(18).toString("base64url");
}

async function main() {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!url || !serviceKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
    process.exit(1);
  }
  if (adminEmails.length === 0) {
    console.error("ADMIN_EMAILS is empty. Set a comma-separated list in .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const email of adminEmails) {
    const username = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_");

    // Try to find an existing auth user with this email.
    const { data: list } = await supabase.auth.admin.listUsers();
    const existing = list?.users?.find(
      (u) => u.email?.toLowerCase() === email,
    );

    let userId = existing?.id;

    if (!userId) {
      const password = generatePassword();
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username },
      });
      if (error || !data.user) {
        console.error(`Failed to create ${email}:`, error?.message);
        continue;
      }
      userId = data.user.id;
      console.log(`Created admin ${email}`);
      console.log(`   username: ${username}`);
      console.log(`   password: ${password}   <-- shown once, save it now`);
    } else {
      console.log(`Admin ${email} already exists (${userId}); flagging as admin.`);
    }

    // Ensure a profile row exists (the trigger normally creates it) and flag admin.
    await supabase
      .from("profiles")
      .upsert(
        { id: userId, email, username, is_admin: true },
        { onConflict: "id" },
      );
    await supabase.from("profiles").update({ is_admin: true }).eq("id", userId);
  }

  console.log("Done seeding admins.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
