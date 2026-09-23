-- List and drop ALL check constraints on reservations that cap end_month
-- relative to start_month (regardless of how Postgres stored the expression).
do $$
declare
  r record;
  def text;
begin
  for r in
    select conname, pg_get_constraintdef(oid) as cdef
    from pg_constraint
    where conrelid = 'reservations'::regclass
      and contype = 'c'
  loop
    def := lower(r.cdef);
    -- Drop any check that mentions both start_month and end_month
    -- but is NOT the simple >= ordering check
    if def like '%start_month%' and def like '%end_month%'
       and def not like '%end_month >= start_month%'
       and def not like '%end_month >=%start_month%'
    then
      raise notice 'Dropping constraint: % — %', r.conname, r.cdef;
      execute 'alter table reservations drop constraint ' || quote_ident(r.conname);
    end if;
  end loop;
end;
$$;

-- Re-add the 10-year limit
alter table reservations drop constraint if exists reservations_max_10_years;
alter table reservations add constraint reservations_max_10_years
  check (end_month < start_month + interval '120 months');
