-- Convert legacy percentage-based coordinates (0-100 range) to real lat/lng.
-- Uses the same conversion formula as lib/data.ts pctToLng / pctToLat.
--
-- Park bounding box:
--   LNG: -73.9020 (west) to -73.8720 (east)
--   LAT:  40.8830 (south) to 40.9120 (north)
--
-- x_pct stored longitude:  lng = -73.9020 + (pct / 100) * (-73.8720 - (-73.9020))
--                             = -73.9020 + (pct / 100) * 0.0300
-- y_pct stored latitude:   lat =  40.9120 - (pct / 100) * (40.9120 - 40.8830)
--                             =  40.9120 - (pct / 100) * 0.0290

UPDATE benches
SET
  x_pct = -73.9020 + (x_pct / 100.0) * 0.0300,
  y_pct =  40.9120 - (y_pct / 100.0) * 0.0290
WHERE x_pct >= 0 AND x_pct <= 100
  AND y_pct >= 0 AND y_pct <= 100;
