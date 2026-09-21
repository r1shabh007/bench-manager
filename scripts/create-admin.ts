/**
 * Create the master admin account via the Supabase Auth sign-up API.
 * No service-role key required — uses the public anon key.
 *
 * Usage:
 *   npx tsx scripts/create-admin.ts
 *
 * After running, execute the printed SQL in your Supabase SQL Editor
 * to promote the account to admin.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ADMIN = {
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
  } catch {}
}

async function main() {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or anon key in .env.local");
    process.exit(1);
  }

  // Sign up through the Auth REST API.
  const resp = await fetch(`${url}/auth/v1/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
    },
    body: JSON.stringify({
      email: ADMIN.email,
      password: ADMIN.password,
      data: { username: ADMIN.username },
    }),
  });

  const body = await resp.json();

  if (!resp.ok) {
    if (body?.msg?.includes("already been registered") || body?.error_description?.includes("already been registered")) {
      console.log("Admin user already exists — skipping creation.");
    } else {
      console.error("Sign-up failed:", resp.status, JSON.stringify(body, null, 2));
      process.exit(1);
    }
  } else {
    console.log("Admin user created successfully.");
    if (body.confirmation_sent_at && !body.access_token) {
      console.log(
        "\nNote: Email confirmation may be required. Run this SQL in the",
        "Supabase SQL Editor to auto-confirm:\n",
      );
      console.log(
        `  UPDATE auth.users SET email_confirmed_at = now() WHERE email = '${ADMIN.email}';\n`,
      );
    }
  }

  console.log(
    "\nNow run this SQL in the Supabase SQL Editor to promote to admin:\n",
  );
  console.log("  ALTER TABLE public.profiles DISABLE TRIGGER profiles_guard_is_admin;");
  console.log(`  UPDATE public.profiles SET is_admin = true WHERE email = '${ADMIN.email}';`);
  console.log(`  UPDATE public.profiles SET is_admin = false WHERE email != '${ADMIN.email}';`);
  console.log("  ALTER TABLE public.profiles ENABLE TRIGGER profiles_guard_is_admin;\n");

  console.log(`  username: ${ADMIN.username}`);
  console.log(`  password: ${ADMIN.password}`);
  console.log(`  email:    ${ADMIN.email}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
