-- Storaflow — AI Prospecting Agent (Phase 27B)
-- Additive only. Run manually AFTER 20260726000042_ai_agent_platform.sql
-- Do NOT auto-execute from the app.
-- Do NOT modify migrations 00001–00042.
-- Multi-tenant prospecting: searches, prospects, research, history, settings.
-- Idempotent.

-- ---------------------------------------------------------------------------
-- Organization prospecting settings
-- ---------------------------------------------------------------------------

create table if not exists public.prospecting_org_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  enabled boolean not null default true,
  min_lead_score integer not null default 40 check (min_lead_score between 0 and 100),
  min_ai_confidence numeric(5,2) not null default 0.40
    check (min_ai_confidence >= 0 and min_ai_confidence <= 1),
  auto_enrich boolean not null default true,
  auto_crm_suggest boolean not null default true,
  approval_mode text not null default 'semi_autonomous'
    check (approval_mode in (
      'read_only', 'suggest', 'approval_required', 'semi_autonomous', 'fully_autonomous'
    )),
  provider text not null default 'openai',
  model text not null default 'gpt-4.1-mini',
  rate_limit_per_minute integer not null default 30 check (rate_limit_per_minute > 0),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists prospecting_org_settings_set_updated_at on public.prospecting_org_settings;
create trigger prospecting_org_settings_set_updated_at
before update on public.prospecting_org_settings
for each row execute function public.set_updated_at();

alter table public.prospecting_org_settings enable row level security;

drop policy if exists "prospecting_settings_select" on public.prospecting_org_settings;
create policy "prospecting_settings_select"
  on public.prospecting_org_settings for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "prospecting_settings_write" on public.prospecting_org_settings;
create policy "prospecting_settings_write"
  on public.prospecting_org_settings for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Saved searches / ICP criteria
-- ---------------------------------------------------------------------------

create table if not exists public.prospecting_searches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  status text not null default 'active'
    check (status in ('active', 'paused', 'archived')),
  industry text,
  industries_json jsonb not null default '[]'::jsonb,
  country text,
  region text,
  city text,
  company_size text,
  employee_band text,
  revenue_band text,
  technology text,
  tags_json jsonb not null default '[]'::jsonb,
  keywords_json jsonb not null default '[]'::jsonb,
  keyword text,
  min_lead_score integer,
  created_by uuid,
  deleted_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists prospecting_searches_org_idx
  on public.prospecting_searches (organization_id, created_at desc)
  where deleted_at is null;

drop trigger if exists prospecting_searches_set_updated_at on public.prospecting_searches;
create trigger prospecting_searches_set_updated_at
before update on public.prospecting_searches
for each row execute function public.set_updated_at();

alter table public.prospecting_searches enable row level security;

drop policy if exists "prospecting_searches_select" on public.prospecting_searches;
create policy "prospecting_searches_select"
  on public.prospecting_searches for select
  to authenticated using (public.is_org_member(organization_id) and deleted_at is null);

drop policy if exists "prospecting_searches_write" on public.prospecting_searches;
create policy "prospecting_searches_write"
  on public.prospecting_searches for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Prospects
-- ---------------------------------------------------------------------------

create table if not exists public.prospecting_prospects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  search_id uuid references public.prospecting_searches (id) on delete set null,
  company_id uuid references public.companies (id) on delete set null,
  crm_lead_id uuid,
  company_name text not null,
  normalized_name text not null default '',
  website_url text,
  normalized_domain text,
  industry text,
  business_class text,
  country text,
  region text,
  city text,
  company_size text,
  employee_band text,
  revenue_band text,
  phone text,
  email text,
  address text,
  description text,
  social_json jsonb not null default '{}'::jsonb,
  technologies_json jsonb not null default '[]'::jsonb,
  tags_json jsonb not null default '[]'::jsonb,
  analysis_json jsonb not null default '{}'::jsonb,
  enrichment_json jsonb not null default '{}'::jsonb,
  opportunities_json jsonb not null default '[]'::jsonb,
  decision_makers_json jsonb not null default '[]'::jsonb,
  research_summary text,
  lead_score integer not null default 0 check (lead_score between 0 and 100),
  lead_quality text not null default 'cold'
    check (lead_quality in ('cold', 'warm', 'hot', 'enterprise', 'strategic')),
  ai_confidence numeric(5,2) not null default 0
    check (ai_confidence >= 0 and ai_confidence <= 1),
  recommendation text not null default 'later'
    check (recommendation in (
      'call_now', 'send_email', 'book_demo', 'linkedin', 'later', 'not_interesting'
    )),
  status text not null default 'new'
    check (status in (
      'new', 'researching', 'analyzed', 'scored', 'enriched',
      'crm_linked', 'dismissed', 'failed'
    )),
  duplicate_of_prospect_id uuid references public.prospecting_prospects (id) on delete set null,
  is_duplicate boolean not null default false,
  source text not null default 'manual'
    check (source in ('manual', 'search', 'import', 'company_import', 'scrape', 'api')),
  last_researched_at timestamptz,
  last_scored_at timestamptz,
  provider text,
  model text,
  tokens_in integer not null default 0,
  tokens_out integer not null default 0,
  cost_usd numeric(12,6) not null default 0,
  created_by uuid,
  deleted_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists prospecting_prospects_org_status_idx
  on public.prospecting_prospects (organization_id, status, lead_score desc)
  where deleted_at is null;

create index if not exists prospecting_prospects_domain_idx
  on public.prospecting_prospects (organization_id, normalized_domain)
  where deleted_at is null and normalized_domain is not null;

create index if not exists prospecting_prospects_score_idx
  on public.prospecting_prospects (organization_id, lead_score desc)
  where deleted_at is null;

create index if not exists prospecting_prospects_class_idx
  on public.prospecting_prospects (organization_id, business_class)
  where deleted_at is null;

drop trigger if exists prospecting_prospects_set_updated_at on public.prospecting_prospects;
create trigger prospecting_prospects_set_updated_at
before update on public.prospecting_prospects
for each row execute function public.set_updated_at();

alter table public.prospecting_prospects enable row level security;

drop policy if exists "prospecting_prospects_select" on public.prospecting_prospects;
create policy "prospecting_prospects_select"
  on public.prospecting_prospects for select
  to authenticated using (public.is_org_member(organization_id) and deleted_at is null);

drop policy if exists "prospecting_prospects_write" on public.prospecting_prospects;
create policy "prospecting_prospects_write"
  on public.prospecting_prospects for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Research runs
-- ---------------------------------------------------------------------------

create table if not exists public.prospecting_research_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  prospect_id uuid not null references public.prospecting_prospects (id) on delete cascade,
  agent_id uuid references public.ai_agents (id) on delete set null,
  ai_run_id uuid references public.ai_runs (id) on delete set null,
  status text not null default 'queued'
    check (status in (
      'queued', 'running', 'completed', 'failed', 'cancelled', 'needs_approval'
    )),
  stage text not null default 'fetch'
    check (stage in (
      'fetch', 'analyze', 'classify', 'enrich', 'score', 'opportunities',
      'recommend', 'persist', 'done'
    )),
  input_json jsonb not null default '{}'::jsonb,
  output_json jsonb not null default '{}'::jsonb,
  error_message text,
  provider text,
  model text,
  tokens_in integer not null default 0,
  tokens_out integer not null default 0,
  cost_usd numeric(12,6) not null default 0,
  latency_ms integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists prospecting_research_runs_org_idx
  on public.prospecting_research_runs (organization_id, created_at desc);

drop trigger if exists prospecting_research_runs_set_updated_at on public.prospecting_research_runs;
create trigger prospecting_research_runs_set_updated_at
before update on public.prospecting_research_runs
for each row execute function public.set_updated_at();

alter table public.prospecting_research_runs enable row level security;

drop policy if exists "prospecting_runs_select" on public.prospecting_research_runs;
create policy "prospecting_runs_select"
  on public.prospecting_research_runs for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "prospecting_runs_write" on public.prospecting_research_runs;
create policy "prospecting_runs_write"
  on public.prospecting_research_runs for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- History / audit
-- ---------------------------------------------------------------------------

create table if not exists public.prospecting_history_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  prospect_id uuid references public.prospecting_prospects (id) on delete set null,
  search_id uuid references public.prospecting_searches (id) on delete set null,
  research_run_id uuid references public.prospecting_research_runs (id) on delete set null,
  event_type text not null,
  actor_user_id uuid,
  summary text not null default '',
  payload_json jsonb not null default '{}'::jsonb,
  provider text,
  model text,
  cost_usd numeric(12,6) not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists prospecting_history_org_idx
  on public.prospecting_history_events (organization_id, created_at desc);

alter table public.prospecting_history_events enable row level security;

drop policy if exists "prospecting_history_select" on public.prospecting_history_events;
create policy "prospecting_history_select"
  on public.prospecting_history_events for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "prospecting_history_insert" on public.prospecting_history_events;
create policy "prospecting_history_insert"
  on public.prospecting_history_events for insert
  to authenticated with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Bulk jobs
-- ---------------------------------------------------------------------------

create table if not exists public.prospecting_bulk_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  job_type text not null
    check (job_type in (
      'import', 'analyze', 'score', 'enrich', 'export', 'crm_add'
    )),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  total_count integer not null default 0,
  success_count integer not null default 0,
  failure_count integer not null default 0,
  input_json jsonb not null default '{}'::jsonb,
  result_json jsonb not null default '{}'::jsonb,
  error_message text,
  created_by uuid,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists prospecting_bulk_jobs_org_idx
  on public.prospecting_bulk_jobs (organization_id, created_at desc);

drop trigger if exists prospecting_bulk_jobs_set_updated_at on public.prospecting_bulk_jobs;
create trigger prospecting_bulk_jobs_set_updated_at
before update on public.prospecting_bulk_jobs
for each row execute function public.set_updated_at();

alter table public.prospecting_bulk_jobs enable row level security;

drop policy if exists "prospecting_bulk_select" on public.prospecting_bulk_jobs;
create policy "prospecting_bulk_select"
  on public.prospecting_bulk_jobs for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "prospecting_bulk_write" on public.prospecting_bulk_jobs;
create policy "prospecting_bulk_write"
  on public.prospecting_bulk_jobs for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
