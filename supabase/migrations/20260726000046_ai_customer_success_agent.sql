-- Storaflow — AI Customer Success Agent (Phase 27F)
-- Additive only. Run manually AFTER 20260726000045_ai_marketing_agent.sql
-- Do NOT auto-execute from the app.
-- Do NOT modify migrations 00001–00045.
-- Multi-tenant CS: health, churn, renewals, onboarding, upsell, success plans.
-- Idempotent.

-- ---------------------------------------------------------------------------
-- Organization settings
-- ---------------------------------------------------------------------------

create table if not exists public.customer_success_org_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  enabled boolean not null default true,
  approval_mode text not null default 'semi_autonomous'
    check (approval_mode in (
      'read_only', 'suggest', 'approval_required', 'semi_autonomous', 'fully_autonomous'
    )),
  provider text not null default 'openai',
  model text not null default 'gpt-4.1-mini',
  health_weights_json jsonb not null default '{
    "activity": 20, "adoption": 15, "support": 15, "nps": 10,
    "revenue": 15, "contract": 10, "payment": 10, "tasks": 5
  }'::jsonb,
  churn_threshold integer not null default 55 check (churn_threshold between 0 and 100),
  renewal_window_days integer not null default 60 check (renewal_window_days > 0),
  notification_rules_json jsonb not null default '{}'::jsonb,
  customer_segments_json jsonb not null default '[]'::jsonb,
  rate_limit_per_minute integer not null default 40 check (rate_limit_per_minute > 0),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists customer_success_org_settings_set_updated_at on public.customer_success_org_settings;
create trigger customer_success_org_settings_set_updated_at
before update on public.customer_success_org_settings
for each row execute function public.set_updated_at();

alter table public.customer_success_org_settings enable row level security;

drop policy if exists "cs_settings_select" on public.customer_success_org_settings;
create policy "cs_settings_select"
  on public.customer_success_org_settings for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "cs_settings_write" on public.customer_success_org_settings;
create policy "cs_settings_write"
  on public.customer_success_org_settings for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Customer health profiles (per company)
-- ---------------------------------------------------------------------------

create table if not exists public.customer_success_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  health_score integer not null default 50 check (health_score between 0 and 100),
  health_class text not null default 'stable'
    check (health_class in (
      'excellent', 'healthy', 'stable', 'needs_attention', 'critical', 'at_risk'
    )),
  churn_probability numeric(5,2) not null default 0
    check (churn_probability >= 0 and churn_probability <= 1),
  churn_reason text,
  churn_confidence numeric(5,2) not null default 0
    check (churn_confidence >= 0 and churn_confidence <= 1),
  nps_score integer check (nps_score is null or nps_score between -100 and 100),
  csat_score numeric(5,2) check (csat_score is null or (csat_score >= 0 and csat_score <= 5)),
  adoption_score integer not null default 0 check (adoption_score between 0 and 100),
  engagement_score integer not null default 0 check (engagement_score between 0 and 100),
  revenue_value numeric(14,2) not null default 0,
  contract_ends_at date,
  renewal_probability numeric(5,2)
    check (renewal_probability is null or (renewal_probability >= 0 and renewal_probability <= 1)),
  owner_user_id uuid,
  signals_json jsonb not null default '{}'::jsonb,
  insights_json jsonb not null default '{}'::jsonb,
  upsell_json jsonb not null default '[]'::jsonb,
  cross_sell_json jsonb not null default '[]'::jsonb,
  feature_adoption_json jsonb not null default '{}'::jsonb,
  timeline_json jsonb not null default '[]'::jsonb,
  ai_confidence numeric(5,2) not null default 0
    check (ai_confidence >= 0 and ai_confidence <= 1),
  provider text,
  model text,
  analyzed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, company_id)
);

create index if not exists cs_profiles_health_idx
  on public.customer_success_profiles (organization_id, health_score asc);
create index if not exists cs_profiles_churn_idx
  on public.customer_success_profiles (organization_id, churn_probability desc);
create index if not exists cs_profiles_renewal_idx
  on public.customer_success_profiles (organization_id, contract_ends_at);

drop trigger if exists customer_success_profiles_set_updated_at on public.customer_success_profiles;
create trigger customer_success_profiles_set_updated_at
before update on public.customer_success_profiles
for each row execute function public.set_updated_at();

alter table public.customer_success_profiles enable row level security;

drop policy if exists "cs_profiles_select" on public.customer_success_profiles;
create policy "cs_profiles_select"
  on public.customer_success_profiles for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "cs_profiles_write" on public.customer_success_profiles;
create policy "cs_profiles_write"
  on public.customer_success_profiles for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Success plans
-- ---------------------------------------------------------------------------

create table if not exists public.customer_success_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  profile_id uuid references public.customer_success_profiles (id) on delete set null,
  name text not null,
  status text not null default 'active'
    check (status in ('draft', 'active', 'completed', 'cancelled')),
  milestones_json jsonb not null default '[]'::jsonb,
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists cs_plans_org_idx
  on public.customer_success_plans (organization_id, status, created_at desc);

drop trigger if exists customer_success_plans_set_updated_at on public.customer_success_plans;
create trigger customer_success_plans_set_updated_at
before update on public.customer_success_plans
for each row execute function public.set_updated_at();

alter table public.customer_success_plans enable row level security;

drop policy if exists "cs_plans_select" on public.customer_success_plans;
create policy "cs_plans_select"
  on public.customer_success_plans for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "cs_plans_write" on public.customer_success_plans;
create policy "cs_plans_write"
  on public.customer_success_plans for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Renewals
-- ---------------------------------------------------------------------------

create table if not exists public.customer_success_renewals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  profile_id uuid references public.customer_success_profiles (id) on delete set null,
  contract_ends_at date not null,
  renewal_probability numeric(5,2) not null default 0.5
    check (renewal_probability >= 0 and renewal_probability <= 1),
  risk_level text not null default 'medium'
    check (risk_level in ('low', 'medium', 'high', 'critical')),
  status text not null default 'upcoming'
    check (status in ('upcoming', 'in_progress', 'won', 'lost', 'deferred')),
  recommendations_json jsonb not null default '[]'::jsonb,
  tasks_json jsonb not null default '[]'::jsonb,
  owner_user_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, company_id, contract_ends_at)
);

create index if not exists cs_renewals_org_idx
  on public.customer_success_renewals (organization_id, contract_ends_at, risk_level);

drop trigger if exists customer_success_renewals_set_updated_at on public.customer_success_renewals;
create trigger customer_success_renewals_set_updated_at
before update on public.customer_success_renewals
for each row execute function public.set_updated_at();

alter table public.customer_success_renewals enable row level security;

drop policy if exists "cs_renewals_select" on public.customer_success_renewals;
create policy "cs_renewals_select"
  on public.customer_success_renewals for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "cs_renewals_write" on public.customer_success_renewals;
create policy "cs_renewals_write"
  on public.customer_success_renewals for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Onboarding checklists
-- ---------------------------------------------------------------------------

create table if not exists public.customer_success_onboarding (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  profile_id uuid references public.customer_success_profiles (id) on delete set null,
  status text not null default 'in_progress'
    check (status in ('not_started', 'in_progress', 'completed', 'stalled')),
  checklist_json jsonb not null default '[]'::jsonb,
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, company_id)
);

drop trigger if exists customer_success_onboarding_set_updated_at on public.customer_success_onboarding;
create trigger customer_success_onboarding_set_updated_at
before update on public.customer_success_onboarding
for each row execute function public.set_updated_at();

alter table public.customer_success_onboarding enable row level security;

drop policy if exists "cs_onboarding_select" on public.customer_success_onboarding;
create policy "cs_onboarding_select"
  on public.customer_success_onboarding for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "cs_onboarding_write" on public.customer_success_onboarding;
create policy "cs_onboarding_write"
  on public.customer_success_onboarding for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Recommendations + alerts
-- ---------------------------------------------------------------------------

create table if not exists public.customer_success_recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  recommendation_type text not null
    check (recommendation_type in (
      'schedule_review', 'call_customer', 'send_guide', 'demo_feature',
      'schedule_training', 'renewal_talk', 'upsell_offer', 'offer_support',
      'complete_onboarding', 'reduce_churn'
    )),
  title text not null,
  rationale text not null default '',
  priority integer not null default 50 check (priority between 0 and 100),
  status text not null default 'open'
    check (status in ('open', 'accepted', 'dismissed', 'applied')),
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists cs_recs_org_idx
  on public.customer_success_recommendations (organization_id, status, priority desc);

alter table public.customer_success_recommendations enable row level security;

drop policy if exists "cs_recs_select" on public.customer_success_recommendations;
create policy "cs_recs_select"
  on public.customer_success_recommendations for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "cs_recs_write" on public.customer_success_recommendations;
create policy "cs_recs_write"
  on public.customer_success_recommendations for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create table if not exists public.customer_success_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  alert_type text not null
    check (alert_type in (
      'no_login', 'high_support', 'low_health', 'contract_expiring',
      'negative_trend', 'onboarding_incomplete', 'payment_risk', 'churn_spike'
    )),
  severity text not null default 'medium'
    check (severity in ('low', 'medium', 'high', 'critical')),
  title text not null,
  message text not null default '',
  status text not null default 'open'
    check (status in ('open', 'acknowledged', 'resolved')),
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists cs_alerts_org_idx
  on public.customer_success_alerts (organization_id, status, severity, created_at desc);

alter table public.customer_success_alerts enable row level security;

drop policy if exists "cs_alerts_select" on public.customer_success_alerts;
create policy "cs_alerts_select"
  on public.customer_success_alerts for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "cs_alerts_write" on public.customer_success_alerts;
create policy "cs_alerts_write"
  on public.customer_success_alerts for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- History + bulk jobs
-- ---------------------------------------------------------------------------

create table if not exists public.customer_success_history_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  company_id uuid,
  event_type text not null,
  actor_user_id uuid,
  summary text not null default '',
  payload_json jsonb not null default '{}'::jsonb,
  provider text,
  model text,
  cost_usd numeric(12,6) not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists cs_history_org_idx
  on public.customer_success_history_events (organization_id, created_at desc);

alter table public.customer_success_history_events enable row level security;

drop policy if exists "cs_history_select" on public.customer_success_history_events;
create policy "cs_history_select"
  on public.customer_success_history_events for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "cs_history_insert" on public.customer_success_history_events;
create policy "cs_history_insert"
  on public.customer_success_history_events for insert
  to authenticated with check (public.is_org_member(organization_id));

create table if not exists public.customer_success_bulk_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  job_type text not null
    check (job_type in (
      'analyze', 'success_plans', 'renewal', 'emails', 'training', 'recommendations'
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

drop trigger if exists customer_success_bulk_set_updated_at on public.customer_success_bulk_jobs;
create trigger customer_success_bulk_set_updated_at
before update on public.customer_success_bulk_jobs
for each row execute function public.set_updated_at();

alter table public.customer_success_bulk_jobs enable row level security;

drop policy if exists "cs_bulk_select" on public.customer_success_bulk_jobs;
create policy "cs_bulk_select"
  on public.customer_success_bulk_jobs for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "cs_bulk_write" on public.customer_success_bulk_jobs;
create policy "cs_bulk_write"
  on public.customer_success_bulk_jobs for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
