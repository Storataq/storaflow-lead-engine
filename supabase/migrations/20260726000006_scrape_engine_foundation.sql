-- Fase 4 foundation: modular scrape engine
-- Additive only. Does NOT alter existing RLS policies on scrape_jobs / scrape_sources / companies.
-- Run manually in the Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- Enum extensions (backward compatible with queued/running/cancelled)
-- ---------------------------------------------------------------------------

alter type public.scrape_job_status add value if not exists 'pending';
alter type public.scrape_job_status add value if not exists 'active';
alter type public.scrape_job_status add value if not exists 'paused';

-- ---------------------------------------------------------------------------
-- scrape_jobs: progress / current source / error counters
-- ---------------------------------------------------------------------------

alter table public.scrape_jobs
  add column if not exists progress_percent integer not null default 0,
  add column if not exists current_source_code text,
  add column if not exists error_count integer not null default 0,
  add column if not exists target_pages integer not null default 5,
  add column if not exists runtime_ms integer,
  add column if not exists last_heartbeat_at timestamptz;

alter table public.scrape_jobs
  drop constraint if exists scrape_jobs_progress_percent_check;

alter table public.scrape_jobs
  add constraint scrape_jobs_progress_percent_check
  check (progress_percent >= 0 and progress_percent <= 100);

comment on column public.scrape_jobs.progress_percent is
  '0-100 progress for UI; mock engine and future workers update this';
comment on column public.scrape_jobs.current_source_code is
  'Active connector/source code (see src/lib/scraping/connectors)';
comment on column public.scrape_jobs.runtime_ms is
  'Total runtime in milliseconds when job finishes or pauses';

-- ---------------------------------------------------------------------------
-- scrape_job_logs
-- ---------------------------------------------------------------------------

create table if not exists public.scrape_job_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  scrape_job_id uuid not null references public.scrape_jobs (id) on delete cascade,
  level text not null default 'info'
    check (level in ('debug', 'info', 'warn', 'error')),
  event_code text not null,
  message text not null,
  source_code text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists scrape_job_logs_job_id_created_at_idx
  on public.scrape_job_logs (scrape_job_id, created_at desc);

create index if not exists scrape_job_logs_organization_id_idx
  on public.scrape_job_logs (organization_id);

comment on table public.scrape_job_logs is
  'Append-only job timeline for mock and future distributed workers';

-- ---------------------------------------------------------------------------
-- scrape_results (normalized discovery rows before/alongside companies)
-- ---------------------------------------------------------------------------

create table if not exists public.scrape_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  scrape_job_id uuid not null references public.scrape_jobs (id) on delete cascade,
  source_code text not null,
  company_name text not null,
  website_url text,
  city text,
  region text,
  country text,
  industry text,
  raw_payload jsonb not null default '{}'::jsonb,
  company_id uuid references public.companies (id) on delete set null,
  status text not null default 'discovered'
    check (status in ('discovered', 'normalized', 'deduplicated', 'rejected', 'exported')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists scrape_results_job_id_idx
  on public.scrape_results (scrape_job_id, created_at desc);

create index if not exists scrape_results_organization_id_idx
  on public.scrape_results (organization_id);

create trigger scrape_results_set_updated_at
before update on public.scrape_results
for each row execute function public.set_updated_at();

comment on table public.scrape_results is
  'Per-job discovery results from connectors (mock now; real sources later)';

-- ---------------------------------------------------------------------------
-- Grants + RLS for NEW tables only (do not touch existing policies)
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on public.scrape_job_logs to authenticated;
grant all on public.scrape_job_logs to service_role;

grant select, insert, update, delete on public.scrape_results to authenticated;
grant all on public.scrape_results to service_role;

alter table public.scrape_job_logs enable row level security;
alter table public.scrape_results enable row level security;

create policy "scrape_job_logs_select" on public.scrape_job_logs
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy "scrape_job_logs_insert" on public.scrape_job_logs
  for insert to authenticated
  with check (public.is_org_member(organization_id));

create policy "scrape_results_select" on public.scrape_results
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy "scrape_results_insert" on public.scrape_results
  for insert to authenticated
  with check (public.is_org_member(organization_id));

create policy "scrape_results_update" on public.scrape_results
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
