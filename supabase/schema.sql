-- OpportunityPedia v1 platform schema (Supabase Postgres)
-- Run once in: Supabase → SQL Editor → New query → Run
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
  is_demo           boolean not null default false,
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
