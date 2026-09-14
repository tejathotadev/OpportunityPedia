-- Schema change history. Applied automatically by `python -m app.db.migrate`.

create table if not exists public.schema_migrations (
  version     text primary key,
  applied_at  timestamptz not null default now()
);
