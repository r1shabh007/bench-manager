import type { Bench, Region } from "./types";

/**
 * Deterministic placeholder benches used when the database hasn't been seeded
 * yet. Matches `supabase/seed.sql` (north/central/south bands, ~510 benches).
 *
 * TODO(spec): replace with real bench coordinates from the park survey.
 */
export function generatePlaceholderBenches(): Bench[] {
  const benches: Bench[] = [];
  pushBand(benches, "N", "north", 6, 170);
  pushBand(benches, "C", "central", 36, 170);
  pushBand(benches, "S", "south", 66, 170);
  return benches;
}

function pushBand(
  out: Bench[],
  prefix: string,
  region: Region,
  yBase: number,
  count: number,
) {
  for (let g = 1; g <= count; g++) {
    out.push({
      id: `placeholder-${prefix}${g}`,
      code: `${prefix}${g}`,
      region,
      x_pct: round3(6 + ((g * 61) % 880) / 10),
      y_pct: round3(yBase + ((g * 37) % 260) / 10),
      description: null,
    });
  }
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
