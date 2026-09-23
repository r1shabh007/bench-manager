"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthModal } from "@/components/auth-modal/auth-modal-provider";
import { logout } from "@/app/actions/auth";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/types";
import { LogOut, Menu, X } from "lucide-react";

export function Nav({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const { open } = useAuthModal();
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    setLoggingOut(false);
    router.refresh();
    router.push("/");
  }

  const links: { href: string; label: string }[] = [
    { href: "/", label: "Home" },
    { href: "/reservation", label: "Adoption" },
    { href: "/account", label: "Account" },
  ];
  if (user?.isAdmin) links.push({ href: "/admin", label: "Admin" });

  return (
    <header className="sticky top-0 z-[1000] flex h-[76px] w-full items-center justify-between border-b border-park-border bg-park-surface px-5 sm:px-14">
      <Link href="/" className="flex items-center gap-2.5">
        <img
          src="/brand/vcp-logo.png"
          alt=""
          width={32}
          height={32}
        />
        <span className="flex flex-col leading-none">
          <span className="font-serif text-xl font-bold text-park-green">
            Van Cortlandt
          </span>
          <span className="text-[10px] uppercase tracking-wide text-park-rust">
            Bench adoption
          </span>
        </span>
      </Link>

      <nav className="flex items-center gap-4 sm:gap-7">
        <div className="hidden items-center gap-4 sm:flex sm:gap-7">
          {links.map((l) => {
            const active =
              l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            const needsAuth = !user && l.href === "/account";
            const cls = cn(
              "text-sm transition-colors",
              active
                ? "font-bold text-park-green underline underline-offset-4"
                : "font-medium text-park-muted hover:text-park-green",
            );
            if (needsAuth) {
              return (
                <button
                  key={l.href}
                  onClick={() =>
                    open({
                      tab: "login",
                      onSuccess: ({ isAdmin }) =>
                        router.push(isAdmin ? "/admin" : "/account"),
                    })
                  }
                  className={cls}
                >
                  {l.label}
                </button>
              );
            }
            return (
              <Link key={l.href} href={l.href} className={cls}>
                {l.label}
              </Link>
            );
          })}
        </div>

        {user ? (
          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-semibold text-park-ink sm:inline">
              {user.firstName || user.username}
            </span>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-park-green px-4 text-sm font-bold text-park-green transition-colors hover:bg-park-sage/50 disabled:opacity-60"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() =>
              open({
                tab: "login",
                onSuccess: ({ isAdmin }) =>
                  router.push(isAdmin ? "/admin" : "/account"),
              })
            }
            className="inline-flex h-11 items-center justify-center rounded-full bg-park-green px-5 text-sm font-bold text-white transition-colors hover:bg-park-green/90"
          >
            <span className="sm:hidden">Login</span>
            <span className="hidden sm:inline">Login / Sign Up</span>
          </button>
        )}

        {/* Mobile menu button */}
        <div className="relative sm:hidden">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="inline-flex size-10 items-center justify-center rounded-lg text-park-green transition-colors hover:bg-park-sage/50"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-park-border bg-park-surface py-2 shadow-lg">
              {links.map((l) => {
                const active =
                  l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
                const needsAuth = !user && l.href === "/account";
                if (needsAuth) {
                  return (
                    <button
                      key={l.href}
                      onClick={() => {
                        setMenuOpen(false);
                        open({
                          tab: "login",
                          onSuccess: ({ isAdmin }) =>
                            router.push(isAdmin ? "/admin" : "/account"),
                        });
                      }}
                      className={cn(
                        "block w-full px-4 py-2.5 text-left text-sm transition-colors",
                        active
                          ? "font-bold text-park-green"
                          : "font-medium text-park-muted hover:bg-park-sage/40 hover:text-park-green",
                      )}
                    >
                      {l.label}
                    </button>
                  );
                }
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "block px-4 py-2.5 text-sm transition-colors",
                      active
                        ? "font-bold text-park-green"
                        : "font-medium text-park-muted hover:bg-park-sage/40 hover:text-park-green",
                    )}
                  >
                    {l.label}
                  </Link>
                );
              })}
              {user && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleLogout();
                  }}
                  disabled={loggingOut}
                  className="block w-full border-t border-park-border px-4 py-2.5 text-left text-sm font-medium text-park-muted transition-colors hover:bg-park-sage/40 hover:text-park-green"
                >
                  Log out
                </button>
              )}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
