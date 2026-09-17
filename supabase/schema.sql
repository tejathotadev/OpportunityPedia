-- OpportunityPedia v1 platform schema (Supabase Postgres)
-- Fresh installs: run this file once in Supabase SQL Editor, then
--   python -m app.db.migrate --stamp
-- Existing installs: python -m app.db.migrate  (applies supabase/migrations/)
-- Do NOT enable these tables for the anon key / browser. FastAPI only.

create extension if not exists citext;

-- ---------------------------------------------------------------------------
-- users: platform_admin | customer (buyers + demo)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id                bigint generated always as identity primary key,
  role              text not null check (role in ('platform_admin', 'customer')),
  name              text not null,
  email             citext not null,
  phone             text not null default '',
  company           text,
  password_hash     text,
  status            text not null default 'pending',
  plan              text not null default 'free'
                      check (plan in ('free', 'paid')),
  -- Free trial end (signup + 2 days). NULL = paid / demo / no clock.
  trial_ends_at     timestamptz,
  gov_api_key       text,
  is_demo           boolean not null default false,
  -- Soft-remove + 2-day purge after admin removes a trial account
  removed_at        timestamptz,
  -- Workspace seats: owner workspace_id = id; members point at the owner id
  workspace_id      bigint references public.users (id) on delete set null,
  seat_role         text not null default 'owner'
                      check (seat_role in ('owner', 'member')),
  -- Bumped on each login; JWT claim `sv` must match (one device)
  session_version   integer not null default 1,
  last_login_at     timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint uq_users_email unique (email)
);

create unique index if not exists uq_users_one_demo
  on public.users (is_demo)
  where is_demo = true;

create index if not exists ix_users_role_created
  on public.users (role, created_at desc);

create index if not exists ix_users_workspace_id
  on public.users (workspace_id);

create index if not exists ix_users_removed_at
  on public.users (removed_at)
  where removed_at is not null;

create index if not exists ix_users_trial_ends_at
  on public.users (trial_ends_at)
  where trial_ends_at is not null;

create index if not exists ix_users_workspace_seat
  on public.users (workspace_id, seat_role);

-- ---------------------------------------------------------------------------
-- contact_leads: marketing contact form (not product accounts)
-- ---------------------------------------------------------------------------
create table if not exists public.contact_leads (
  id                  bigint generated always as identity primary key,
  name                text not null,
  email               citext not null,
  company             text,
  phone               text,
  job_title           text,
  reason              text not null,
  message             text not null,
  status              text not null default 'new'
                        check (status in ('new', 'in_progress', 'contacted', 'closed')),
  assigned_admin_id   bigint references public.users (id) on delete set null,
  admin_notes         text,
  converted_user_id   bigint references public.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists ix_contact_leads_status_created
  on public.contact_leads (status, created_at desc);

create index if not exists ix_contact_leads_email
  on public.contact_leads (email);

-- ---------------------------------------------------------------------------
-- payments: product purchases
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id                   bigint generated always as identity primary key,
  user_id              bigint not null references public.users (id) on delete cascade,
  amount_cents         integer not null,
  currency             text not null default 'inr',
  status               text not null default 'pending'
                         check (status in ('pending', 'paid', 'failed', 'refunded')),
  provider             text not null default 'razorpay',
  provider_order_id    text,
  provider_payment_id  text,
  paid_at              timestamptz,
  created_at           timestamptz not null default now()
);

create index if not exists ix_payments_user_id on public.payments (user_id);
create index if not exists ix_payments_created on public.payments (created_at desc);

-- ---------------------------------------------------------------------------
-- password_setup_tokens: invite / set-password links
-- ---------------------------------------------------------------------------
create table if not exists public.password_setup_tokens (
  id           bigint generated always as identity primary key,
  user_id      bigint not null references public.users (id) on delete cascade,
  token_hash   text not null,
  expires_at   timestamptz not null,
  used_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists ix_password_tokens_hash
  on public.password_setup_tokens (token_hash);

-- ---------------------------------------------------------------------------
-- support_tickets: buyer queries (admin responds here)
-- ---------------------------------------------------------------------------
create table if not exists public.support_tickets (
  id           bigint generated always as identity primary key,
  user_id      bigint not null references public.users (id) on delete cascade,
  subject      text not null,
  body         text not null,
  status       text not null default 'open'
                 check (status in ('open', 'in_progress', 'resolved', 'closed')),
  priority     text not null default 'normal'
                 check (priority in ('low', 'normal', 'high', 'urgent')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists ix_support_tickets_status_created
  on public.support_tickets (status, created_at desc);

-- ---------------------------------------------------------------------------
-- opportunity_details: SAM notice facts captured at radar scan (Plan A)
-- No extra SAM calls — contact / set-aside / attachment names from search.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- company_hiring_signals: commercial rollups (no job openings)
-- Company name + totals + facets/atoms for Focus outreach after restart.
-- ---------------------------------------------------------------------------
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
  atoms                  jsonb not null default '[]'::jsonb,
  last_detected_at       timestamptz,
  scanned_at             timestamptz not null default now(),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint uq_company_hiring_signals_user_company unique (user_id, company_id)
);

create index if not exists ix_company_hiring_signals_user_scanned
  on public.company_hiring_signals (user_id, scanned_at desc);

-- ---------------------------------------------------------------------------
-- outreach_messages + opportunity_activities (Send Outreach + Activity feed)
-- ---------------------------------------------------------------------------
create table if not exists public.outreach_messages (
  id                  bigint generated always as identity primary key,
  user_id             bigint not null references public.users (id) on delete cascade,
  opportunity_id      text not null,
  opportunity_title   text,
  company_name        text,
  sender_email        text not null,
  sender_name         text,
  recipient_email     text not null,
  subject             text not null,
  body                text not null,
  channel             text not null default 'email',
  status              text not null default 'sent'
                        check (status in ('sent', 'draft', 'failed')),
  error_detail        text,
  matched_count       integer,
  hiring_filters      jsonb,
  sent_at             timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

create index if not exists ix_outreach_messages_user_opp
  on public.outreach_messages (user_id, opportunity_id, sent_at desc);

create index if not exists ix_outreach_messages_user_sent
  on public.outreach_messages (user_id, sent_at desc);

create table if not exists public.opportunity_activities (
  id                  bigint generated always as identity primary key,
  user_id             bigint not null references public.users (id) on delete cascade,
  opportunity_id      text not null,
  opportunity_title   text,
  type                text not null,
  actor_id            bigint references public.users (id) on delete set null,
  actor_name          text not null,
  message             text not null,
  detail              text,
  channel             text,
  created_at          timestamptz not null default now()
);

create index if not exists ix_opportunity_activities_user_created
  on public.opportunity_activities (user_id, created_at desc);

create index if not exists ix_opportunity_activities_user_opp
  on public.opportunity_activities (user_id, opportunity_id, created_at desc);

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

-- ---------------------------------------------------------------------------
-- naics_codes: global catalog (Sector 56 now; add more sectors later)
-- user_naics_codes: admin-assigned coverage per workspace
-- ---------------------------------------------------------------------------
create table if not exists public.naics_codes (
  code          text primary key,
  title         text not null,
  sector_code   text not null,
  sector_title  text not null,
  group_code    text not null,
  group_title   text not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists ix_naics_codes_sector
  on public.naics_codes (sector_code, group_code, code);

create table if not exists public.user_naics_codes (
  user_id     bigint not null references public.users (id) on delete cascade,
  naics_code  text not null references public.naics_codes (code) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, naics_code)
);

-- ---------------------------------------------------------------------------
-- radar_runs: durable scan history (admin + user audit)
-- ---------------------------------------------------------------------------
create table if not exists public.radar_runs (
  id                bigint generated always as identity primary key,
  user_id           bigint not null references public.users (id) on delete cascade,
  memory_run_id     bigint,
  status            text not null default 'running',
  boards_run        integer not null default 0,
  jobs_found        integer not null default 0,
  new_count         integer not null default 0,
  notes             text,
  new_items         jsonb not null default '[]'::jsonb,
  created_at        timestamptz not null default now(),
  finished_at       timestamptz
);

create index if not exists ix_radar_runs_user_created
  on public.radar_runs (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- radar_jobs / radar_vendors: live scan snapshots (survive API restart)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- schema_migrations: applied versions (also created by python -m app.db.migrate)
-- ---------------------------------------------------------------------------
create table if not exists public.schema_migrations (
  version     text primary key,
  applied_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists trg_contact_leads_updated_at on public.contact_leads;
create trigger trg_contact_leads_updated_at
  before update on public.contact_leads
  for each row execute function public.set_updated_at();

drop trigger if exists trg_support_tickets_updated_at on public.support_tickets;
create trigger trg_support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function public.set_updated_at();

drop trigger if exists trg_opportunity_details_updated_at on public.opportunity_details;
create trigger trg_opportunity_details_updated_at
  before update on public.opportunity_details
  for each row execute function public.set_updated_at();

drop trigger if exists trg_company_hiring_signals_updated_at on public.company_hiring_signals;
create trigger trg_company_hiring_signals_updated_at
  before update on public.company_hiring_signals
  for each row execute function public.set_updated_at();

-- Lock down: no public browser access. Backend uses the connection string.
alter table public.users enable row level security;
alter table public.contact_leads enable row level security;
alter table public.payments enable row level security;
alter table public.password_setup_tokens enable row level security;
alter table public.support_tickets enable row level security;
alter table public.opportunity_details enable row level security;
alter table public.company_hiring_signals enable row level security;
alter table public.outreach_messages enable row level security;
alter table public.opportunity_activities enable row level security;
alter table public.opportunity_assignments enable row level security;
alter table public.naics_codes enable row level security;
alter table public.user_naics_codes enable row level security;
alter table public.radar_runs enable row level security;
alter table public.radar_jobs enable row level security;
alter table public.radar_vendors enable row level security;
alter table public.schema_migrations enable row level security;
