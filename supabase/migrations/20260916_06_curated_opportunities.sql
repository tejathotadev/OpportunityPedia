-- Admin-curated opportunities (LinkedIn / manual signals).
-- Additive only: does not alter or wipe existing radar / user tables.

create table if not exists public.curated_opportunities (
  id                  uuid primary key default gen_random_uuid(),
  category            text not null check (category in ('commercial', 'government')),
  opportunity_type    text not null,
  company             text not null default '',
  title               text not null,
  location            text not null default '',
  engagement          text,
  duration            text,
  openings            integer,
  experience          text,
  skills              jsonb not null default '[]'::jsonb,
  technologies        jsonb not null default '[]'::jsonb,
  vendor_looking_for  text,
  partnership_model   text,
  client_industry     text,
  candidate_requirement text,
  contact_name        text,
  contact_email       text,
  source              text not null default 'LinkedIn',
  source_url          text,
  priority            text not null default 'hot'
                        check (priority in ('very_hot', 'hot')),
  description         text not null default '',
  detected_at         timestamptz not null default now(),
  status              text not null default 'active'
                        check (status in ('active', 'archived')),
  payload             jsonb not null default '{}'::jsonb,
  created_by          bigint references public.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists curated_opportunities_status_detected_idx
  on public.curated_opportunities (status, detected_at desc);

create index if not exists curated_opportunities_category_idx
  on public.curated_opportunities (category, status);

create table if not exists public.curated_opportunity_visibility (
  opportunity_id  uuid not null
                    references public.curated_opportunities (id) on delete cascade,
  workspace_id    bigint not null references public.users (id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (opportunity_id, workspace_id)
);

create index if not exists curated_opportunity_visibility_workspace_idx
  on public.curated_opportunity_visibility (workspace_id);

alter table public.curated_opportunities enable row level security;
alter table public.curated_opportunity_visibility enable row level security;
