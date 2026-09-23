"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import {
  loginWithUsername,
  signUpWithUsername,
  checkUsernameAvailable,
} from "@/app/actions/auth";
import type { AuthTab } from "./auth-modal-provider";

interface AuthModalProps {
  open: boolean;
  tab: AuthTab;
  onTabChange: (tab: AuthTab) => void;
  onOpenChange: (open: boolean) => void;
  onSuccess: (info: { isAdmin: boolean }) => void;
}

export function AuthModal({
  open,
  tab,
  onTabChange,
  onOpenChange,
  onSuccess,
}: AuthModalProps) {
  const [awaitingConfirm, setAwaitingConfirm] = React.useState(false);

  React.useEffect(() => {
    if (!open || tab !== "signup") {
      setAwaitingConfirm(false);
    }
  }, [open, tab]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm gap-3 p-5">
        <div className="flex flex-col gap-1">
          <DialogTitle className={awaitingConfirm ? "text-lg" : undefined}>
            {awaitingConfirm
              ? "Check your email"
              : tab === "login"
                ? "Welcome back"
                : "Create your account"}
          </DialogTitle>
          {!awaitingConfirm && (
            <p className="text-sm text-park-muted">
              {tab === "login"
                ? "Log in to reserve a bench or view your adoptions."
                : "Sign up to adopt a bench in Van Cortlandt Park."}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-full bg-park-sage/60 p-1">
          <TabButton
            active={tab === "login"}
            onClick={() => {
              setAwaitingConfirm(false);
              onTabChange("login");
            }}
          >
            Login
          </TabButton>
          <TabButton
            active={tab === "signup"}
            onClick={() => {
              setAwaitingConfirm(false);
              onTabChange("signup");
            }}
          >
            Sign Up
          </TabButton>
        </div>

        {awaitingConfirm ? (
          <p className="text-sm leading-relaxed text-park-green">
            A confirmation email has been sent. Check your inbox to confirm
            your account, then log in.
          </p>
        ) : tab === "login" ? (
          <LoginForm onSuccess={onSuccess} />
        ) : (
          <SignupForm
            open={open}
            onSuccess={onSuccess}
            onAwaitingConfirm={() => setAwaitingConfirm(true)}
          />
        )}

        {!awaitingConfirm && (
          <p className="text-center text-xs text-park-muted">
            Account pages require login. Need help? Contact park support.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full py-2 text-sm font-semibold transition-colors",
        active
          ? "bg-park-surface text-park-green shadow-sm"
          : "text-park-muted hover:text-park-green",
      )}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-park-ink">{label}</span>
      {children}
      {hint}
    </label>
  );
}

function LoginForm({ onSuccess }: { onSuccess: (info: { isAdmin: boolean }) => void }) {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await loginWithUsername(username, password);
    setLoading(false);
    if (res.ok) {
      onSuccess({ isAdmin: res.isAdmin ?? false });
    } else {
      setError(res.error ?? "Invalid username or password");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Field label="Username">
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          className="h-11 bg-park-surface"
          required
        />
      </Field>
      <Field label="Password">
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="h-11 bg-park-surface"
          required
        />
      </Field>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <SubmitButton loading={loading}>Log in</SubmitButton>
    </form>
  );
}

function SignupForm({
  open,
  onSuccess,
  onAwaitingConfirm,
}: {
  open: boolean;
  onSuccess: (info: { isAdmin: boolean }) => void;
  onAwaitingConfirm: () => void;
}) {
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [usernameState, setUsernameState] = React.useState<
    "idle" | "checking" | "available" | "taken" | "short"
  >("idle");

  React.useEffect(() => {
    if (!open) {
      setError(null);
    }
  }, [open]);

  // Live username availability check (debounced).
  React.useEffect(() => {
    const uname = username.trim();
    if (uname.length < 3) {
      setUsernameState(uname.length === 0 ? "idle" : "short");
      return undefined;
    }
    setUsernameState("checking");
    const handle = window.setTimeout(async () => {
      const result = await checkUsernameAvailable(uname);
      if (!result.checked) {
        setUsernameState("idle");
        return;
      }
      setUsernameState(result.available ? "available" : "taken");
    }, 400);
    return () => window.clearTimeout(handle);
  }, [username]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (usernameState === "taken") {
      setError("That username is already taken.");
      return;
    }
    setLoading(true);
    const res = await signUpWithUsername(email, username, password, firstName, lastName);
    setLoading(false);
    if (res.ok) {
      if (res.needsConfirmation) {
        onAwaitingConfirm();
        return;
      }
      onSuccess({ isAdmin: false });
    } else {
      setError(res.error ?? "Could not create your account.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name">
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            className="h-11 bg-park-surface"
            required
          />
        </Field>
        <Field label="Last name">
          <Input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
            className="h-11 bg-park-surface"
            required
          />
        </Field>
      </div>
      <Field label="Email">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="h-11 bg-park-surface"
          required
        />
      </Field>
      <Field
        label="Username"
        hint={<UsernameHint state={usernameState} />}
      >
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          className="h-11 bg-park-surface"
          required
        />
      </Field>
      <Field label="Password">
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          className="h-11 bg-park-surface"
          required
        />
      </Field>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <SubmitButton loading={loading}>Create account</SubmitButton>
    </form>
  );
}

function UsernameHint({
  state,
}: {
  state: "idle" | "checking" | "available" | "taken" | "short";
}) {
  if (state === "idle") {
    return null;
  }
  const map = {
    checking: { text: "Checking availability…", cls: "text-park-muted" },
    available: { text: "Username is available.", cls: "text-park-green" },
    taken: { text: "That username is already taken.", cls: "text-destructive" },
    short: {
      text: "Username must be at least 3 characters.",
      cls: "text-park-muted",
    },
  } as const;
  const { text, cls } = map[state];
  return (
    <span className={cn("min-h-4 text-xs", cls)}>{text}</span>
  );
}

function SubmitButton({
  loading,
  children,
}: {
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-park-green px-4 text-sm font-bold text-white transition-colors hover:bg-park-green/90 disabled:opacity-60"
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}
