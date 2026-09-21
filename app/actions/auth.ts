"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AuthResult {
  ok: boolean;
  error?: string;
  needsConfirmation?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Log in with username + password. Supabase authenticates by email, so we look
 * up the email server-side with the service-role client (never returned to the
 * client) and then sign in with the SSR server client so the cookie is set.
 */
export async function loginWithUsername(
  username: string,
  password: string,
): Promise<AuthResult> {
  const uname = username.trim();
  if (!uname || !password) {
    return { ok: false, error: "Invalid username or password" };
  }

  let email: string | null = null;
  try {
    const admin = createAdminClient();
    const { data } = await admin.rpc("get_email_for_username", {
      p_username: uname,
    });
    email = (data as string | null) ?? null;
  } catch {
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  // Generic message on any failure so usernames/emails can't be probed.
  if (!email) {
    return { ok: false, error: "Invalid username or password" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false, error: "Invalid username or password" };
  }
  return { ok: true };
}

/** Live username availability check (case-insensitive). */
export async function checkUsernameAvailable(
  username: string,
): Promise<boolean> {
  const uname = username.trim();
  if (uname.length < 3) return false;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("username_available", {
    p_username: uname,
  });
  if (error) return false;
  return Boolean(data);
}

/**
 * Sign up with email, unique username, and any password. The DB trigger creates
 * the matching profile row from the username in user metadata.
 */
export async function signUpWithUsername(
  email: string,
  username: string,
  password: string,
): Promise<AuthResult> {
  const mail = email.trim();
  const uname = username.trim();

  if (!EMAIL_RE.test(mail)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (uname.length < 3) {
    return { ok: false, error: "Username must be at least 3 characters." };
  }
  if (!password) {
    return { ok: false, error: "Enter a password." };
  }

  // Final server-side uniqueness check (the DB also enforces this).
  const available = await checkUsernameAvailable(uname);
  if (!available) {
    return { ok: false, error: "That username is already taken." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: mail,
    password,
    options: { data: { username: uname } },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  // If email confirmation is off, a session is set and the user is logged in.
  // If it's on, there is no session yet.
  const needsConfirmation = !data.session;
  return { ok: true, needsConfirmation };
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
