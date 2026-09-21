-- Van Cortlandt Park Bench Adoption — schema
-- Regions
create type bench_region as enum ('north', 'central', 'south');

-- Benches
create table benches (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,          -- e.g. 'N5', 'C12', 'S30'
  region      bench_region not null,
  x_pct       numeric(6,3) not null,         -- 0–100, left position on the map image
  y_pct       numeric(6,3) not null,         -- 0–100, top position on the map image
  description text,
  created_at  timestamptz default now()
);

-- Profiles (1:1 with auth.users)
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text unique not null,
  email      text not null,
  is_admin   boolean not null default false,
  created_at timestamptz default now()
);
create unique index profiles_username_lower_idx on profiles (lower(username));

-- Reservations
create table reservations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  bench_id     uuid not null references benches(id) on delete cascade,
  start_month  date not null,               -- always the 1st of a month
  end_month    date not null,               -- always the 1st of the last reserved month (inclusive)
  status       text not null default 'active' check (status in ('active','cancelled')),
  created_by   uuid references profiles(id),  -- admin id if created by an admin
  created_at   timestamptz default now(),
  cancelled_at timestamptz,
  check (end_month >= start_month),
  check (end_month < start_month + interval '12 months')   -- max 12 months
);

-- One row per reserved bench-month. The unique constraint makes double booking impossible.
create table reservation_months (
  reservation_id uuid not null references reservations(id) on delete cascade,
  bench_id       uuid not null references benches(id) on delete cascade,
  month          date not null,             -- 1st of month
  primary key (reservation_id, month),
  unique (bench_id, month)
);

-- Helpful indexes for availability lookups and account/admin queries.
create index reservation_months_bench_month_idx on reservation_months (bench_id, month);
create index reservations_user_idx on reservations (user_id);
create index reservations_bench_idx on reservations (bench_id);
