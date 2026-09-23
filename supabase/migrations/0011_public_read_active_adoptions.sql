-- Allow anyone (including logged-out visitors) to see active adoptions
-- so the home page map can display adopted benches and plaque messages.
create policy "reservations_public_read_active" on reservations
  for select using (status = 'active');
