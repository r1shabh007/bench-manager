import { Suspense } from "react";
import Image from "next/image";
import { getBenches, getBookedMonths } from "@/lib/data";
import { ReservationProvider } from "@/components/reservation/reservation-provider";
import { BenchMap } from "@/components/bench-map/bench-map";
import { MapLegend } from "@/components/bench-map/map-legend";
import { HomeCta } from "@/components/home/home-cta";
import { AutoLogin } from "@/components/home/auto-login";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    n: "01",
    title: "Choose a bench",
    body: "Explore North, Central, and South park areas.",
  },
  {
    n: "02",
    title: "Choose your months",
    body: "Reserve consecutive months in the current or next year.",
  },
  {
    n: "03",
    title: "Make it yours",
    body: "Log in to confirm your adoption and support the park.",
  },
];

export default async function HomePage() {
  const [benches, booked] = await Promise.all([
    getBenches(),
    getBookedMonths(),
  ]);

  return (
    <div className="flex flex-col">
      <Suspense fallback={null}>
        <AutoLogin />
      </Suspense>

      {/* Hero */}
      <section className="flex flex-col items-center gap-10 px-5 py-14 sm:px-[72px] lg:flex-row lg:gap-14">
        <div className="flex flex-1 flex-col items-start gap-4">
          <p className="text-xs font-bold uppercase tracking-wide text-park-rust">
            Care for Van Cortlandt Park
          </p>
          <h1 className="font-serif text-4xl leading-[1.05] text-park-green sm:text-5xl">
            Adopt a bench. Leave a lasting welcome.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-park-muted">
            Choose from more than 500 park benches and support the places where
            neighbors rest, meet, and take in the landscape. Adopt for
            consecutive months—up to one year.
          </p>
          <HomeCta />
        </div>
        <div className="relative aspect-[620/430] w-full max-w-xl overflow-hidden rounded-[20px] lg:w-[620px]">
          <Image
            src="/hero-park.png"
            alt="A bench along a wooded path in Van Cortlandt Park"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 620px"
            className="object-cover"
          />
        </div>
      </section>

      {/* Program steps */}
      <section
        id="how-it-works"
        className="bg-park-sage px-5 py-9 sm:px-[72px]"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="flex flex-col gap-2 rounded-xl bg-park-surface p-5"
            >
              <p className="text-xs font-bold text-park-rust">{s.n}</p>
              <p className="font-serif text-xl text-park-green">{s.title}</p>
              <p className="text-[13px] leading-relaxed text-park-muted">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Bench availability preview (read-only map) */}
      <section className="flex flex-col gap-5 px-5 py-12 sm:px-[72px] sm:py-14">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-1.5">
            <h2 className="font-serif text-3xl text-park-green">
              Find your place in the park
            </h2>
            <p className="text-sm text-park-muted">
              A preview of current bench availability
            </p>
          </div>
          <MapLegend />
        </div>
        <ReservationProvider init={{ benches, booked }}>
          <BenchMap readOnly />
        </ReservationProvider>
      </section>
    </div>
  );
}
