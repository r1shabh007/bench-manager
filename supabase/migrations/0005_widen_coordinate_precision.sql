-- Widen coordinate columns from numeric(6,3) to double precision
-- to support real lat/lng values with full precision.
alter table benches alter column x_pct type double precision;
alter table benches alter column y_pct type double precision;
