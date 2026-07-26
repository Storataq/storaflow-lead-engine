-- Lead Engine — Funnel Activation & Campaign Readiness (Phase 20D)
-- Additive only. Run manually AFTER 20260726000009_crm_lead_contacts.sql
-- Do NOT auto-execute from the app.

-- ---------------------------------------------------------------------------
-- Organization funnel policy (extend organization_settings)
-- ---------------------------------------------------------------------------

alter table public.organization_settings
  add column if not exists funnel_activation_mode text not null default 'assisted'
    check (funnel_activation_mode in ('manual', 'assisted', 'automatic')),
  add column if not exists qualification_threshold integer not null default 50
    check (qualification_threshold between 0 and 100),
  add column if not exists opportunity_threshold integer not null default 40
    check (opportunity_threshold between 0 and 100),
  add column if not exists auto_deal_mode text not null default 'recommend'
    check (auto_deal_mode in ('never', 'recommend', 'automatic')),
  add column if not exists auto_create_tasks boolean not null default true,
  add column if not exists allow_role_emails boolean not null default true,
  add column if not exists require_named_contact boolean not null default false,
  add column if not exists require_manual_approval boolean not null default true,
  add column if not exists skip_recent_activation_hours integer not null default 24
    check (skip_recent_activation_hours between 0 and 720),
  add column if not exists default_funnel_pipeline_id uuid
    references public.crm_pipelines (id) on delete set null;

comment on column public.organization_settings.funnel_activation_mode is
  'manual | assisted | automatic — default assisted';
comment on column public.organization_settings.auto_deal_mode is
  'never | recommend | automatic — default recommend (no invented revenue)';

-- ---------------------------------------------------------------------------
-- funnel_activation_runs
-- ---------------------------------------------------------------------------

create table if not exists public.funnel_activation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  lead_id uuid references public.crm_leads (id) on delete set null,
  trigger_source text not null default 'manual',
  status text not null default 'pending'
    check (status in (
      'pending',
      'evaluating',
      'creating_lead',
      'qualifying',
      'analyzing_opportunity',
      'assigning_pipeline',
      'creating_tasks',
      'calculating_campaign_readiness',
      'completed',
      'completed_with_warnings',
      'needs_review',
      'failed',
      'cancelled',
      'retrying'
    )),
  current_step text,
  completed_steps text[] not null default '{}'::text[],
  failed_step text,
  retry_count integer not null default 0,
  warning_count integer not null default 0,
  idempotency_key text not null,
  result_summary jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, idempotency_key)
);

create index if not exists funnel_activation_runs_org_created_idx
  on public.funnel_activation_runs (organization_id, created_at desc);

create index if not exists funnel_activation_runs_company_idx
  on public.funnel_activation_runs (organization_id, company_id, created_at desc);

create index if not exists funnel_activation_runs_lead_idx
  on public.funnel_activation_runs (organization_id, lead_id, created_at desc);

create index if not exists funnel_activation_runs_status_idx
  on public.funnel_activation_runs (organization_id, status);

create trigger funnel_activation_runs_set_updated_at
before update on public.funnel_activation_runs
for each row execute function public.set_updated_at();

alter table public.funnel_activation_runs enable row level security;

create policy "funnel_activation_runs_select" on public.funnel_activation_runs
  for select to authenticated
  using (public.is_org_member(organization_id));
create policy "funnel_activation_runs_insert" on public.funnel_activation_runs
  for insert to authenticated
  with check (public.is_org_member(organization_id));
create policy "funnel_activation_runs_update" on public.funnel_activation_runs
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "funnel_activation_runs_delete" on public.funnel_activation_runs
  for delete to authenticated
  using (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- campaign_readiness
-- ---------------------------------------------------------------------------

create table if not exists public.campaign_readiness (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  lead_id uuid not null references public.crm_leads (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  status text not null default 'unknown'
    check (status in (
      'ready',
      'ready_with_review',
      'needs_contact',
      'needs_verification',
      'needs_personalization',
      'needs_approval',
      'duplicate',
      'suppressed',
      'blocked',
      'not_qualified',
      'not_eligible',
      'unknown'
    )),
  approval_status text not null default 'pending_review'
    check (approval_status in (
      'pending_review',
      'approved',
      'rejected',
      'changes_required',
      'automatically_approved',
      'suppressed'
    )),
  sales_priority text not null default 'not_ready'
    check (sales_priority in (
      'critical',
      'high',
      'medium',
      'low',
      'nurture',
      'not_ready'
    )),
  personalization_status text not null default 'missing_personalization'
    check (personalization_status in (
      'personalized',
      'company_level',
      'limited',
      'missing_personalization',
      'needs_review'
    )),
  preferred_email text,
  preferred_name text,
  preferred_phone text,
  contactability text,
  qualification_score integer not null default 0
    check (qualification_score between 0 and 100),
  opportunity_score integer not null default 0
    check (opportunity_score between 0 and 100),
  priority_score integer not null default 0
    check (priority_score between 0 and 100),
  reasons text[] not null default '{}'::text[],
  missing_requirements text[] not null default '{}'::text[],
  factors_json jsonb not null default '[]'::jsonb,
  personalization_json jsonb not null default '{}'::jsonb,
  suppression_reason text,
  activation_run_id uuid references public.funnel_activation_runs (id) on delete set null,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  calculated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, lead_id)
);

create index if not exists campaign_readiness_org_status_idx
  on public.campaign_readiness (organization_id, status, updated_at desc);

create index if not exists campaign_readiness_org_approval_idx
  on public.campaign_readiness (organization_id, approval_status);

create index if not exists campaign_readiness_org_priority_idx
  on public.campaign_readiness (organization_id, sales_priority);

create trigger campaign_readiness_set_updated_at
before update on public.campaign_readiness
for each row execute function public.set_updated_at();

alter table public.campaign_readiness enable row level security;

create policy "campaign_readiness_select" on public.campaign_readiness
  for select to authenticated
  using (public.is_org_member(organization_id));
create policy "campaign_readiness_insert" on public.campaign_readiness
  for insert to authenticated
  with check (public.is_org_member(organization_id));
create policy "campaign_readiness_update" on public.campaign_readiness
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "campaign_readiness_delete" on public.campaign_readiness
  for delete to authenticated
  using (public.is_org_member(organization_id));
