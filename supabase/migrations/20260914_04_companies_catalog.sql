-- Centralized commercial company catalog (shared labels, classified once).
create table if not exists public.companies (
  company_id          text primary key,
  company_name        text not null,
  company_type        text not null default 'unknown',
  tier                text not null default 'unknown',
  industry            text not null default 'Other',
  team_breakdown      jsonb not null default '[]'::jsonb,
  classified_at       timestamptz,
  classification_model text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint ck_companies_company_type
    check (company_type in ('product', 'service', 'mixed', 'unknown')),
  constraint ck_companies_tier
    check (tier in ('mnc', 'tier1', 'tier2', 'startup', 'unknown'))
);

create index if not exists ix_companies_industry on public.companies (industry);
create index if not exists ix_companies_type on public.companies (company_type);
create index if not exists ix_companies_tier on public.companies (tier);

drop trigger if exists trg_companies_updated_at on public.companies;
create trigger trg_companies_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();
