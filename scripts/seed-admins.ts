/**
 * Seed the master admin account using the service-role client.
 * Re-running is idempotent: if the admin user already exists it is
 * simply (re)flagged as admin.
 *
 * Usage:
 *   pnpm tsx scripts/seed-admins.ts
 * (loads .env.local automatically)
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const MASTER_ADMIN = {
  email: "ra3528@columbia.edu",
  username: "admin",
  password: "password",
};

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

async function main() {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { email, username, password } = MASTER_ADMIN;

  // Check if the admin user already exists.
  const { data: list } = await supabase.auth.admin.listUsers();
  const existing = list?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );

  let userId = existing?.id;

  if (!userId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username },
    });
    if (error || !data.user) {
      console.error(`Failed to create master admin:`, error?.message);
      process.exit(1);
    }
    userId = data.user.id;
    console.log(`Created master admin account`);
    console.log(`  email:    ${email}`);
    console.log(`  username: ${username}`);
    console.log(`  password: ${password}`);
  } else {
    // Update password in case it was changed, so re-running resets it.
    await supabase.auth.admin.updateUserById(userId, { password });
    console.log(`Master admin already exists (${userId}); ensured admin flag.`);
  }

  // Ensure profile row exists and is_admin = true.
  await supabase
    .from("profiles")
    .upsert(
      { id: userId, email, username, is_admin: true },
      { onConflict: "id" },
    );

  // Ensure all other users are NOT admins.
  const { error: demoteError } = await supabase
    .from("profiles")
    .update({ is_admin: false })
    .neq("id", userId);

  if (demoteError) {
    console.warn("Warning: could not demote other users:", demoteError.message);
  } else {
    console.log("Ensured all other users are non-admin.");
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
