-- Storaflow — AI Revenue Intelligence Agent (Phase 27G)
-- Additive only. Run manually AFTER 20260726000046_ai_customer_success_agent.sql
-- Do NOT auto-execute from the app.
-- Do NOT modify migrations 00001–00046.
-- Multi-tenant revenue: KPIs, forecast, pipeline, growth, churn, scenarios, reports.
-- Idempotent.

create table if not exists public.revenue_intel_org_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  enabled boolean not null default true,
  approval_mode text not null default 'semi_autonomous'
    check (approval_mode in (
      'read_only', 'suggest', 'approval_required', 'semi_autonomous', 'fully_autonomous'
    )),
  provider text not null default 'openai',
  model text not null default 'gpt-4.1-mini',
  forecast_horizon_months integer not null default 12
    check (forecast_horizon_months between 1 and 60),
  kpi_config_json jsonb not null default '{}'::jsonb,
  notification_rules_json jsonb not null default '{}'::jsonb,
  report_schedule_json jsonb not null default '{}'::jsonb,
  rate_limit_per_minute integer not null default 40 check (rate_limit_per_minute > 0),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists revenue_intel_org_settings_set_updated_at on public.revenue_intel_org_settings;
create trigger revenue_intel_org_settings_set_updated_at
before update on public.revenue_intel_org_settings
for each row execute function public.set_updated_at();

alter table public.revenue_intel_org_settings enable row level security;

drop policy if exists "revenue_intel_settings_select" on public.revenue_intel_org_settings;
create policy "revenue_intel_settings_select"
  on public.revenue_intel_org_settings for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "revenue_intel_settings_write" on public.revenue_intel_org_settings;
create policy "revenue_intel_settings_write"
  on public.revenue_intel_org_settings for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

create table if not exists public.revenue_intel_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  period_key text not null,
  period_type text not null default 'month'
    check (period_type in ('week', 'month', 'quarter', 'year')),
  mrr numeric(14,2) not null default 0,
  arr numeric(14,2) not null default 0,
  acv numeric(14,2) not null default 0,
  arpa numeric(14,2) not null default 0,
  ltv numeric(14,2) not null default 0,
  cac numeric(14,2) not null default 0,
  ltv_cac numeric(8,4) not null default 0,
  gross_revenue numeric(14,2) not null default 0,
  net_revenue numeric(14,2) not null default 0,
  expansion_revenue numeric(14,2) not null default 0,
  contraction_revenue numeric(14,2) not null default 0,
  retention_rate numeric(8,4) not null default 0,
  nrr numeric(8,4) not null default 0,
  grr numeric(8,4) not null default 0,
  margin_rate numeric(8,4) not null default 0,
  profit numeric(14,2) not null default 0,
  avg_deal_value numeric(14,2) not null default 0,
  avg_order_value numeric(14,2) not null default 0,
  growth_rate numeric(8,4) not null default 0,
  customer_count integer not null default 0,
  metrics_json jsonb not null default '{}'::jsonb,
  filters_json jsonb not null default '{}'::jsonb,
  ai_confidence numeric(5,2) not null default 0
    check (ai_confidence >= 0 and ai_confidence <= 1),
  provider text,
  model text,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists revenue_intel_snapshots_org_idx
  on public.revenue_intel_snapshots (organization_id, created_at desc);

alter table public.revenue_intel_snapshots enable row level security;

drop policy if exists "revenue_intel_snapshots_select" on public.revenue_intel_snapshots;
create policy "revenue_intel_snapshots_select"
  on public.revenue_intel_snapshots for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "revenue_intel_snapshots_write" on public.revenue_intel_snapshots;
create policy "revenue_intel_snapshots_write"
  on public.revenue_intel_snapshots for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create table if not exists public.revenue_intel_forecasts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  horizon text not null
    check (horizon in ('week', 'month', 'quarter', 'year', 'three_year', 'five_year')),
  forecast_revenue numeric(14,2) not null default 0,
  pipeline_open numeric(14,2) not null default 0,
  pipeline_weighted numeric(14,2) not null default 0,
  likely_revenue numeric(14,2) not null default 0,
  risk_revenue numeric(14,2) not null default 0,
  missed_revenue numeric(14,2) not null default 0,
  expected_closings integer not null default 0,
  confidence numeric(5,2) not null default 0
    check (confidence >= 0 and confidence <= 1),
  breakdown_json jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists revenue_intel_forecasts_org_idx
  on public.revenue_intel_forecasts (organization_id, created_at desc);

alter table public.revenue_intel_forecasts enable row level security;

drop policy if exists "revenue_intel_forecasts_select" on public.revenue_intel_forecasts;
create policy "revenue_intel_forecasts_select"
  on public.revenue_intel_forecasts for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "revenue_intel_forecasts_write" on public.revenue_intel_forecasts;
create policy "revenue_intel_forecasts_write"
  on public.revenue_intel_forecasts for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create table if not exists public.revenue_intel_scenarios (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  scenario_type text not null
    check (scenario_type in (
      'more_customers', 'less_churn', 'price_increase', 'extra_sales_hire',
      'new_market', 'new_product', 'new_ai_agent', 'custom'
    )),
  assumptions_json jsonb not null default '{}'::jsonb,
  impact_json jsonb not null default '{}'::jsonb,
  delta_mrr numeric(14,2) not null default 0,
  delta_arr numeric(14,2) not null default 0,
  delta_profit numeric(14,2) not null default 0,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists revenue_intel_scenarios_org_idx
  on public.revenue_intel_scenarios (organization_id, created_at desc);

alter table public.revenue_intel_scenarios enable row level security;

drop policy if exists "revenue_intel_scenarios_select" on public.revenue_intel_scenarios;
create policy "revenue_intel_scenarios_select"
  on public.revenue_intel_scenarios for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "revenue_intel_scenarios_write" on public.revenue_intel_scenarios;
create policy "revenue_intel_scenarios_write"
  on public.revenue_intel_scenarios for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create table if not exists public.revenue_intel_insights (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  insight_type text not null
    check (insight_type in (
      'mrr_growth', 'pipeline_trend', 'segment_growth', 'arr_change',
      'upsell_potential', 'churn_risk', 'margin', 'opportunity', 'executive'
    )),
  title text not null,
  body text not null default '',
  severity text not null default 'info'
    check (severity in ('info', 'positive', 'warning', 'critical')),
  priority integer not null default 50 check (priority between 0 and 100),
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists revenue_intel_insights_org_idx
  on public.revenue_intel_insights (organization_id, priority desc, created_at desc);

alter table public.revenue_intel_insights enable row level security;

drop policy if exists "revenue_intel_insights_select" on public.revenue_intel_insights;
create policy "revenue_intel_insights_select"
  on public.revenue_intel_insights for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "revenue_intel_insights_write" on public.revenue_intel_insights;
create policy "revenue_intel_insights_write"
  on public.revenue_intel_insights for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create table if not exists public.revenue_intel_recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  recommendation_type text not null
    check (recommendation_type in (
      'invest_more', 'more_sales', 'more_marketing', 'pricing',
      'new_audience', 'new_region', 'new_campaign', 'new_ai_workflow',
      'reduce_churn', 'expand_enterprise', 'focus_segment'
    )),
  title text not null,
  rationale text not null default '',
  priority integer not null default 50 check (priority between 0 and 100),
  status text not null default 'open'
    check (status in ('open', 'accepted', 'dismissed', 'applied')),
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists revenue_intel_recs_org_idx
  on public.revenue_intel_recommendations (organization_id, status, priority desc);

alter table public.revenue_intel_recommendations enable row level security;

drop policy if exists "revenue_intel_recs_select" on public.revenue_intel_recommendations;
create policy "revenue_intel_recs_select"
  on public.revenue_intel_recommendations for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "revenue_intel_recs_write" on public.revenue_intel_recommendations;
create policy "revenue_intel_recs_write"
  on public.revenue_intel_recommendations for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create table if not exists public.revenue_intel_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  alert_type text not null
    check (alert_type in (
      'revenue_down', 'mrr_down', 'pipeline_risk', 'forecast_deviation',
      'high_churn', 'low_conversion', 'negative_trend'
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

create index if not exists revenue_intel_alerts_org_idx
  on public.revenue_intel_alerts (organization_id, status, severity, created_at desc);

alter table public.revenue_intel_alerts enable row level security;

drop policy if exists "revenue_intel_alerts_select" on public.revenue_intel_alerts;
create policy "revenue_intel_alerts_select"
  on public.revenue_intel_alerts for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "revenue_intel_alerts_write" on public.revenue_intel_alerts;
create policy "revenue_intel_alerts_write"
  on public.revenue_intel_alerts for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create table if not exists public.revenue_intel_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  report_type text not null
    check (report_type in (
      'ceo', 'board', 'investor', 'finance', 'growth', 'forecast'
    )),
  title text not null,
  format text not null default 'markdown'
    check (format in ('markdown', 'pdf_ready', 'excel_ready', 'pptx_ready')),
  body_markdown text not null default '',
  sections_json jsonb not null default '[]'::jsonb,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists revenue_intel_reports_org_idx
  on public.revenue_intel_reports (organization_id, created_at desc);

alter table public.revenue_intel_reports enable row level security;

drop policy if exists "revenue_intel_reports_select" on public.revenue_intel_reports;
create policy "revenue_intel_reports_select"
  on public.revenue_intel_reports for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "revenue_intel_reports_write" on public.revenue_intel_reports;
create policy "revenue_intel_reports_write"
  on public.revenue_intel_reports for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create table if not exists public.revenue_intel_history_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  event_type text not null,
  actor_user_id uuid,
  summary text not null default '',
  payload_json jsonb not null default '{}'::jsonb,
  provider text,
  model text,
  cost_usd numeric(12,6) not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists revenue_intel_history_org_idx
  on public.revenue_intel_history_events (organization_id, created_at desc);

alter table public.revenue_intel_history_events enable row level security;

drop policy if exists "revenue_intel_history_select" on public.revenue_intel_history_events;
create policy "revenue_intel_history_select"
  on public.revenue_intel_history_events for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "revenue_intel_history_insert" on public.revenue_intel_history_events;
create policy "revenue_intel_history_insert"
  on public.revenue_intel_history_events for insert
  to authenticated with check (public.is_org_member(organization_id));

create table if not exists public.revenue_intel_bulk_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  job_type text not null
    check (job_type in ('analyze', 'forecast', 'reports', 'kpi_export', 'scenarios')),
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

drop trigger if exists revenue_intel_bulk_set_updated_at on public.revenue_intel_bulk_jobs;
create trigger revenue_intel_bulk_set_updated_at
before update on public.revenue_intel_bulk_jobs
for each row execute function public.set_updated_at();

alter table public.revenue_intel_bulk_jobs enable row level security;

drop policy if exists "revenue_intel_bulk_select" on public.revenue_intel_bulk_jobs;
create policy "revenue_intel_bulk_select"
  on public.revenue_intel_bulk_jobs for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "revenue_intel_bulk_write" on public.revenue_intel_bulk_jobs;
create policy "revenue_intel_bulk_write"
  on public.revenue_intel_bulk_jobs for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
