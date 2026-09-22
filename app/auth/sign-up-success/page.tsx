import Link from "next/link";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-park-border bg-park-surface p-6 shadow-sm">
          <h1 className="font-serif text-2xl text-park-green">
            Thank you for signing up!
          </h1>
          <p className="mt-2 text-sm text-park-muted">
            You&apos;ve successfully signed up. Please check your email to
            confirm your account before signing in.
          </p>
          <Link
            href="/auth/login"
            className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-park-green px-5 text-sm font-bold text-white transition-colors hover:bg-park-green/90"
          >
            Go to login
          </Link>
        </div>
      </div>
    </div>
  );
}
