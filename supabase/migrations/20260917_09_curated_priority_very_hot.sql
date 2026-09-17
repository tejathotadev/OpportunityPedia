-- Vendors (admin-curated) opportunities are always Very Hot.

update public.curated_opportunities
set priority = 'very_hot'
where priority is distinct from 'very_hot';

alter table public.curated_opportunities
  alter column priority set default 'very_hot';

-- Recreate check so only very_hot is allowed going forward.
alter table public.curated_opportunities
  drop constraint if exists curated_opportunities_priority_check;

alter table public.curated_opportunities
  add constraint curated_opportunities_priority_check
  check (priority = 'very_hot');
