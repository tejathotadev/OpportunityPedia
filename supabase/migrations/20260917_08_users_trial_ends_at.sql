-- Free-plan 2-day trial: clock starts at account creation (or plan flip to free).
-- Paid / demo accounts keep trial_ends_at NULL (no lock).

alter table public.users
  add column if not exists trial_ends_at timestamptz;

create index if not exists ix_users_trial_ends_at
  on public.users (trial_ends_at)
  where trial_ends_at is not null;

-- Backfill existing free customers (owners): trial from created_at + 2 days.
-- Already past that window → login will be locked until upgraded to paid.
update public.users
set trial_ends_at = coalesce(created_at, now()) + interval '2 days'
where role = 'customer'
  and lower(coalesce(plan, 'free')) = 'free'
  and coalesce(is_demo, false) = false
  and (seat_role is null or lower(seat_role) = 'owner')
  and trial_ends_at is null;

-- Paid (and demo) stay without a trial clock.
update public.users
set trial_ends_at = null
where role = 'customer'
  and (
    lower(coalesce(plan, 'free')) = 'paid'
    or coalesce(is_demo, false) = true
  );
