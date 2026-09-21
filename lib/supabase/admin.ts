import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for admin-only server code.
 *
 * SECURITY: This client bypasses Row Level Security. It must NEVER be imported
 * into a Client Component or shipped to the browser. The `server-only` import
 * above will make the build fail if that ever happens.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "Add them to .env.local and the Vercel project settings.",
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
