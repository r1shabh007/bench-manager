-- Add plaque message and donation amount to reservations.
alter table reservations add column if not exists plaque_message text;
alter table reservations add column if not exists donation_amount integer;
