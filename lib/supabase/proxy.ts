import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // If the env vars are not set, skip the auth check.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and getClaims().
  // IMPORTANT: getClaims() refreshes the session so users aren't logged out.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const pathname = request.nextUrl.pathname;

  // Protect /account — logged-out users are sent Home with ?login=1 so Home can
  // auto-open the auth modal and resume the intended flow (spec §4).
  if (pathname.startsWith("/account") && !claims) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "?login=1";
    return NextResponse.redirect(url);
  }

  // Protect /admin — logged-out users go to Home with ?login=1; non-admins are
  // redirected Home. `is_admin` lives on the profile, checked below.
  if (pathname.startsWith("/admin")) {
    if (!claims) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "?login=1";
      return NextResponse.redirect(url);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", claims.sub)
      .single();

    if (!profile?.is_admin) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as-is to keep the
  // browser and server sessions in sync.
  return supabaseResponse;
}
