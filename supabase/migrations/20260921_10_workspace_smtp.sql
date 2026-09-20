-- Per-workspace SMTP for customer outreach (company mail).
-- Platform RESEND/SMTP still used for invites and password setup.

create table if not exists public.workspace_smtp_settings (
  workspace_id        bigint primary key references public.users (id) on delete cascade,
  host                text not null,
  port                integer not null default 587
                        check (port > 0 and port < 65536),
  username            text not null,
  password_encrypted  text not null,
  from_email          text not null,
  from_name           text,
  use_ssl             boolean not null default false,
  enabled             boolean not null default true,
  updated_by          bigint references public.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.workspace_smtp_settings enable row level security;
