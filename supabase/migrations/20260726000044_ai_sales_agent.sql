-- Storaflow — AI Sales Agent (Phase 27C)
-- Additive only. Run manually AFTER 20260726000043_ai_prospecting_agent.sql
-- Do NOT auto-execute from the app.
-- Do NOT modify migrations 00001–00043.
-- Multi-tenant sales coaching: priorities, deal insights, forecast, meetings, emails.
-- Idempotent.

-- ---------------------------------------------------------------------------
-- Organization settings
-- ---------------------------------------------------------------------------

create table if not exists public.sales_agent_org_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  enabled boolean not null default true,
  approval_mode text not null default 'semi_autonomous'
    check (approval_mode in (
      'read_only', 'suggest', 'approval_required', 'semi_autonomous', 'fully_autonomous'
    )),
  provider text not null default 'openai',
  model text not null default 'gpt-4.1-mini',
  forecast_sensitivity numeric(5,2) not null default 0.55
    check (forecast_sensitivity >= 0 and forecast_sensitivity <= 1),
  risk_threshold integer not null default 60 check (risk_threshold between 0 and 100),
  reminder_frequency_hours integer not null default 24 check (reminder_frequency_hours > 0),
  working_hours_start integer not null default 9 check (working_hours_start between 0 and 23),
  working_hours_end integer not null default 18 check (working_hours_end between 1 and 24),
  timezone text not null default 'Europe/Amsterdam',
  notification_rules_json jsonb not null default '{}'::jsonb,
  rate_limit_per_minute integer not null default 40 check (rate_limit_per_minute > 0),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists sales_agent_org_settings_set_updated_at on public.sales_agent_org_settings;
create trigger sales_agent_org_settings_set_updated_at
before update on public.sales_agent_org_settings
for each row execute function public.set_updated_at();

alter table public.sales_agent_org_settings enable row level security;

drop policy if exists "sales_agent_settings_select" on public.sales_agent_org_settings;
create policy "sales_agent_settings_select"
  on public.sales_agent_org_settings for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "sales_agent_settings_write" on public.sales_agent_org_settings;
create policy "sales_agent_settings_write"
  on public.sales_agent_org_settings for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Deal insights (analysis cache)
-- ---------------------------------------------------------------------------

create table if not exists public.sales_agent_deal_insights (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  deal_id uuid not null references public.crm_deals (id) on delete cascade,
  priority_score integer not null default 0 check (priority_score between 0 and 100),
  closing_probability numeric(5,2) not null default 0
    check (closing_probability >= 0 and closing_probability <= 1),
  expected_revenue numeric(14,2) not null default 0,
  risk_level text not null default 'low'
    check (risk_level in ('low', 'medium', 'high', 'critical')),
  risk_score integer not null default 0 check (risk_score between 0 and 100),
  predicted_close_date date,
  next_best_action text not null default 'wait'
    check (next_best_action in (
      'call', 'plan_demo', 'send_quote', 'send_reminder', 'book_meeting',
      'ask_feedback', 'escalate', 'wait', 'send_email', 'follow_up'
    )),
  obstacles_json jsonb not null default '[]'::jsonb,
  missed_activities_json jsonb not null default '[]'::jsonb,
  coach_tips_json jsonb not null default '[]'::jsonb,
  opportunities_json jsonb not null default '[]'::jsonb,
  analysis_json jsonb not null default '{}'::jsonb,
  ai_confidence numeric(5,2) not null default 0
    check (ai_confidence >= 0 and ai_confidence <= 1),
  provider text,
  model text,
  analyzed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, deal_id)
);

create index if not exists sales_agent_deal_insights_priority_idx
  on public.sales_agent_deal_insights (organization_id, priority_score desc);

create index if not exists sales_agent_deal_insights_risk_idx
  on public.sales_agent_deal_insights (organization_id, risk_level, risk_score desc);

drop trigger if exists sales_agent_deal_insights_set_updated_at on public.sales_agent_deal_insights;
create trigger sales_agent_deal_insights_set_updated_at
before update on public.sales_agent_deal_insights
for each row execute function public.set_updated_at();

alter table public.sales_agent_deal_insights enable row level security;

drop policy if exists "sales_agent_insights_select" on public.sales_agent_deal_insights;
create policy "sales_agent_insights_select"
  on public.sales_agent_deal_insights for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "sales_agent_insights_write" on public.sales_agent_deal_insights;
create policy "sales_agent_insights_write"
  on public.sales_agent_deal_insights for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Daily priorities / briefing
-- ---------------------------------------------------------------------------

create table if not exists public.sales_agent_daily_briefings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid,
  briefing_date date not null default (timezone('utc', now())::date),
  greeting text not null default '',
  summary_json jsonb not null default '{}'::jsonb,
  priorities_json jsonb not null default '[]'::jsonb,
  follow_ups_count integer not null default 0,
  high_risk_count integer not null default 0,
  new_opportunities_count integer not null default 0,
  waiting_reply_count integer not null default 0,
  expiring_quotes_count integer not null default 0,
  provider text,
  model text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, briefing_date)
);

create index if not exists sales_agent_briefings_org_idx
  on public.sales_agent_daily_briefings (organization_id, briefing_date desc);

alter table public.sales_agent_daily_briefings enable row level security;

drop policy if exists "sales_agent_briefings_select" on public.sales_agent_daily_briefings;
create policy "sales_agent_briefings_select"
  on public.sales_agent_daily_briefings for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "sales_agent_briefings_write" on public.sales_agent_daily_briefings;
create policy "sales_agent_briefings_write"
  on public.sales_agent_daily_briefings for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Forecast snapshots
-- ---------------------------------------------------------------------------

create table if not exists public.sales_agent_forecast_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  period_type text not null check (period_type in ('month', 'quarter', 'year')),
  period_key text not null,
  forecast_revenue numeric(14,2) not null default 0,
  pipeline_revenue numeric(14,2) not null default 0,
  weighted_revenue numeric(14,2) not null default 0,
  target_revenue numeric(14,2),
  target_hit_probability numeric(5,2)
    check (target_hit_probability is null or (target_hit_probability >= 0 and target_hit_probability <= 1)),
  confidence numeric(5,2) not null default 0
    check (confidence >= 0 and confidence <= 1),
  breakdown_json jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists sales_agent_forecast_org_idx
  on public.sales_agent_forecast_snapshots (organization_id, created_at desc);

alter table public.sales_agent_forecast_snapshots enable row level security;

drop policy if exists "sales_agent_forecast_select" on public.sales_agent_forecast_snapshots;
create policy "sales_agent_forecast_select"
  on public.sales_agent_forecast_snapshots for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "sales_agent_forecast_write" on public.sales_agent_forecast_snapshots;
create policy "sales_agent_forecast_write"
  on public.sales_agent_forecast_snapshots for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Meeting briefs / summaries
-- ---------------------------------------------------------------------------

create table if not exists public.sales_agent_meeting_briefs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  deal_id uuid references public.crm_deals (id) on delete set null,
  lead_id uuid,
  company_id uuid,
  title text not null,
  meeting_at timestamptz,
  brief_json jsonb not null default '{}'::jsonb,
  summary_json jsonb not null default '{}'::jsonb,
  status text not null default 'briefed'
    check (status in ('briefed', 'completed', 'cancelled')),
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists sales_agent_meeting_briefs_set_updated_at on public.sales_agent_meeting_briefs;
create trigger sales_agent_meeting_briefs_set_updated_at
before update on public.sales_agent_meeting_briefs
for each row execute function public.set_updated_at();

alter table public.sales_agent_meeting_briefs enable row level security;

drop policy if exists "sales_agent_meetings_select" on public.sales_agent_meeting_briefs;
create policy "sales_agent_meetings_select"
  on public.sales_agent_meeting_briefs for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "sales_agent_meetings_write" on public.sales_agent_meeting_briefs;
create policy "sales_agent_meetings_write"
  on public.sales_agent_meeting_briefs for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Email drafts
-- ---------------------------------------------------------------------------

create table if not exists public.sales_agent_email_drafts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  deal_id uuid references public.crm_deals (id) on delete set null,
  lead_id uuid,
  template_type text not null
    check (template_type in (
      'introduction', 'follow_up', 'thank_you', 'quote', 'reminder',
      'demo_invite', 'contract', 'rejection', 'upsell', 'cross_sell'
    )),
  subject text not null default '',
  body_text text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'sent', 'discarded')),
  provider text,
  model text,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists sales_agent_email_drafts_set_updated_at on public.sales_agent_email_drafts;
create trigger sales_agent_email_drafts_set_updated_at
before update on public.sales_agent_email_drafts
for each row execute function public.set_updated_at();

alter table public.sales_agent_email_drafts enable row level security;

drop policy if exists "sales_agent_emails_select" on public.sales_agent_email_drafts;
create policy "sales_agent_emails_select"
  on public.sales_agent_email_drafts for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "sales_agent_emails_write" on public.sales_agent_email_drafts;
create policy "sales_agent_emails_write"
  on public.sales_agent_email_drafts for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- History + bulk jobs
-- ---------------------------------------------------------------------------

create table if not exists public.sales_agent_history_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  deal_id uuid,
  event_type text not null,
  actor_user_id uuid,
  summary text not null default '',
  payload_json jsonb not null default '{}'::jsonb,
  provider text,
  model text,
  cost_usd numeric(12,6) not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists sales_agent_history_org_idx
  on public.sales_agent_history_events (organization_id, created_at desc);

alter table public.sales_agent_history_events enable row level security;

drop policy if exists "sales_agent_history_select" on public.sales_agent_history_events;
create policy "sales_agent_history_select"
  on public.sales_agent_history_events for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "sales_agent_history_insert" on public.sales_agent_history_events;
create policy "sales_agent_history_insert"
  on public.sales_agent_history_events for insert
  to authenticated with check (public.is_org_member(organization_id));

create table if not exists public.sales_agent_bulk_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  job_type text not null
    check (job_type in (
      'follow_up', 'email', 'tasks', 'stage_update', 'assign', 'analyze'
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

drop trigger if exists sales_agent_bulk_jobs_set_updated_at on public.sales_agent_bulk_jobs;
create trigger sales_agent_bulk_jobs_set_updated_at
before update on public.sales_agent_bulk_jobs
for each row execute function public.set_updated_at();

alter table public.sales_agent_bulk_jobs enable row level security;

drop policy if exists "sales_agent_bulk_select" on public.sales_agent_bulk_jobs;
create policy "sales_agent_bulk_select"
  on public.sales_agent_bulk_jobs for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "sales_agent_bulk_write" on public.sales_agent_bulk_jobs;
create policy "sales_agent_bulk_write"
  on public.sales_agent_bulk_jobs for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
