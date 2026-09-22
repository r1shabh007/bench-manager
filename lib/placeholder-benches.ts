import type { Bench, Region } from "./types";

/**
 * Deterministic placeholder benches used when the database hasn't been seeded
 * yet. Scatters ~510 benches across Van Cortlandt Park's three regions.
 */
export function generatePlaceholderBenches(): Bench[] {
  const benches: Bench[] = [];
  pushBand(benches, "N", "north", 40.9020, 40.9120, 170);
  pushBand(benches, "C", "central", 40.8920, 40.9020, 170);
  pushBand(benches, "S", "south", 40.8830, 40.8920, 170);
  return benches;
}

const LNG_MIN = -73.9020;
const LNG_MAX = -73.8720;

function pushBand(
  out: Bench[],
  prefix: string,
  region: Region,
  latMin: number,
  latMax: number,
  count: number,
) {
  for (let g = 1; g <= count; g++) {
    out.push({
      id: `placeholder-${prefix}${g}`,
      code: `${prefix}${g}`,
      region,
      longitude: round6(LNG_MIN + ((g * 61) % 880) / 880 * (LNG_MAX - LNG_MIN)),
      latitude: round6(latMin + ((g * 37) % 260) / 260 * (latMax - latMin)),
      description: null,
      restricted: false,
    });
  }
}

function round6(n: number): number {
  return Math.round(n * 1000000) / 1000000;
}
