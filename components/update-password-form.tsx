"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
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
          <h1 className="font-serif text-2xl text-park-green">Reset your password</h1>
          <p className="text-sm text-park-muted">
            Please enter your new password below.
          </p>
        </div>
        <form onSubmit={handleUpdatePassword}>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-park-ink">New password</span>
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
              {isLoading ? "Saving…" : "Save new password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
