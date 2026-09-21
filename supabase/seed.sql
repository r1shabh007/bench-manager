-- Bench seed data.
--
-- TODO(spec): replace with real bench coordinates. The Figma map frame only
-- contains a decorative subset of dots without codes, so per spec §3 we
-- generate ~510 placeholder benches spread across three horizontal map bands
-- (north = top third, central = middle, south = bottom third). Positions are
-- stored as percentages (0–100) of the map image so they scale responsively.
-- The scatter is deterministic (derived from the bench index) so re-seeding is
-- stable.

truncate table benches restart identity cascade;

-- North band: y ≈ 6–32
insert into benches (code, region, x_pct, y_pct)
select
  'N' || g,
  'north'::bench_region,
  round((6 + mod(g * 61, 880) / 10.0)::numeric, 3),
  round((6 + mod(g * 37, 260) / 10.0)::numeric, 3)
from generate_series(1, 170) g;

-- Central band: y ≈ 36–62
insert into benches (code, region, x_pct, y_pct)
select
  'C' || g,
  'central'::bench_region,
  round((6 + mod(g * 61, 880) / 10.0)::numeric, 3),
  round((36 + mod(g * 37, 260) / 10.0)::numeric, 3)
from generate_series(1, 170) g;

-- South band: y ≈ 66–92
insert into benches (code, region, x_pct, y_pct)
select
  'S' || g,
  'south'::bench_region,
  round((6 + mod(g * 61, 880) / 10.0)::numeric, 3),
  round((66 + mod(g * 37, 260) / 10.0)::numeric, 3)
from generate_series(1, 170) g;
