"use server";

import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { ensureProfile } from "@/lib/auth";

export interface AuthResult {
  ok: boolean;
  error?: string;
  needsConfirmation?: boolean;
  isAdmin?: boolean;
}

export interface UsernameCheck {
  available: boolean;
  /** False when we couldn't reach the profiles table/RPC (don't treat as taken). */
  checked: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeUsername(raw: string): string {
  return raw.trim();
}

async function emailForUsername(uname: string): Promise<string | null> {
  const admin = tryCreateAdminClient();
  if (admin) {
    const { data } = await admin.rpc("get_email_for_username", {
      p_username: uname,
    });
    if (typeof data === "string" && data) return data;

    // Fallback: scan auth users' metadata (covers accounts created before
    // the profiles table existed).
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const match = list?.users?.find((u) => {
      const meta = String(u.user_metadata?.username ?? "").trim().toLowerCase();
      return meta === uname.toLowerCase();
    });
    if (match?.email) return match.email;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_email_for_username", {
    p_username: uname,
  });
  if (!error && typeof data === "string" && data) return data;

  // Last resort: profiles row readable under RLS (own row only — useful if
  // the caller is already signed in; otherwise this returns nothing).
  const { data: row } = await supabase
    .from("profiles")
    .select("email")
    .ilike("username", uname)
    .maybeSingle();
  return row?.email ?? null;
}

/**
 * Log in with username + password. Supabase authenticates by email, so we look
 * up the email server-side and never return it to the client.
 */
export async function loginWithUsername(
  username: string,
  password: string,
): Promise<AuthResult> {
  const uname = normalizeUsername(username);
  if (!uname || !password) {
    return { ok: false, error: "Invalid username or password" };
  }

  let email: string | null = null;
  try {
    email = await emailForUsername(uname);
  } catch (err) {
    console.warn("[loginWithUsername]", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  if (!email) {
    return { ok: false, error: "Invalid username or password" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false, error: "Invalid username or password" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await ensureProfile(user);

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = profile?.is_admin ?? false;
  }

  return { ok: true, isAdmin };
}

/** Live username availability check (case-insensitive). */
export async function checkUsernameAvailable(
  username: string,
): Promise<UsernameCheck> {
  const uname = normalizeUsername(username);
  if (uname.length < 3) return { available: false, checked: true };

  const supabase = await createClient();

  const rpc = await supabase.rpc("username_available", { p_username: uname });
  if (!rpc.error) {
    return { available: rpc.data === true, checked: true };
  }

  // RPC missing (schema not applied yet). Try a direct read.
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", uname.replace(/[%_]/g, "\\$&"))
    .limit(1);

  if (error) {
    // Table doesn't exist yet — do NOT treat every name as taken.
    console.warn("[checkUsernameAvailable]", rpc.error.message, error.message);
    return { available: true, checked: false };
  }

  return { available: !data || data.length === 0, checked: true };
}

/**
 * Sign up with email, unique username, and any password. The username is stored
 * in auth user_metadata and in `profiles` (via trigger + an explicit insert).
 */
export async function signUpWithUsername(
  email: string,
  username: string,
  password: string,
  firstName: string,
  lastName: string,
): Promise<AuthResult> {
  const mail = email.trim();
  const uname = normalizeUsername(username);
  const fName = firstName.trim();
  const lName = lastName.trim();

  if (!fName || !lName) {
    return { ok: false, error: "First and last name are required." };
  }
  if (!EMAIL_RE.test(mail)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (uname.length < 3) {
    return { ok: false, error: "Username must be at least 3 characters." };
  }
  if (!password) {
    return { ok: false, error: "Enter a password." };
  }

  const availability = await checkUsernameAvailable(uname);
  if (availability.checked && !availability.available) {
    return { ok: false, error: "That username is already taken." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: mail,
    password,
    options: { data: { username: uname } },
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("already taken") || message.includes("unique")) {
      return { ok: false, error: "That username is already taken." };
    }
    return { ok: false, error: error.message };
  }

  if (data.user) {
    await ensureProfile(data.user, { firstName: fName, lastName: lName });
  }

  const needsConfirmation = !data.session;
  return { ok: true, needsConfirmation };
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
