-- Run this if you already applied the older schema.sql without opportunity_details.
-- Supabase → SQL Editor → paste → Run

create table if not exists public.opportunity_details (
  id                bigint generated always as identity primary key,
  user_id           bigint not null references public.users (id) on delete cascade,
  notice_id         text not null,
  title             text,
  provider          text,
  board_token       text,
  board_name        text,
  location          text,
  department        text,
  url               text,
  posted_at         text,
  deadline          text,
  requisition_id    text,
  heat              text,
  signal_type       text,
  naics             text,
  category          text,
  detail            jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint uq_opportunity_details_user_notice unique (user_id, notice_id)
);

create index if not exists ix_opportunity_details_user_updated
  on public.opportunity_details (user_id, updated_at desc);

drop trigger if exists trg_opportunity_details_updated_at on public.opportunity_details;
create trigger trg_opportunity_details_updated_at
  before update on public.opportunity_details
  for each row execute function public.set_updated_at();

alter table public.opportunity_details enable row level security;
