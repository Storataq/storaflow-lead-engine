-- Storaflow — AI Company Intelligence (Phase 25A)
-- Additive only. Run manually AFTER 20260726000025_company_category_actions.sql
-- Do NOT auto-execute from the app.
-- Do NOT modify migrations 00001–00025.
-- Idempotent: safe to re-run after partial execution.

-- ---------------------------------------------------------------------------
-- Denormalized intelligence fields on companies (list filters / badges)
-- ---------------------------------------------------------------------------

alter table public.companies
  add column if not exists intelligence_score numeric(5,2),
  add column if not exists lead_potential_score numeric(5,2),
  add column if not exists intelligence_status text
    check (
      intelligence_status is null
      or intelligence_status in ('idle', 'processing', 'completed', 'failed')
    ),
  add column if not exists intelligence_analyzed_at timestamptz,
  add column if not exists intelligence_needs_review boolean not null default false;

create index if not exists companies_org_intelligence_score_idx
  on public.companies (organization_id, intelligence_score desc nulls last);

-- ---------------------------------------------------------------------------
-- Latest intelligence profile per company
-- ---------------------------------------------------------------------------

create table if not exists public.company_intelligence_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  status text not null default 'completed'
    check (status in ('idle', 'processing', 'completed', 'failed')),
  summary_json jsonb not null default '{}'::jsonb,
  business_profile_json jsonb not null default '{}'::jsonb,
  online_presence_json jsonb not null default '{}'::jsonb,
  insights_json jsonb not null default '[]'::jsonb,
  health_json jsonb not null default '{}'::jsonb,
  lead_potential_json jsonb not null default '{}'::jsonb,
  contact_quality_json jsonb not null default '{}'::jsonb,
  growth_signals_json jsonb not null default '[]'::jsonb,
  recommendations_json jsonb not null default '[]'::jsonb,
  signals_json jsonb not null default '{}'::jsonb,
  health_score numeric(5,2) not null default 0,
  lead_potential_score numeric(5,2) not null default 0,
  confidence numeric(5,2) not null default 0,
  needs_review boolean not null default false,
  provider text,
  model text,
  analyzed_by text not null default 'automatic'
    check (analyzed_by in ('automatic', 'hybrid', 'manual')),
  source text not null default 'manual'
    check (source in ('manual', 'enrichment', 'scheduled', 'api')),
  actor_user_id uuid,
  error_message text,
  analyzed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id)
);

create index if not exists company_intelligence_profiles_org_idx
  on public.company_intelligence_profiles (organization_id, health_score desc);

create index if not exists company_intelligence_profiles_status_idx
  on public.company_intelligence_profiles (organization_id, status);

drop trigger if exists company_intelligence_profiles_set_updated_at
  on public.company_intelligence_profiles;
create trigger company_intelligence_profiles_set_updated_at
before update on public.company_intelligence_profiles
for each row execute function public.set_updated_at();

alter table public.company_intelligence_profiles enable row level security;

drop policy if exists "company_intelligence_profiles_select"
  on public.company_intelligence_profiles;
create policy "company_intelligence_profiles_select"
  on public.company_intelligence_profiles for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "company_intelligence_profiles_insert"
  on public.company_intelligence_profiles;
create policy "company_intelligence_profiles_insert"
  on public.company_intelligence_profiles for insert
  to authenticated with check (public.is_org_owner_or_admin(organization_id));

drop policy if exists "company_intelligence_profiles_update"
  on public.company_intelligence_profiles;
create policy "company_intelligence_profiles_update"
  on public.company_intelligence_profiles for update
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

drop policy if exists "company_intelligence_profiles_delete"
  on public.company_intelligence_profiles;
create policy "company_intelligence_profiles_delete"
  on public.company_intelligence_profiles for delete
  to authenticated using (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Analysis run history (audit + future background jobs)
-- ---------------------------------------------------------------------------

create table if not exists public.company_intelligence_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  profile_id uuid references public.company_intelligence_profiles (id) on delete set null,
  status text not null default 'completed'
    check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  input_summary_json jsonb not null default '{}'::jsonb,
  output_json jsonb not null default '{}'::jsonb,
  error_message text,
  provider text,
  model text,
  duration_ms integer,
  actor_user_id uuid,
  source text not null default 'manual',
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create index if not exists company_intelligence_runs_org_company_idx
  on public.company_intelligence_runs (organization_id, company_id, created_at desc);

alter table public.company_intelligence_runs enable row level security;

drop policy if exists "company_intelligence_runs_select"
  on public.company_intelligence_runs;
create policy "company_intelligence_runs_select"
  on public.company_intelligence_runs for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "company_intelligence_runs_insert"
  on public.company_intelligence_runs;
create policy "company_intelligence_runs_insert"
  on public.company_intelligence_runs for insert
  to authenticated with check (public.is_org_owner_or_admin(organization_id));

drop policy if exists "company_intelligence_runs_update"
  on public.company_intelligence_runs;
create policy "company_intelligence_runs_update"
  on public.company_intelligence_runs for update
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

comment on table public.company_intelligence_profiles is
  'Phase 25A — latest AI company intelligence snapshot per company.';
comment on table public.company_intelligence_runs is
  'Phase 25A — intelligence analysis run history / extension point for background jobs.';
