-- Per-user in-app notifications (Radar updates, assignments, etc.)

create table if not exists public.app_notifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         bigint not null references public.users (id) on delete cascade,
  workspace_id    bigint not null,
  type            text not null,
  title           text not null,
  description     text not null default '',
  opportunity_id  text,
  action          text,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists app_notifications_user_unread_idx
  on public.app_notifications (user_id, created_at desc)
  where read_at is null;

create index if not exists app_notifications_user_created_idx
  on public.app_notifications (user_id, created_at desc);
