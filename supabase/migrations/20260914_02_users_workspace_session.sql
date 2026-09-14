-- Workspace seats, soft-remove, and one-device session version on users.
-- Idempotent: safe on DBs that already received these via runtime ALTER.

alter table public.users
  add column if not exists plan text not null default 'free';

alter table public.users
  add column if not exists gov_api_key text;

alter table public.users
  add column if not exists removed_at timestamptz;

alter table public.users
  add column if not exists workspace_id bigint;

alter table public.users
  add column if not exists seat_role text not null default 'owner';

alter table public.users
  add column if not exists session_version integer not null default 1;

-- Existing customers become owners of their own workspace.
update public.users
set workspace_id = id,
    seat_role = coalesce(nullif(trim(seat_role), ''), 'owner')
where role = 'customer'
  and workspace_id is null;

create index if not exists ix_users_workspace_id
  on public.users (workspace_id);

create index if not exists ix_users_removed_at
  on public.users (removed_at)
  where removed_at is not null;

create index if not exists ix_users_workspace_seat
  on public.users (workspace_id, seat_role);

-- Soft constraints (skip if already present).
do $$
begin
  alter table public.users
    add constraint ck_users_plan check (plan in ('free', 'paid'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.users
    add constraint ck_users_seat_role check (seat_role in ('owner', 'member'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.users
    add constraint fk_users_workspace
    foreign key (workspace_id) references public.users (id) on delete set null;
exception
  when duplicate_object then null;
end $$;
