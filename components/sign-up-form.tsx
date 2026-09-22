"use client";

import { cn } from "@/lib/utils";
import { signUpWithUsername, checkUsernameAvailable } from "@/app/actions/auth";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (username.length < 3) {
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus("checking");
    const timeout = setTimeout(async () => {
      const result = await checkUsernameAvailable(username);
      setUsernameStatus(result.available ? "available" : "taken");
    }, 400);
    return () => clearTimeout(timeout);
  }, [username]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const result = await signUpWithUsername(email, username, password);
      if (!result.ok) {
        setError(result.error ?? "An error occurred");
        return;
      }
      if (result.needsConfirmation) {
        router.push("/auth/sign-up-success");
      } else {
        router.push("/reservation");
      }
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
          <h1 className="font-serif text-2xl text-park-green">Create your account</h1>
          <p className="text-sm text-park-muted">
            Sign up to adopt a bench in Van Cortlandt Park
          </p>
        </div>
        <form onSubmit={handleSignUp}>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-park-ink">Email</span>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-lg bg-park-bg"
              />
            </label>
            <div className="flex flex-col gap-1.5">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-park-ink">Username</span>
                <Input
                  type="text"
                  required
                  minLength={3}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11 rounded-lg bg-park-bg"
                />
              </label>
              {usernameStatus === "checking" && (
                <p className="text-xs text-park-muted">Checking availability…</p>
              )}
              {usernameStatus === "available" && (
                <p className="text-xs text-park-green">Username is available</p>
              )}
              {usernameStatus === "taken" && (
                <p className="text-xs text-destructive">Username is already taken</p>
              )}
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-park-ink">Password</span>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-lg bg-park-bg"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-park-ink">Repeat Password</span>
              <Input
                type="password"
                required
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
                className="h-11 rounded-lg bg-park-bg"
              />
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={isLoading || usernameStatus === "taken"}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-park-green text-sm font-bold text-white transition-colors hover:bg-park-green/90 disabled:opacity-60"
            >
              {isLoading && <Loader2 className="size-4 animate-spin" />}
              {isLoading ? "Creating account…" : "Sign up"}
            </button>
          </div>
          <p className="mt-4 text-center text-sm text-park-muted">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-semibold text-park-green hover:underline">
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
