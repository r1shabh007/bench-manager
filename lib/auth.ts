import "server-only";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";
import type { SessionUser } from "./types";

export function usernameFromUser(user: User): string {
  const fromMeta = String(user.user_metadata?.username ?? "").trim();
  if (fromMeta) return fromMeta;
  return user.email?.split("@")[0] ?? "member";
}

/**
 * Make sure a `profiles` row exists for this auth user, using the username
 * stored in user_metadata. No-ops if the table hasn't been migrated yet.
 */
export async function ensureProfile(user: User): Promise<void> {
  const supabase = await createClient();
  const username = usernameFromUser(user);
  const email = user.email ?? "";

  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("id, username, email")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) {
    if (readError.code !== "PGRST205") {
      console.warn("[ensureProfile] read:", readError.message);
    }
    return;
  }

  if (existing) return;

  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    username,
    email,
    is_admin: false,
  });
  if (error) {
    console.warn("[ensureProfile] insert:", error.message);
  }
}

/**
 * Returns the signed-in user with profile info (username + is_admin), or null.
 * Cached per-request so multiple components can call it cheaply.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  await ensureProfile(user);

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, email, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    username: profile?.username || usernameFromUser(user),
    email: profile?.email || user.email || "",
    isAdmin: profile?.is_admin ?? false,
  };
});
