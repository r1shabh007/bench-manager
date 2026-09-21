import "server-only";
import { cache } from "react";
import { createClient } from "./supabase/server";
import type { SessionUser } from "./types";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, email, is_admin")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    username: profile?.username ?? user.email?.split("@")[0] ?? "member",
    email: profile?.email ?? user.email ?? "",
    isAdmin: profile?.is_admin ?? false,
  };
});
