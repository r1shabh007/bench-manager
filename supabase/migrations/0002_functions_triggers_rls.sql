-- Functions, triggers, and Row Level Security.

-- Admin helper used by RLS policies and functions.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

-- Create a profile whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent non-admins from escalating their own is_admin flag. The service-role
-- key (used by the admin seed script) bypasses this guard.
create or replace function public.guard_profile_is_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin
     and coalesce(auth.role(), '') <> 'service_role'
     and not public.is_admin() then
    raise exception 'You cannot change admin status';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_is_admin on profiles;
create trigger profiles_guard_is_admin
  before update on profiles
  for each row execute function public.guard_profile_is_admin();

-- Atomic reservation creation. Runs as one transaction; the unique constraint on
-- reservation_months(bench_id, month) makes double booking impossible even under
-- concurrent requests.
create or replace function public.create_reservation(
  p_user_id uuid,
  p_bench_id uuid,
  p_start date,
  p_end date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation_id uuid;
  v_bench_code text;
  v_month date;
  v_months int;
  v_today date := (now() at time zone 'America/New_York')::date;
  v_now_month date := date_trunc('month', v_today)::date;               -- 1st of current month
  v_min_month date := date_trunc('year', v_today)::date;                -- Jan 1 current year
  v_max_month date := (date_trunc('year', v_today) + interval '1 year' + interval '11 months')::date; -- Dec 1 next year
  v_caller uuid := auth.uid();
  v_is_admin boolean := public.is_admin();
begin
  -- Months must be the first day of a month.
  if p_start <> date_trunc('month', p_start)::date
     or p_end <> date_trunc('month', p_end)::date then
    raise exception 'Start and end must be the first day of a month';
  end if;

  if p_end < p_start then
    raise exception 'End month cannot be before the start month';
  end if;

  v_months := (extract(year from p_end)::int - extract(year from p_start)::int) * 12
            + (extract(month from p_end)::int - extract(month from p_start)::int) + 1;

  if v_months < 1 or v_months > 12 then
    raise exception 'Reservations must be between 1 and 12 months';
  end if;

  if p_start < v_now_month then
    raise exception 'Cannot reserve months in the past';
  end if;

  if p_start < v_min_month or p_end > v_max_month then
    raise exception 'Reservations must be within the current and next calendar year';
  end if;

  -- Non-admins may only book for themselves.
  if not v_is_admin and (v_caller is null or p_user_id <> v_caller) then
    raise exception 'You can only create reservations for yourself';
  end if;

  select code into v_bench_code from benches where id = p_bench_id;
  if v_bench_code is null then
    raise exception 'Bench not found';
  end if;

  insert into reservations (user_id, bench_id, start_month, end_month, created_by)
  values (
    p_user_id,
    p_bench_id,
    p_start,
    p_end,
    case when v_is_admin then v_caller else null end
  )
  returning id into v_reservation_id;

  v_month := p_start;
  while v_month <= p_end loop
    begin
      insert into reservation_months (reservation_id, bench_id, month)
      values (v_reservation_id, p_bench_id, v_month);
    exception when unique_violation then
      raise exception 'Bench % is already reserved for one or more selected months', v_bench_code;
    end;
    v_month := (v_month + interval '1 month')::date;
  end loop;

  return v_reservation_id;
end;
$$;

-- Cancel a reservation: mark cancelled and free future months so they become
-- bookable again. Current and past months stay recorded for history (spec §9).
create or replace function public.cancel_reservation(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_today date := (now() at time zone 'America/New_York')::date;
  v_now_month date := date_trunc('month', v_today)::date;
begin
  select user_id into v_owner from reservations where id = p_reservation_id;
  if v_owner is null then
    raise exception 'Reservation not found';
  end if;

  if not public.is_admin() and (auth.uid() is null or v_owner <> auth.uid()) then
    raise exception 'You can only cancel your own reservations';
  end if;

  update reservations
     set status = 'cancelled', cancelled_at = now()
   where id = p_reservation_id and status = 'active';

  delete from reservation_months
   where reservation_id = p_reservation_id and month > v_now_month;
end;
$$;

-- Live username availability check for signup (case-insensitive). Safe to call
-- from the browser: returns only a boolean, never any profile data.
create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from profiles where lower(username) = lower(p_username)
  );
$$;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- Resolve a username to its email for username+password login. NOT exposed to
-- the browser (only the service-role admin client may call it) so emails can't
-- be enumerated.
create or replace function public.get_email_for_username(p_username text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email from profiles where lower(username) = lower(p_username) limit 1;
$$;
revoke all on function public.get_email_for_username(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table benches enable row level security;
alter table profiles enable row level security;
alter table reservations enable row level security;
alter table reservation_months enable row level security;

-- benches: anyone can read; only admins can write.
create policy "benches_select_all" on benches
  for select using (true);
create policy "benches_admin_insert" on benches
  for insert with check (public.is_admin());
create policy "benches_admin_update" on benches
  for update using (public.is_admin()) with check (public.is_admin());
create policy "benches_admin_delete" on benches
  for delete using (public.is_admin());

-- reservation_months: anyone can read (public availability, no personal data).
-- Writes happen only through security-definer functions.
create policy "reservation_months_select_all" on reservation_months
  for select using (true);

-- reservations: users see their own; admins see all.
create policy "reservations_select_own_or_admin" on reservations
  for select using (auth.uid() = user_id or public.is_admin());
-- users may update only their own active rows (to cancel); admins full access.
create policy "reservations_update_own_active" on reservations
  for update using (
    (auth.uid() = user_id and status = 'active') or public.is_admin()
  ) with check (
    auth.uid() = user_id or public.is_admin()
  );
create policy "reservations_admin_insert" on reservations
  for insert with check (public.is_admin() or auth.uid() = user_id);
create policy "reservations_admin_delete" on reservations
  for delete using (public.is_admin());

-- profiles: users read/update their own row; admins read all.
create policy "profiles_select_own_or_admin" on profiles
  for select using (auth.uid() = id or public.is_admin());
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());
