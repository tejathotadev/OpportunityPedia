-- Persist live Radar job + vendor snapshots (survive API restart).
-- Each successful scan replaces the workspace owner's rows in one transaction.

create table if not exists public.radar_jobs (
  id                bigint generated always as identity primary key,
  user_id           bigint not null references public.users (id) on delete cascade,
  run_id            bigint,
  provider          text not null,
  board_token       text,
  board_name        text,
  external_job_id   text,
  title             text,
  location          text,
  department        text,
  url               text,
  posted_at         text,
  updated_at        text,
  requisition_id    text,
  heat              text,
  signal_type       text,
  naics             text,
  category          text,
  detail            jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists ix_radar_jobs_user
  on public.radar_jobs (user_id);

create index if not exists ix_radar_jobs_user_external
  on public.radar_jobs (user_id, external_job_id);

create index if not exists ix_radar_jobs_user_provider
  on public.radar_jobs (user_id, provider);

create table if not exists public.radar_vendors (
  id                    bigint generated always as identity primary key,
  user_id               bigint not null references public.users (id) on delete cascade,
  run_id                bigint,
  provider              text not null,
  agency_name           text,
  agency_token          text,
  vendor_name           text,
  vendor_uei            text,
  cage_code             text,
  registration_status   text,
  award_notice_id       text,
  award_title           text,
  award_url             text,
  naics                 text,
  posted_at             text,
  heat                  text,
  signal_type           text,
  category              text,
  created_at            timestamptz not null default now()
);

create index if not exists ix_radar_vendors_user
  on public.radar_vendors (user_id);

alter table public.radar_jobs enable row level security;
alter table public.radar_vendors enable row level security;
