-- Nudge benches that share identical coordinates so they don't overlap on the map.
-- For each group of duplicates, the first bench stays put and the rest are
-- spread in a small circle (~5-8 meters radius) around the original position.

DO $$
DECLARE
  rec RECORD;
  grp_size INT;
  idx INT;
  angle DOUBLE PRECISION;
  radius DOUBLE PRECISION;
BEGIN
  FOR rec IN
    WITH ranked AS (
      SELECT
        id,
        x_pct,
        y_pct,
        ROW_NUMBER() OVER (
          PARTITION BY ROUND(x_pct::numeric, 6), ROUND(y_pct::numeric, 6)
          ORDER BY code
        ) AS rn,
        COUNT(*) OVER (
          PARTITION BY ROUND(x_pct::numeric, 6), ROUND(y_pct::numeric, 6)
        ) AS cnt
      FROM benches
    )
    SELECT id, x_pct, y_pct, rn, cnt
    FROM ranked
    WHERE cnt > 1 AND rn > 1
  LOOP
    grp_size := rec.cnt;
    idx := rec.rn;
    angle := (2.0 * 3.141592653589793 * idx) / grp_size;
    radius := 0.00005 + 0.00003 * (idx - 1);
    UPDATE benches
    SET x_pct = rec.x_pct + radius * COS(angle),
        y_pct = rec.y_pct + radius * SIN(angle)
    WHERE id = rec.id;
  END LOOP;
END $$;
