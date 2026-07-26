-- Lead Engine — initial schema (fase 1)
-- Voer dit bestand handmatig uit in de Supabase SQL Editor of via de Supabase CLI.
-- Geen automatische migratie vanuit de app.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.organization_role as enum ('owner', 'admin');

create type public.search_query_status as enum (
  'draft',
  'queued',
  'running',
  'completed',
  'partially_completed',
  'failed',
  'cancelled'
);

create type public.scrape_job_status as enum (
  'queued',
  'running',
  'completed',
  'partially_completed',
  'failed',
  'cancelled'
);

create type public.scrape_job_type as enum (
  'search_discovery',
  'website_crawl',
  'manual_url_list',
  'recheck'
);

create type public.scrape_source_type as enum (
  'search_result',
  'company_website',
  'public_directory',
  'manual_url_list'
);

create type public.company_status as enum (
  'new',
  'reviewed',
  'qualified',
  'not_relevant',
  'contacted',
  'customer',
  'blocked'
);

create type public.contact_type as enum (
  'email',
  'phone',
  'contact_form'
);

create type public.contact_verification_status as enum (
  'unknown',
  'syntax_valid',
  'valid',
  'risky',
  'invalid',
  'blocked'
);

create type public.exclusion_type as enum (
  'domain',
  'email',
  'company',
  'keyword',
  'country'
);

-- ---------------------------------------------------------------------------
-- Helper: updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- organization_members
-- ---------------------------------------------------------------------------

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.organization_role not null default 'admin',
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, user_id)
);

create index organization_members_user_id_idx
  on public.organization_members (user_id);

create index organization_members_organization_id_idx
  on public.organization_members (organization_id);

-- ---------------------------------------------------------------------------
-- Membership helper (SECURITY DEFINER to avoid RLS recursion)
-- ---------------------------------------------------------------------------

create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = org_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_org_owner_or_admin(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = org_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;

-- ---------------------------------------------------------------------------
-- organization_settings (scraping defaults per org)
-- ---------------------------------------------------------------------------

create table public.organization_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations (id) on delete cascade,
  requests_per_minute integer not null default 20,
  request_delay_ms integer not null default 1500,
  max_pages_per_domain integer not null default 5,
  max_concurrency integer not null default 2,
  request_timeout_ms integer not null default 15000,
  max_retries integer not null default 2,
  prefer_generic_emails boolean not null default true,
  allow_personal_emails boolean not null default false,
  email_prefix_denylist text[] not null default array[
    'privacy', 'abuse', 'noreply', 'no-reply', 'example', 'test', 'webmaster'
  ],
  user_agent text not null default 'StorataQ-LeadEngine/0.1 (+internal; respectful-crawler)',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint organization_settings_rpm_positive check (requests_per_minute > 0),
  constraint organization_settings_delay_nonneg check (request_delay_ms >= 0),
  constraint organization_settings_pages_range check (max_pages_per_domain between 1 and 10),
  constraint organization_settings_concurrency_range check (max_concurrency between 1 and 5),
  constraint organization_settings_timeout_positive check (request_timeout_ms >= 1000),
  constraint organization_settings_retries_range check (max_retries between 0 and 5)
);

create trigger organization_settings_set_updated_at
before update on public.organization_settings
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- search_queries
-- ---------------------------------------------------------------------------

create table public.search_queries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  name text not null,
  keyword text not null,
  industry text,
  city text,
  region text,
  country text,
  max_results integer not null default 50,
  status public.search_query_status not null default 'draft',
  crawl_websites boolean not null default true,
  only_generic_emails boolean not null default true,
  source_type public.scrape_source_type not null default 'manual_url_list',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint search_queries_max_results_positive check (max_results > 0)
);

create index search_queries_organization_id_idx
  on public.search_queries (organization_id);

create trigger search_queries_set_updated_at
before update on public.search_queries
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- scrape_jobs
-- ---------------------------------------------------------------------------

create table public.scrape_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  search_query_id uuid references public.search_queries (id) on delete set null,
  job_type public.scrape_job_type not null default 'website_crawl',
  status public.scrape_job_status not null default 'queued',
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  pages_processed integer not null default 0,
  companies_found integer not null default 0,
  contacts_found integer not null default 0,
  claimed_at timestamptz,
  claimed_by text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index scrape_jobs_organization_id_idx
  on public.scrape_jobs (organization_id);

create index scrape_jobs_status_queued_idx
  on public.scrape_jobs (status, created_at)
  where status = 'queued';

create trigger scrape_jobs_set_updated_at
before update on public.scrape_jobs
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- scrape_sources
-- ---------------------------------------------------------------------------

create table public.scrape_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  source_type public.scrape_source_type not null,
  base_url text,
  enabled boolean not null default true,
  crawl_delay_ms integer not null default 1500,
  max_pages_per_run integer not null default 50,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index scrape_sources_organization_id_idx
  on public.scrape_sources (organization_id);

create trigger scrape_sources_set_updated_at
before update on public.scrape_sources
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------------

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  company_name text not null,
  normalized_company_name text not null,
  website_url text,
  normalized_domain text,
  description text,
  industry text,
  city text,
  region text,
  country text,
  postal_code text,
  phone text,
  linkedin_url text,
  facebook_url text,
  instagram_url text,
  source_url text,
  source_type public.scrape_source_type,
  first_found_at timestamptz not null default timezone('utc', now()),
  last_checked_at timestamptz,
  status public.company_status not null default 'new',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index companies_organization_id_idx
  on public.companies (organization_id);

create index companies_normalized_domain_idx
  on public.companies (organization_id, normalized_domain);

create index companies_normalized_name_city_idx
  on public.companies (organization_id, normalized_company_name, city);

create trigger companies_set_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- contacts
-- ---------------------------------------------------------------------------

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  contact_type public.contact_type not null,
  contact_value text not null,
  normalized_value text not null,
  label text,
  person_name text,
  job_title text,
  is_public_business_contact boolean not null default true,
  verification_status public.contact_verification_status not null default 'unknown',
  source_url text,
  first_found_at timestamptz not null default timezone('utc', now()),
  last_checked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index contacts_organization_id_idx
  on public.contacts (organization_id);

create index contacts_company_id_idx
  on public.contacts (company_id);

create index contacts_normalized_value_idx
  on public.contacts (organization_id, contact_type, normalized_value);

create trigger contacts_set_updated_at
before update on public.contacts
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- company_sources
-- ---------------------------------------------------------------------------

create table public.company_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  scrape_job_id uuid references public.scrape_jobs (id) on delete set null,
  source_url text not null,
  source_type public.scrape_source_type not null,
  discovered_at timestamptz not null default timezone('utc', now()),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index company_sources_organization_id_idx
  on public.company_sources (organization_id);

create index company_sources_company_id_idx
  on public.company_sources (company_id);

-- ---------------------------------------------------------------------------
-- exclusion_list
-- ---------------------------------------------------------------------------

create table public.exclusion_list (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  exclusion_type public.exclusion_type not null,
  exclusion_value text not null,
  normalized_value text not null,
  reason text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, exclusion_type, normalized_value)
);

create index exclusion_list_organization_id_idx
  on public.exclusion_list (organization_id);

-- ---------------------------------------------------------------------------
-- scrape_errors
-- ---------------------------------------------------------------------------

create table public.scrape_errors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  scrape_job_id uuid not null references public.scrape_jobs (id) on delete cascade,
  url text,
  error_type text not null,
  error_message text not null,
  http_status integer,
  retry_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index scrape_errors_job_id_idx
  on public.scrape_errors (scrape_job_id);

create index scrape_errors_organization_id_idx
  on public.scrape_errors (organization_id);

-- ---------------------------------------------------------------------------
-- activity_events
-- ---------------------------------------------------------------------------

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  description text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index activity_events_organization_id_idx
  on public.activity_events (organization_id, created_at desc);

-- ---------------------------------------------------------------------------
-- export_runs (metadata for CSV/Excel exports)
-- ---------------------------------------------------------------------------

create table public.export_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  export_format text not null default 'csv',
  filters_json jsonb not null default '{}'::jsonb,
  row_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint export_runs_format_check check (export_format in ('csv', 'xlsx'))
);

create index export_runs_organization_id_idx
  on public.export_runs (organization_id);
