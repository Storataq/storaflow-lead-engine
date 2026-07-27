-- Storaflow — AI Lead Scoring Engine (Phase 25E)
-- Additive only. Run manually AFTER 20260726000029_ai_email_campaign_builder.sql
-- Do NOT auto-execute from the app.
-- Do NOT modify migrations 00001–00029.
-- Extends Company Intelligence, Contact Intelligence, CRM — does not replace them.
-- Idempotent: safe to re-run after partial execution.

-- ---------------------------------------------------------------------------
-- Denormalized AI scoring fields on crm_leads
-- ---------------------------------------------------------------------------

alter table public.crm_leads
  add column if not exists ai_lead_score numeric(5,2),
  add column if not exists score_classification text
    check (
      score_classification is null
      or score_classification in (
        'very_hot',
        'hot',
        'warm',
        'cold',
        'very_cold'
      )
    ),
  add column if not exists opportunity_band text
    check (
      opportunity_band is null
      or opportunity_band in (
        'very_high',
        'high',
        'medium',
        'low',
        'very_low'
      )
    ),
  add column if not exists opportunity_confidence numeric(5,2),
  add column if not exists risk_score numeric(5,2),
  add column if not exists buying_readiness text
    check (
      buying_readiness is null
      or buying_readiness in (
        'ready_now',
        'ready_soon',
        'researching',
        'unknown',
        'long_term'
      )
    ),
  add column if not exists scoring_confidence numeric(5,2),
  add column if not exists scored_at timestamptz,
  add column if not exists score_delta numeric(5,2);

create index if not exists crm_leads_org_ai_lead_score_idx
  on public.crm_leads (organization_id, ai_lead_score desc nulls last);

create index if not exists crm_leads_org_classification_idx
  on public.crm_leads (organization_id, score_classification);

create index if not exists crm_leads_org_buying_readiness_idx
  on public.crm_leads (organization_id, buying_readiness);

-- Optional denorm on deals for pipeline badges (join-friendly)
alter table public.crm_deals
  add column if not exists lead_ai_score numeric(5,2),
  add column if not exists lead_score_classification text;

create index if not exists crm_deals_org_lead_ai_score_idx
  on public.crm_deals (organization_id, lead_ai_score desc nulls last);

-- ---------------------------------------------------------------------------
-- Org scoring configuration (weights, thresholds, automation triggers)
-- ---------------------------------------------------------------------------

create table if not exists public.lead_scoring_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  weights_json jsonb not null default '{}'::jsonb,
  classification_ranges_json jsonb not null default '{}'::jsonb,
  thresholds_json jsonb not null default '{}'::jsonb,
  automation_triggers_json jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id)
);

drop trigger if exists lead_scoring_settings_set_updated_at
  on public.lead_scoring_settings;
create trigger lead_scoring_settings_set_updated_at
before update on public.lead_scoring_settings
for each row execute function public.set_updated_at();

alter table public.lead_scoring_settings enable row level security;

drop policy if exists "lead_scoring_settings_select" on public.lead_scoring_settings;
create policy "lead_scoring_settings_select"
  on public.lead_scoring_settings for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "lead_scoring_settings_write" on public.lead_scoring_settings;
create policy "lead_scoring_settings_write"
  on public.lead_scoring_settings for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Latest scoring profile per lead (company optional companion rows later)
-- ---------------------------------------------------------------------------

create table if not exists public.lead_scoring_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  entity_type text not null default 'lead'
    check (entity_type in ('lead', 'company', 'contact')),
  lead_id uuid references public.crm_leads (id) on delete cascade,
  company_id uuid references public.companies (id) on delete cascade,
  contact_id uuid references public.crm_lead_contacts (id) on delete cascade,
  overall_score numeric(5,2) not null default 0,
  classification text not null default 'unknown'
    check (
      classification in (
        'very_hot',
        'hot',
        'warm',
        'cold',
        'very_cold',
        'unknown'
      )
    ),
  opportunity_band text not null default 'unknown'
    check (
      opportunity_band in (
        'very_high',
        'high',
        'medium',
        'low',
        'very_low',
        'unknown'
      )
    ),
  opportunity_confidence numeric(5,2) not null default 0,
  risk_score numeric(5,2) not null default 0,
  buying_readiness text not null default 'unknown'
    check (
      buying_readiness in (
        'ready_now',
        'ready_soon',
        'researching',
        'unknown',
        'long_term'
      )
    ),
  confidence numeric(5,2) not null default 0,
  category_scores_json jsonb not null default '{}'::jsonb,
  sub_scores_json jsonb not null default '{}'::jsonb,
  explanations_json jsonb not null default '[]'::jsonb,
  risks_json jsonb not null default '[]'::jsonb,
  next_best_actions_json jsonb not null default '[]'::jsonb,
  signals_json jsonb not null default '{}'::jsonb,
  weights_snapshot_json jsonb not null default '{}'::jsonb,
  provider text,
  model text,
  source text not null default 'manual'
    check (source in ('manual', 'enrichment', 'scheduled', 'api', 'campaign', 'crm')),
  actor_user_id uuid,
  scored_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint lead_scoring_profiles_entity_chk check (
    (entity_type = 'lead' and lead_id is not null)
    or (entity_type = 'company' and company_id is not null)
    or (entity_type = 'contact' and contact_id is not null)
  )
);

create unique index if not exists lead_scoring_profiles_lead_uidx
  on public.lead_scoring_profiles (lead_id)
  where entity_type = 'lead' and lead_id is not null;

create unique index if not exists lead_scoring_profiles_company_uidx
  on public.lead_scoring_profiles (company_id)
  where entity_type = 'company' and company_id is not null;

create unique index if not exists lead_scoring_profiles_contact_uidx
  on public.lead_scoring_profiles (contact_id)
  where entity_type = 'contact' and contact_id is not null;

create index if not exists lead_scoring_profiles_org_score_idx
  on public.lead_scoring_profiles (organization_id, overall_score desc);

create index if not exists lead_scoring_profiles_org_entity_idx
  on public.lead_scoring_profiles (organization_id, entity_type, scored_at desc);

drop trigger if exists lead_scoring_profiles_set_updated_at
  on public.lead_scoring_profiles;
create trigger lead_scoring_profiles_set_updated_at
before update on public.lead_scoring_profiles
for each row execute function public.set_updated_at();

alter table public.lead_scoring_profiles enable row level security;

drop policy if exists "lead_scoring_profiles_select" on public.lead_scoring_profiles;
create policy "lead_scoring_profiles_select"
  on public.lead_scoring_profiles for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "lead_scoring_profiles_write" on public.lead_scoring_profiles;
create policy "lead_scoring_profiles_write"
  on public.lead_scoring_profiles for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Score history timeline
-- ---------------------------------------------------------------------------

create table if not exists public.lead_scoring_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  profile_id uuid references public.lead_scoring_profiles (id) on delete set null,
  entity_type text not null default 'lead',
  lead_id uuid references public.crm_leads (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  contact_id uuid references public.crm_lead_contacts (id) on delete set null,
  old_score numeric(5,2),
  new_score numeric(5,2) not null,
  delta numeric(5,2),
  old_classification text,
  new_classification text,
  reason text not null default 'recalculated',
  explanations_json jsonb not null default '[]'::jsonb,
  source text not null default 'manual',
  actor_user_id uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists lead_scoring_history_lead_idx
  on public.lead_scoring_history (organization_id, lead_id, created_at desc);

create index if not exists lead_scoring_history_org_idx
  on public.lead_scoring_history (organization_id, created_at desc);

alter table public.lead_scoring_history enable row level security;

drop policy if exists "lead_scoring_history_select" on public.lead_scoring_history;
create policy "lead_scoring_history_select"
  on public.lead_scoring_history for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "lead_scoring_history_write" on public.lead_scoring_history;
create policy "lead_scoring_history_write"
  on public.lead_scoring_history for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Scoring alerts (automation-ready)
-- ---------------------------------------------------------------------------

create table if not exists public.lead_scoring_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  lead_id uuid references public.crm_leads (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  alert_type text not null
    check (
      alert_type in (
        'became_hot',
        'score_increased',
        'score_decreased',
        'opportunity_increased',
        'risk_increased',
        'decision_maker_found',
        'needs_attention',
        'custom'
      )
    ),
  severity text not null default 'info'
    check (severity in ('info', 'warning', 'critical')),
  title text not null,
  message text not null,
  payload_json jsonb not null default '{}'::jsonb,
  acknowledged_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists lead_scoring_alerts_org_open_idx
  on public.lead_scoring_alerts (organization_id, created_at desc)
  where acknowledged_at is null;

alter table public.lead_scoring_alerts enable row level security;

drop policy if exists "lead_scoring_alerts_select" on public.lead_scoring_alerts;
create policy "lead_scoring_alerts_select"
  on public.lead_scoring_alerts for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "lead_scoring_alerts_write" on public.lead_scoring_alerts;
create policy "lead_scoring_alerts_write"
  on public.lead_scoring_alerts for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

comment on table public.lead_scoring_profiles is
  'Phase 25E — explainable AI lead score profiles (weighted categories + sub-scores).';
comment on table public.lead_scoring_history is
  'Phase 25E — score change timeline.';
comment on table public.lead_scoring_alerts is
  'Phase 25E — scoring alerts; workers can also poll crm_automation_events.';
comment on column public.crm_leads.ai_lead_score is
  'Phase 25E — denormalized overall AI lead score (0–100).';
