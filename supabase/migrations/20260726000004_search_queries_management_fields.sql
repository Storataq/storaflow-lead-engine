-- Fase 2: zoekopdrachten-velden uitbreiden
-- Geen RLS-wijzigingen. Bestaande policies blijven gelden via organization_id.
-- Voer handmatig uit in de Supabase SQL Editor.

-- Beheerstatussen naast bestaande scrape-statussen
alter type public.search_query_status add value if not exists 'active';
alter type public.search_query_status add value if not exists 'paused';

alter table public.search_queries
  add column if not exists countries text[] not null default '{}'::text[],
  add column if not exists keywords text[] not null default '{}'::text[],
  add column if not exists industries text[] not null default '{}'::text[],
  add column if not exists company_size text,
  add column if not exists website_required boolean not null default false,
  add column if not exists linkedin_required boolean not null default false;

alter table public.search_queries
  drop constraint if exists search_queries_company_size_check;

alter table public.search_queries
  add constraint search_queries_company_size_check
  check (
    company_size is null
    or company_size in ('1-10', '11-50', '51-250', '250+')
  );

-- Backfill keywords/countries from legacy scalar columns when empty
update public.search_queries
set keywords = array[keyword]
where coalesce(cardinality(keywords), 0) = 0
  and keyword is not null
  and length(trim(keyword)) > 0;

update public.search_queries
set countries = array[country]
where coalesce(cardinality(countries), 0) = 0
  and country is not null
  and length(trim(country)) > 0;

update public.search_queries
set industries = array[industry]
where coalesce(cardinality(industries), 0) = 0
  and industry is not null
  and length(trim(industry)) > 0;

create index if not exists search_queries_status_idx
  on public.search_queries (organization_id, status);

create index if not exists search_queries_updated_at_idx
  on public.search_queries (organization_id, updated_at desc);
