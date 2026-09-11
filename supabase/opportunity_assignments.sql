-- Run in Supabase SQL Editor (safe to re-run).
-- Stores who owns a tender or commercial company lead (Assign to me).

create table if not exists public.opportunity_assignments (
  id                  bigint generated always as identity primary key,
  user_id             bigint not null references public.users (id) on delete cascade,
  opportunity_id      text not null,
  assigned_to_id      bigint not null references public.users (id) on delete cascade,
  assigned_to_name    text not null,
  assigned_at         timestamptz not null default now(),
  constraint uq_opportunity_assignments_user_opp unique (user_id, opportunity_id)
);

create index if not exists ix_opportunity_assignments_user
  on public.opportunity_assignments (user_id, assigned_at desc);

create index if not exists ix_opportunity_assignments_assignee
  on public.opportunity_assignments (user_id, assigned_to_id);

alter table public.opportunity_assignments enable row level security;
