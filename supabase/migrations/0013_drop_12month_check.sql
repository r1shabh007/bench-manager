-- The original inline CHECK (end_month < start_month + interval '12 months')
-- was never successfully dropped. Find and remove it by inspecting pg_constraint.
do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'reservations'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%12 mon%'
  loop
    execute 'alter table reservations drop constraint ' || quote_ident(r.conname);
  end loop;
end;
$$;

-- Ensure the 10-year constraint exists (idempotent).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'reservations'::regclass
      and conname = 'reservations_max_10_years'
  ) then
    alter table reservations add constraint reservations_max_10_years
      check (end_month < start_month + interval '120 months');
  end if;
end;
$$;
