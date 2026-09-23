-- Update create_reservation to allow up to 10 years (120 months) and dates through 2040.
create or replace function create_reservation(
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
  v_now_month date := date_trunc('month', v_today)::date;
  v_min_month date := date_trunc('year', v_today)::date;                -- Jan 1 current year
  v_max_month date := '2040-12-01'::date;                               -- Dec 2040
  v_caller uuid := auth.uid();
  v_is_admin boolean := public.is_admin();
begin
  if p_start <> date_trunc('month', p_start)::date
     or p_end <> date_trunc('month', p_end)::date then
    raise exception 'Start and end must be the first day of a month';
  end if;

  if p_end < p_start then
    raise exception 'End month cannot be before the start month';
  end if;

  v_months := (extract(year from p_end)::int - extract(year from p_start)::int) * 12
            + (extract(month from p_end)::int - extract(month from p_start)::int) + 1;

  if v_months < 1 or v_months > 120 then
    raise exception 'Adoptions must be between 1 and 120 months (10 years)';
  end if;

  if p_start < v_now_month then
    raise exception 'Cannot reserve months in the past';
  end if;

  if p_start < v_min_month or p_end > v_max_month then
    raise exception 'Adoptions must start in the current year or later and end by December 2040';
  end if;

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
