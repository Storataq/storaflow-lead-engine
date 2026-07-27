-- Storaflow — AI Marketing Agent (Phase 27D)
-- Additive only. Run manually AFTER 20260726000044_ai_sales_agent.sql
-- Do NOT auto-execute from the app.
-- Do NOT modify migrations 00001–00044.
-- Multi-tenant marketing: campaigns, segments, content, A/B, automation, analytics.
-- Idempotent.

-- ---------------------------------------------------------------------------
-- Organization settings
-- ---------------------------------------------------------------------------

create table if not exists public.marketing_agent_org_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  enabled boolean not null default true,
  approval_mode text not null default 'semi_autonomous'
    check (approval_mode in (
      'read_only', 'suggest', 'approval_required', 'semi_autonomous', 'fully_autonomous'
    )),
  provider text not null default 'openai',
  model text not null default 'gpt-4.1-mini',
  brand_voice text not null default 'professional',
  tone_of_voice text not null default 'helpful',
  email_daily_limit integer not null default 500 check (email_daily_limit > 0),
  content_policies_json jsonb not null default '{}'::jsonb,
  notification_rules_json jsonb not null default '{}'::jsonb,
  rate_limit_per_minute integer not null default 40 check (rate_limit_per_minute > 0),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists marketing_agent_org_settings_set_updated_at on public.marketing_agent_org_settings;
create trigger marketing_agent_org_settings_set_updated_at
before update on public.marketing_agent_org_settings
for each row execute function public.set_updated_at();

alter table public.marketing_agent_org_settings enable row level security;

drop policy if exists "marketing_agent_settings_select" on public.marketing_agent_org_settings;
create policy "marketing_agent_settings_select"
  on public.marketing_agent_org_settings for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "marketing_agent_settings_write" on public.marketing_agent_org_settings;
create policy "marketing_agent_settings_write"
  on public.marketing_agent_org_settings for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Campaigns (AI marketing plans; optional link to email_campaigns)
-- ---------------------------------------------------------------------------

create table if not exists public.marketing_agent_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email_campaign_id uuid,
  name text not null,
  campaign_type text not null default 'lead_nurturing'
    check (campaign_type in (
      'product_launch', 'lead_nurturing', 'cold_outreach', 're_engagement',
      'newsletter', 'event', 'promotion', 'upsell', 'cross_sell', 'renewal', 'custom'
    )),
  objective text not null default '',
  status text not null default 'draft'
    check (status in (
      'draft', 'ready', 'scheduled', 'active', 'paused', 'completed', 'archived'
    )),
  channel text not null default 'email'
    check (channel in (
      'email', 'social', 'landing', 'multi', 'blog', 'ads'
    )),
  audience_summary text not null default '',
  plan_json jsonb not null default '{}'::jsonb,
  emails_json jsonb not null default '[]'::jsonb,
  ctas_json jsonb not null default '[]'::jsonb,
  success_criteria_json jsonb not null default '[]'::jsonb,
  schedule_json jsonb not null default '{}'::jsonb,
  ai_score integer not null default 0 check (ai_score between 0 and 100),
  performance_json jsonb not null default '{}'::jsonb,
  owner_user_id uuid,
  provider text,
  model text,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists marketing_agent_campaigns_org_idx
  on public.marketing_agent_campaigns (organization_id, created_at desc);
create index if not exists marketing_agent_campaigns_status_idx
  on public.marketing_agent_campaigns (organization_id, status, ai_score desc);

drop trigger if exists marketing_agent_campaigns_set_updated_at on public.marketing_agent_campaigns;
create trigger marketing_agent_campaigns_set_updated_at
before update on public.marketing_agent_campaigns
for each row execute function public.set_updated_at();

alter table public.marketing_agent_campaigns enable row level security;

drop policy if exists "marketing_agent_campaigns_select" on public.marketing_agent_campaigns;
create policy "marketing_agent_campaigns_select"
  on public.marketing_agent_campaigns for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "marketing_agent_campaigns_write" on public.marketing_agent_campaigns;
create policy "marketing_agent_campaigns_write"
  on public.marketing_agent_campaigns for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Segments
-- ---------------------------------------------------------------------------

create table if not exists public.marketing_agent_segments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  segment_code text not null
    check (segment_code in (
      'new_leads', 'warm_leads', 'hot_prospects', 'inactive_customers',
      'enterprise', 'vip', 'high_revenue_potential', 'low_activity',
      'new_customers', 'loyal_customers', 'custom'
    )),
  description text not null default '',
  filter_json jsonb not null default '{}'::jsonb,
  estimated_size integer not null default 0,
  ai_score integer not null default 0 check (ai_score between 0 and 100),
  status text not null default 'active'
    check (status in ('draft', 'active', 'archived')),
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, segment_code, name)
);

create index if not exists marketing_agent_segments_org_idx
  on public.marketing_agent_segments (organization_id, status, ai_score desc);

drop trigger if exists marketing_agent_segments_set_updated_at on public.marketing_agent_segments;
create trigger marketing_agent_segments_set_updated_at
before update on public.marketing_agent_segments
for each row execute function public.set_updated_at();

alter table public.marketing_agent_segments enable row level security;

drop policy if exists "marketing_agent_segments_select" on public.marketing_agent_segments;
create policy "marketing_agent_segments_select"
  on public.marketing_agent_segments for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "marketing_agent_segments_write" on public.marketing_agent_segments;
create policy "marketing_agent_segments_write"
  on public.marketing_agent_segments for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Content library / generated content
-- ---------------------------------------------------------------------------

create table if not exists public.marketing_agent_content_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  campaign_id uuid references public.marketing_agent_campaigns (id) on delete set null,
  content_type text not null
    check (content_type in (
      'email', 'social', 'blog', 'news', 'case_study', 'product_update',
      'faq', 'guide', 'whitepaper', 'landing', 'ad', 'seo', 'newsletter', 'cta', 'prompt'
    )),
  channel text
    check (channel is null or channel in (
      'linkedin', 'facebook', 'instagram', 'x', 'threads', 'tiktok',
      'youtube', 'blog', 'newsletter', 'email', 'ads', 'web'
    )),
  title text not null default '',
  subject text,
  preview_text text,
  body_text text not null default '',
  cta_text text,
  variants_json jsonb not null default '[]'::jsonb,
  personalization_json jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'published', 'archived')),
  ai_score integer not null default 0 check (ai_score between 0 and 100),
  provider text,
  model text,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists marketing_agent_content_org_idx
  on public.marketing_agent_content_items (organization_id, content_type, created_at desc);

drop trigger if exists marketing_agent_content_set_updated_at on public.marketing_agent_content_items;
create trigger marketing_agent_content_set_updated_at
before update on public.marketing_agent_content_items
for each row execute function public.set_updated_at();

alter table public.marketing_agent_content_items enable row level security;

drop policy if exists "marketing_agent_content_select" on public.marketing_agent_content_items;
create policy "marketing_agent_content_select"
  on public.marketing_agent_content_items for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "marketing_agent_content_write" on public.marketing_agent_content_items;
create policy "marketing_agent_content_write"
  on public.marketing_agent_content_items for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Landing page analyses
-- ---------------------------------------------------------------------------

create table if not exists public.marketing_agent_landing_analyses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  url text not null,
  title text not null default '',
  conversion_score integer not null default 0 check (conversion_score between 0 and 100),
  readability_score integer not null default 0 check (readability_score between 0 and 100),
  seo_score integer not null default 0 check (seo_score between 0 and 100),
  structure_score integer not null default 0 check (structure_score between 0 and 100),
  content_quality_score integer not null default 0 check (content_quality_score between 0 and 100),
  overall_score integer not null default 0 check (overall_score between 0 and 100),
  analysis_json jsonb not null default '{}'::jsonb,
  improvements_json jsonb not null default '[]'::jsonb,
  provider text,
  model text,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists marketing_agent_landing_org_idx
  on public.marketing_agent_landing_analyses (organization_id, created_at desc);

alter table public.marketing_agent_landing_analyses enable row level security;

drop policy if exists "marketing_agent_landing_select" on public.marketing_agent_landing_analyses;
create policy "marketing_agent_landing_select"
  on public.marketing_agent_landing_analyses for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "marketing_agent_landing_write" on public.marketing_agent_landing_analyses;
create policy "marketing_agent_landing_write"
  on public.marketing_agent_landing_analyses for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- A/B tests
-- ---------------------------------------------------------------------------

create table if not exists public.marketing_agent_ab_tests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  campaign_id uuid references public.marketing_agent_campaigns (id) on delete set null,
  name text not null,
  test_type text not null default 'subject'
    check (test_type in (
      'subject', 'cta', 'image', 'copy', 'button', 'color', 'landing', 'timing'
    )),
  status text not null default 'draft'
    check (status in ('draft', 'running', 'completed', 'cancelled')),
  variants_json jsonb not null default '[]'::jsonb,
  metric_primary text not null default 'click_rate',
  winner_variant_id text,
  confidence numeric(5,2) not null default 0
    check (confidence >= 0 and confidence <= 1),
  results_json jsonb not null default '{}'::jsonb,
  created_by uuid,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists marketing_agent_ab_org_idx
  on public.marketing_agent_ab_tests (organization_id, status, created_at desc);

drop trigger if exists marketing_agent_ab_set_updated_at on public.marketing_agent_ab_tests;
create trigger marketing_agent_ab_set_updated_at
before update on public.marketing_agent_ab_tests
for each row execute function public.set_updated_at();

alter table public.marketing_agent_ab_tests enable row level security;

drop policy if exists "marketing_agent_ab_select" on public.marketing_agent_ab_tests;
create policy "marketing_agent_ab_select"
  on public.marketing_agent_ab_tests for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "marketing_agent_ab_write" on public.marketing_agent_ab_tests;
create policy "marketing_agent_ab_write"
  on public.marketing_agent_ab_tests for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Automations / nurture workflows
-- ---------------------------------------------------------------------------

create table if not exists public.marketing_agent_automations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  trigger_type text not null default 'new_lead'
    check (trigger_type in (
      'new_lead', 'stage_change', 'inactivity', 'form_submit',
      'deal_won', 'manual', 'segment_enter'
    )),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'archived')),
  workflow_json jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  nurture_rules_json jsonb not null default '{}'::jsonb,
  handoff_to_sales boolean not null default true,
  ai_score integer not null default 0 check (ai_score between 0 and 100),
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists marketing_agent_automations_org_idx
  on public.marketing_agent_automations (organization_id, status, created_at desc);

drop trigger if exists marketing_agent_automations_set_updated_at on public.marketing_agent_automations;
create trigger marketing_agent_automations_set_updated_at
before update on public.marketing_agent_automations
for each row execute function public.set_updated_at();

alter table public.marketing_agent_automations enable row level security;

drop policy if exists "marketing_agent_automations_select" on public.marketing_agent_automations;
create policy "marketing_agent_automations_select"
  on public.marketing_agent_automations for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "marketing_agent_automations_write" on public.marketing_agent_automations;
create policy "marketing_agent_automations_write"
  on public.marketing_agent_automations for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Recommendations + analytics snapshots
-- ---------------------------------------------------------------------------

create table if not exists public.marketing_agent_recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  campaign_id uuid references public.marketing_agent_campaigns (id) on delete set null,
  recommendation_type text not null
    check (recommendation_type in (
      'send_time', 'audience', 'subject', 'cta', 'channel',
      'frequency', 'campaign', 'optimization'
    )),
  title text not null,
  rationale text not null default '',
  priority integer not null default 50 check (priority between 0 and 100),
  status text not null default 'open'
    check (status in ('open', 'accepted', 'dismissed', 'applied')),
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists marketing_agent_recs_org_idx
  on public.marketing_agent_recommendations (organization_id, status, priority desc);

alter table public.marketing_agent_recommendations enable row level security;

drop policy if exists "marketing_agent_recs_select" on public.marketing_agent_recommendations;
create policy "marketing_agent_recs_select"
  on public.marketing_agent_recommendations for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "marketing_agent_recs_write" on public.marketing_agent_recommendations;
create policy "marketing_agent_recs_write"
  on public.marketing_agent_recommendations for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create table if not exists public.marketing_agent_analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  period_key text not null,
  open_rate numeric(8,4) not null default 0,
  click_rate numeric(8,4) not null default 0,
  bounce_rate numeric(8,4) not null default 0,
  conversion_rate numeric(8,4) not null default 0,
  roi numeric(12,4) not null default 0,
  campaign_score integer not null default 0 check (campaign_score between 0 and 100),
  engagement_score integer not null default 0 check (engagement_score between 0 and 100),
  lead_growth integer not null default 0,
  pipeline_impact numeric(14,2) not null default 0,
  revenue_impact numeric(14,2) not null default 0,
  metrics_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists marketing_agent_analytics_org_idx
  on public.marketing_agent_analytics_snapshots (organization_id, created_at desc);

alter table public.marketing_agent_analytics_snapshots enable row level security;

drop policy if exists "marketing_agent_analytics_select" on public.marketing_agent_analytics_snapshots;
create policy "marketing_agent_analytics_select"
  on public.marketing_agent_analytics_snapshots for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "marketing_agent_analytics_write" on public.marketing_agent_analytics_snapshots;
create policy "marketing_agent_analytics_write"
  on public.marketing_agent_analytics_snapshots for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- History + bulk jobs
-- ---------------------------------------------------------------------------

create table if not exists public.marketing_agent_history_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  campaign_id uuid,
  event_type text not null,
  actor_user_id uuid,
  summary text not null default '',
  payload_json jsonb not null default '{}'::jsonb,
  provider text,
  model text,
  cost_usd numeric(12,6) not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists marketing_agent_history_org_idx
  on public.marketing_agent_history_events (organization_id, created_at desc);

alter table public.marketing_agent_history_events enable row level security;

drop policy if exists "marketing_agent_history_select" on public.marketing_agent_history_events;
create policy "marketing_agent_history_select"
  on public.marketing_agent_history_events for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "marketing_agent_history_insert" on public.marketing_agent_history_events;
create policy "marketing_agent_history_insert"
  on public.marketing_agent_history_events for insert
  to authenticated with check (public.is_org_member(organization_id));

create table if not exists public.marketing_agent_bulk_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  job_type text not null
    check (job_type in (
      'email', 'analyze', 'segment', 'publish', 'campaigns', 'optimize'
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

drop trigger if exists marketing_agent_bulk_set_updated_at on public.marketing_agent_bulk_jobs;
create trigger marketing_agent_bulk_set_updated_at
before update on public.marketing_agent_bulk_jobs
for each row execute function public.set_updated_at();

alter table public.marketing_agent_bulk_jobs enable row level security;

drop policy if exists "marketing_agent_bulk_select" on public.marketing_agent_bulk_jobs;
create policy "marketing_agent_bulk_select"
  on public.marketing_agent_bulk_jobs for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "marketing_agent_bulk_write" on public.marketing_agent_bulk_jobs;
create policy "marketing_agent_bulk_write"
  on public.marketing_agent_bulk_jobs for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
