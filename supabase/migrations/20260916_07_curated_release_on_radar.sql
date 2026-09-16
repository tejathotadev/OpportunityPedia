-- Gate curated visibility: show to a workspace only after a successful Radar run.
-- Additive only: does not drop or rewrite existing opportunity data.

alter table public.curated_opportunity_visibility
  add column if not exists released_at timestamptz;

create index if not exists curated_opportunity_visibility_pending_idx
  on public.curated_opportunity_visibility (workspace_id)
  where released_at is null;
