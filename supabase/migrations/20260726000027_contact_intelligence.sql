-- Storaflow — AI Contact Intelligence (Phase 25B)
-- Additive only. Run manually AFTER 20260726000026_company_intelligence.sql
-- Do NOT auto-execute from the app.
-- Do NOT modify migrations 00001–00026.
-- Idempotent: safe to re-run after partial execution.

-- ---------------------------------------------------------------------------
-- Denormalized intelligence fields on CRM lead contacts
-- ---------------------------------------------------------------------------

alter table public.crm_lead_contacts
  add column if not exists health_score numeric(5,2),
  add column if not exists quality_score numeric(5,2),
  add column if not exists intelligence_confidence numeric(5,2),
  add column if not exists intelligence_status text
    check (
      intelligence_status is null
      or intelligence_status in ('idle', 'processing', 'completed', 'failed')
    ),
  add column if not exists intelligence_analyzed_at timestamptz,
  add column if not exists intelligence_needs_review boolean not null default false,
  add column if not exists is_decision_maker boolean not null default false,
  add column if not exists department text,
  add column if not exists management_level text,
  add column if not exists decision_maker_level text,
  add column if not exists preferred_channel text,
  add column if not exists primary_language text,
  add column if not exists country text,
  add column if not exists badges_json jsonb not null default '[]'::jsonb;

create index if not exists crm_lead_contacts_org_health_score_idx
  on public.crm_lead_contacts (organization_id, health_score desc nulls last);

create index if not exists crm_lead_contacts_org_quality_score_idx
  on public.crm_lead_contacts (organization_id, quality_score desc nulls last);

create index if not exists crm_lead_contacts_org_decision_maker_idx
  on public.crm_lead_contacts (organization_id, is_decision_maker)
  where is_decision_maker = true;

-- ---------------------------------------------------------------------------
-- Latest intelligence profile per CRM contact
-- ---------------------------------------------------------------------------

create table if not exists public.contact_intelligence_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  contact_id uuid not null references public.crm_lead_contacts (id) on delete cascade,
  lead_id uuid not null references public.crm_leads (id) on delete cascade,
  status text not null default 'completed'
    check (status in ('idle', 'processing', 'completed', 'failed')),
  summary_json jsonb not null default '{}'::jsonb,
  profile_json jsonb not null default '{}'::jsonb,
  decision_maker_json jsonb not null default '{}'::jsonb,
  communication_json jsonb not null default '{}'::jsonb,
  health_json jsonb not null default '{}'::jsonb,
  quality_json jsonb not null default '{}'::jsonb,
  timeline_json jsonb not null default '[]'::jsonb,
  insights_json jsonb not null default '[]'::jsonb,
  recommendations_json jsonb not null default '[]'::jsonb,
  badges_json jsonb not null default '[]'::jsonb,
  signals_json jsonb not null default '{}'::jsonb,
  health_score numeric(5,2) not null default 0,
  quality_score numeric(5,2) not null default 0,
  confidence numeric(5,2) not null default 0,
  needs_review boolean not null default false,
  provider text,
  model text,
  analyzed_by text not null default 'automatic'
    check (analyzed_by in ('automatic', 'hybrid', 'manual')),
  source text not null default 'manual'
    check (source in ('manual', 'enrichment', 'scheduled', 'api', 'lead')),
  actor_user_id uuid,
  error_message text,
  analyzed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (contact_id)
);

create index if not exists contact_intelligence_profiles_org_idx
  on public.contact_intelligence_profiles (organization_id, health_score desc);

create index if not exists contact_intelligence_profiles_lead_idx
  on public.contact_intelligence_profiles (organization_id, lead_id);

drop trigger if exists contact_intelligence_profiles_set_updated_at
  on public.contact_intelligence_profiles;
create trigger contact_intelligence_profiles_set_updated_at
before update on public.contact_intelligence_profiles
for each row execute function public.set_updated_at();

alter table public.contact_intelligence_profiles enable row level security;

drop policy if exists "contact_intelligence_profiles_select"
  on public.contact_intelligence_profiles;
create policy "contact_intelligence_profiles_select"
  on public.contact_intelligence_profiles for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "contact_intelligence_profiles_insert"
  on public.contact_intelligence_profiles;
create policy "contact_intelligence_profiles_insert"
  on public.contact_intelligence_profiles for insert
  to authenticated with check (public.is_org_owner_or_admin(organization_id));

drop policy if exists "contact_intelligence_profiles_update"
  on public.contact_intelligence_profiles;
create policy "contact_intelligence_profiles_update"
  on public.contact_intelligence_profiles for update
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

drop policy if exists "contact_intelligence_profiles_delete"
  on public.contact_intelligence_profiles;
create policy "contact_intelligence_profiles_delete"
  on public.contact_intelligence_profiles for delete
  to authenticated using (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Analysis run history
-- ---------------------------------------------------------------------------

create table if not exists public.contact_intelligence_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  contact_id uuid not null references public.crm_lead_contacts (id) on delete cascade,
  lead_id uuid not null references public.crm_leads (id) on delete cascade,
  profile_id uuid references public.contact_intelligence_profiles (id) on delete set null,
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

create index if not exists contact_intelligence_runs_org_contact_idx
  on public.contact_intelligence_runs (organization_id, contact_id, created_at desc);

alter table public.contact_intelligence_runs enable row level security;

drop policy if exists "contact_intelligence_runs_select"
  on public.contact_intelligence_runs;
create policy "contact_intelligence_runs_select"
  on public.contact_intelligence_runs for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "contact_intelligence_runs_insert"
  on public.contact_intelligence_runs;
create policy "contact_intelligence_runs_insert"
  on public.contact_intelligence_runs for insert
  to authenticated with check (public.is_org_owner_or_admin(organization_id));

drop policy if exists "contact_intelligence_runs_update"
  on public.contact_intelligence_runs;
create policy "contact_intelligence_runs_update"
  on public.contact_intelligence_runs for update
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

comment on table public.contact_intelligence_profiles is
  'Phase 25B — latest AI contact intelligence snapshot per CRM lead contact.';
comment on table public.contact_intelligence_runs is
  'Phase 25B — contact intelligence analysis run history / background extension point.';
