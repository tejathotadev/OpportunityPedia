-- Commercial company rollups (Plan A): company name + totals + facets.
-- No individual job openings — only facet atoms for filter math after restart.
-- Supabase → SQL Editor → paste → Run

create table if not exists public.company_hiring_signals (
  id                     bigint generated always as identity primary key,
  user_id                bigint not null references public.users (id) on delete cascade,
  company_id             text not null,
  company_name           text not null,
  total_openings         integer not null default 0,
  highest_temperature    text not null default 'hot',
  very_hot               integer not null default 0,
  hot                    integer not null default 0,
  industry               text,
  location               text,
  country                text,
  team_breakdown         jsonb not null default '[]'::jsonb,
  facets                 jsonb not null default '{}'::jsonb,
  -- Compact facet triples only (no title/url): enables Team×Location filters offline.
  atoms                  jsonb not null default '[]'::jsonb,
  last_detected_at       timestamptz,
  scanned_at             timestamptz not null default now(),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint uq_company_hiring_signals_user_company unique (user_id, company_id)
);

create index if not exists ix_company_hiring_signals_user_scanned
  on public.company_hiring_signals (user_id, scanned_at desc);

drop trigger if exists trg_company_hiring_signals_updated_at on public.company_hiring_signals;
create trigger trg_company_hiring_signals_updated_at
  before update on public.company_hiring_signals
  for each row execute function public.set_updated_at();

alter table public.company_hiring_signals enable row level security;

-- Optional outreach targeting snapshot (safe if columns already exist).
alter table public.outreach_messages
  add column if not exists matched_count integer,
  add column if not exists hiring_filters jsonb;
