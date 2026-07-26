-- Worldwide search query model (no RLS changes)
-- Store ISO codes / free-text geography; source keys for future connectors.

alter table public.search_queries
  add column if not exists languages text[] not null default '{}'::text[],
  add column if not exists regions text[] not null default '{}'::text[],
  add column if not exists cities text[] not null default '{}'::text[],
  add column if not exists sources text[] not null default '{}'::text[],
  add column if not exists search_prompt text;

comment on column public.search_queries.countries is
  'ISO 3166-1 alpha-2 country codes';
comment on column public.search_queries.languages is
  'ISO 639-1 language codes';
comment on column public.search_queries.regions is
  'Free-text regions/provinces/states worldwide (future ISO 3166-2 compatible)';
comment on column public.search_queries.cities is
  'Free-text city names worldwide';
comment on column public.search_queries.sources is
  'Stable source connector keys (see src/lib/international/sources.ts)';
comment on column public.search_queries.industries is
  'Stable industry taxonomy codes (see src/lib/international/industries.ts)';
comment on column public.search_queries.search_prompt is
  'Natural-language search prompt; later AI-expanded into structured filters';
