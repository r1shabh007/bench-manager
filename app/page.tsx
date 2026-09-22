import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { getBenches, getBookedMonths } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { ReservationProvider } from "@/components/reservation/reservation-provider";
import { BenchMap } from "@/components/bench-map/bench-map";
import { MapLegend } from "@/components/bench-map/map-legend";
import { HomeCta } from "@/components/home/home-cta";
import { AutoLogin } from "@/components/home/auto-login";
import { TreeDeciduous, MapPin, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";


export default async function HomePage() {
  const [benches, booked, user] = await Promise.all([
    getBenches(),
    getBookedMonths(),
    getSessionUser(),
  ]);

  const availableCount = benches.filter((b) => !b.restricted).length;

  return (
    <div className="flex flex-col">
      <Suspense fallback={null}>
        <AutoLogin />
      </Suspense>

      {/* Hero */}
      <section className="relative overflow-hidden bg-park-green">
        <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-park-sage/10" />
        <div className="relative flex flex-col items-center gap-10 px-5 py-16 sm:px-[72px] sm:py-20 lg:flex-row lg:gap-14">
          <div className="flex flex-1 flex-col items-start gap-5">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1 text-xs font-bold uppercase tracking-wide text-park-sage">
              <TreeDeciduous className="size-3.5" />
              Van Cortlandt Park
            </p>
            <h1 className="font-serif text-4xl leading-[1.05] text-white sm:text-5xl lg:text-[3.5rem]">
              Adopt a bench.
              <br />
              <span className="text-park-sage">Leave a lasting welcome.</span>
            </h1>
            <p className="max-w-lg text-lg leading-relaxed text-white/70">
              Choose from more than {availableCount} park benches and support the
              places where neighbors rest, meet, and take in the landscape.
            </p>
            <HomeCta loggedIn={!!user} />
          </div>
          <div className="relative w-full max-w-xl lg:w-[580px]">
            <div className="absolute -inset-3 rounded-[28px] bg-white/5" />
            <div className="relative aspect-[620/430] overflow-hidden rounded-[20px] shadow-2xl ring-1 ring-white/10">
              <Image
                src="/hero-park.png"
                alt="A bench along a wooded path in Van Cortlandt Park"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 580px"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Highlights strip */}
      <section className="border-y border-park-green/10 bg-park-sage/40">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-6 px-5 py-6 sm:flex-row sm:gap-12 sm:divide-x sm:divide-park-green/15 sm:py-5">
          <div className="flex items-center gap-3 sm:pr-12">
            <div className="flex size-10 items-center justify-center rounded-full bg-park-green/10">
              <MapPin className="size-5 text-park-green" />
            </div>
            <div>
              <p className="text-xl font-bold text-park-green">{availableCount}+</p>
              <p className="text-xs text-park-muted">Benches available</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:pl-12 sm:pr-12">
            <div className="flex size-10 items-center justify-center rounded-full bg-park-green/10">
              <Calendar className="size-5 text-park-green" />
            </div>
            <div>
              <p className="text-xl font-bold text-park-green">1–12</p>
              <p className="text-xs text-park-muted">Months per adoption</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:pl-12">
            <div className="flex size-10 items-center justify-center rounded-full bg-park-green/10">
              <TreeDeciduous className="size-5 text-park-green" />
            </div>
            <div>
              <p className="text-xl font-bold text-park-green">Bronx, NY</p>
              <p className="text-xs text-park-muted">Van Cortlandt Park</p>
            </div>
          </div>
        </div>
      </section>

      {/* Bench availability preview (read-only map) */}
      <section className="flex flex-col gap-6 px-5 py-14 sm:px-[72px] sm:py-16">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5">
            <h2 className="font-serif text-3xl text-park-green">
              Find your place in the park
            </h2>
            <p className="text-sm text-park-muted">
              Browse bench locations and availability across all regions
            </p>
          </div>
          <MapLegend />
        </div>
        <div className="overflow-hidden rounded-2xl border border-park-border/60 shadow-sm">
          <ReservationProvider init={{ benches, booked }}>
            <BenchMap readOnly />
          </ReservationProvider>
        </div>
        <div className="flex justify-center pt-2">
          <Link
            href="/reservation"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-park-green px-6 text-sm font-bold text-white transition-all hover:bg-park-green/90 hover:shadow-md"
          >
            Explore all benches
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
