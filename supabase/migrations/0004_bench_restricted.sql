-- Add restricted flag to benches (admin-only toggle).
-- Restricted benches show "restricted" in the admin panel, "unavailable" publicly.
alter table benches add column restricted boolean not null default false;
