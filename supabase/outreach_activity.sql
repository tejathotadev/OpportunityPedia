-- Run if you already applied schema without outreach tables.
-- Supabase → SQL Editor → paste → Run

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

alter table public.outreach_messages enable row level security;
alter table public.opportunity_activities enable row level security;
