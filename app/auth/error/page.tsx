import Link from "next/link";
import { Suspense } from "react";

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const params = await searchParams;

  return (
    <p className="text-sm text-park-muted">
      {params?.error
        ? `Code error: ${params.error}`
        : "An unspecified error occurred."}
    </p>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-park-border bg-park-surface p-6 shadow-sm">
          <h1 className="font-serif text-2xl text-park-green">
            Sorry, something went wrong.
          </h1>
          <div className="mt-2">
            <Suspense>
              <ErrorContent searchParams={searchParams} />
            </Suspense>
          </div>
          <Link
            href="/"
            className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-park-green px-5 text-sm font-bold text-white transition-colors hover:bg-park-green/90"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
