"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="rounded-2xl border border-park-border bg-park-surface p-6 shadow-sm">
        {success ? (
          <>
            <h1 className="font-serif text-2xl text-park-green">Check your email</h1>
            <p className="mt-2 text-sm text-park-muted">
              If you registered using your email and password, you will receive
              a password reset email.
            </p>
          </>
        ) : (
          <>
            <div className="mb-5 flex flex-col gap-1">
              <h1 className="font-serif text-2xl text-park-green">Reset your password</h1>
              <p className="text-sm text-park-muted">
                Type in your email and we&apos;ll send you a link to reset your
                password
              </p>
            </div>
            <form onSubmit={handleForgotPassword}>
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
                {error && <p className="text-sm text-destructive">{error}</p>}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-park-green text-sm font-bold text-white transition-colors hover:bg-park-green/90 disabled:opacity-60"
                >
                  {isLoading && <Loader2 className="size-4 animate-spin" />}
                  {isLoading ? "Sending…" : "Send reset email"}
                </button>
              </div>
              <p className="mt-4 text-center text-sm text-park-muted">
                Already have an account?{" "}
                <Link
                  href="/auth/login"
                  className="font-semibold text-park-green hover:underline"
                >
                  Login
                </Link>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
