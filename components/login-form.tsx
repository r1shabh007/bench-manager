"use client";

import { cn } from "@/lib/utils";
import { loginWithUsername } from "@/app/actions/auth";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await loginWithUsername(username, password);
      if (!result.ok) {
        setError(result.error ?? "An error occurred");
        return;
      }
      router.push("/reservation");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="rounded-2xl border border-park-border bg-park-surface p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-1">
          <h1 className="font-serif text-2xl text-park-green">Welcome back</h1>
          <p className="text-sm text-park-muted">
            Enter your username below to login to your account
          </p>
        </div>
        <form onSubmit={handleLogin}>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-park-ink">Username</span>
              <Input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11 rounded-lg bg-park-bg"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <div className="flex items-center">
                <span className="text-sm font-semibold text-park-ink">Password</span>
                <Link
                  href="/auth/forgot-password"
                  className="ml-auto text-xs font-medium text-park-green hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-lg bg-park-bg"
              />
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-park-green text-sm font-bold text-white transition-colors hover:bg-park-green/90 disabled:opacity-60"
            >
              {isLoading && <Loader2 className="size-4 animate-spin" />}
              {isLoading ? "Logging in…" : "Login"}
            </button>
          </div>
          <p className="mt-4 text-center text-sm text-park-muted">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/sign-up"
              className="font-semibold text-park-green hover:underline"
            >
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
