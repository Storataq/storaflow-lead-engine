-- Storaflow — AI Orchestrator & Multi-Agent Collaboration (Phase 27H)
-- Additive only. Run manually AFTER 20260726000047_ai_revenue_intelligence_agent.sql
-- Do NOT auto-execute from the app.
-- Do NOT modify migrations 00001–00047.
-- Central brain: goal planning, agent selection, parallel execution, merge, approvals.
-- Idempotent.

create table if not exists public.orchestrator_org_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  enabled boolean not null default true,
  approval_policy text not null default 'semi_autonomous'
    check (approval_policy in (
      'auto', 'manual', 'multi', 'workflow', 'critical',
      'read_only', 'suggest', 'approval_required', 'semi_autonomous', 'fully_autonomous'
    )),
  autonomy_level text not null default 'semi_autonomous'
    check (autonomy_level in (
      'read_only', 'suggest', 'approval_required', 'semi_autonomous', 'fully_autonomous'
    )),
  provider text not null default 'openai',
  model text not null default 'gpt-4.1-mini',
  provider_priority_json jsonb not null default '["openai","anthropic","google"]'::jsonb,
  default_agents_json jsonb not null default '[]'::jsonb,
  model_router_json jsonb not null default '{}'::jsonb,
  workflow_timeout_seconds integer not null default 900
    check (workflow_timeout_seconds between 30 and 86400),
  retry_limit integer not null default 3 check (retry_limit between 0 and 10),
  cost_limit_usd numeric(12,4) not null default 25
    check (cost_limit_usd >= 0),
  memory_policy_json jsonb not null default '{}'::jsonb,
  notification_rules_json jsonb not null default '{}'::jsonb,
  rate_limit_per_minute integer not null default 60 check (rate_limit_per_minute > 0),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists orchestrator_org_settings_set_updated_at on public.orchestrator_org_settings;
create trigger orchestrator_org_settings_set_updated_at
before update on public.orchestrator_org_settings
for each row execute function public.set_updated_at();

alter table public.orchestrator_org_settings enable row level security;

drop policy if exists "orchestrator_settings_select" on public.orchestrator_org_settings;
create policy "orchestrator_settings_select"
  on public.orchestrator_org_settings for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "orchestrator_settings_write" on public.orchestrator_org_settings;
create policy "orchestrator_settings_write"
  on public.orchestrator_org_settings for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

create table if not exists public.orchestrator_goals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  goal_text text not null,
  intent text not null default 'general',
  status text not null default 'planned'
    check (status in (
      'draft', 'planned', 'running', 'paused', 'awaiting_approval',
      'completed', 'failed', 'cancelled'
    )),
  priority integer not null default 50 check (priority between 0 and 100),
  filters_json jsonb not null default '{}'::jsonb,
  context_json jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists orchestrator_goals_set_updated_at on public.orchestrator_goals;
create trigger orchestrator_goals_set_updated_at
before update on public.orchestrator_goals
for each row execute function public.set_updated_at();

create index if not exists orchestrator_goals_org_idx
  on public.orchestrator_goals (organization_id, created_at desc);
create index if not exists orchestrator_goals_status_idx
  on public.orchestrator_goals (organization_id, status);

alter table public.orchestrator_goals enable row level security;

drop policy if exists "orchestrator_goals_select" on public.orchestrator_goals;
create policy "orchestrator_goals_select"
  on public.orchestrator_goals for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "orchestrator_goals_write" on public.orchestrator_goals;
create policy "orchestrator_goals_write"
  on public.orchestrator_goals for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create table if not exists public.orchestrator_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  goal_id uuid not null references public.orchestrator_goals (id) on delete cascade,
  version integer not null default 1,
  status text not null default 'ready'
    check (status in ('draft', 'ready', 'executing', 'completed', 'failed', 'cancelled')),
  steps_json jsonb not null default '[]'::jsonb,
  parallel_groups_json jsonb not null default '[]'::jsonb,
  dependencies_json jsonb not null default '{}'::jsonb,
  estimated_cost_usd numeric(12,4) not null default 0,
  estimated_duration_ms integer not null default 0,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists orchestrator_plans_set_updated_at on public.orchestrator_plans;
create trigger orchestrator_plans_set_updated_at
before update on public.orchestrator_plans
for each row execute function public.set_updated_at();

create index if not exists orchestrator_plans_org_idx
  on public.orchestrator_plans (organization_id, created_at desc);
create index if not exists orchestrator_plans_goal_idx
  on public.orchestrator_plans (goal_id);

alter table public.orchestrator_plans enable row level security;

drop policy if exists "orchestrator_plans_select" on public.orchestrator_plans;
create policy "orchestrator_plans_select"
  on public.orchestrator_plans for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "orchestrator_plans_write" on public.orchestrator_plans;
create policy "orchestrator_plans_write"
  on public.orchestrator_plans for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create table if not exists public.orchestrator_executions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  goal_id uuid not null references public.orchestrator_goals (id) on delete cascade,
  plan_id uuid not null references public.orchestrator_plans (id) on delete cascade,
  status text not null default 'queued'
    check (status in (
      'queued', 'running', 'paused', 'awaiting_approval',
      'completed', 'failed', 'cancelled', 'partial'
    )),
  progress_pct numeric(5,2) not null default 0
    check (progress_pct >= 0 and progress_pct <= 100),
  agents_json jsonb not null default '[]'::jsonb,
  result_json jsonb not null default '{}'::jsonb,
  merged_report text not null default '',
  executive_summary text not null default '',
  cost_usd numeric(12,4) not null default 0,
  tokens_used integer not null default 0,
  provider text,
  model text,
  latency_ms integer not null default 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists orchestrator_executions_set_updated_at on public.orchestrator_executions;
create trigger orchestrator_executions_set_updated_at
before update on public.orchestrator_executions
for each row execute function public.set_updated_at();

create index if not exists orchestrator_executions_org_idx
  on public.orchestrator_executions (organization_id, created_at desc);
create index if not exists orchestrator_executions_status_idx
  on public.orchestrator_executions (organization_id, status);

alter table public.orchestrator_executions enable row level security;

drop policy if exists "orchestrator_executions_select" on public.orchestrator_executions;
create policy "orchestrator_executions_select"
  on public.orchestrator_executions for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "orchestrator_executions_write" on public.orchestrator_executions;
create policy "orchestrator_executions_write"
  on public.orchestrator_executions for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create table if not exists public.orchestrator_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  execution_id uuid not null references public.orchestrator_executions (id) on delete cascade,
  plan_id uuid not null references public.orchestrator_plans (id) on delete cascade,
  step_key text not null,
  agent_slug text not null,
  title text not null,
  status text not null default 'queued'
    check (status in (
      'queued', 'running', 'waiting', 'completed', 'failed',
      'skipped', 'cancelled', 'retrying'
    )),
  priority integer not null default 50 check (priority between 0 and 100),
  depends_on_json jsonb not null default '[]'::jsonb,
  parallel_group integer,
  attempt integer not null default 0,
  max_attempts integer not null default 3,
  timeout_seconds integer not null default 300,
  input_json jsonb not null default '{}'::jsonb,
  output_json jsonb not null default '{}'::jsonb,
  error_message text,
  provider text,
  model text,
  cost_usd numeric(12,4) not null default 0,
  latency_ms integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists orchestrator_tasks_set_updated_at on public.orchestrator_tasks;
create trigger orchestrator_tasks_set_updated_at
before update on public.orchestrator_tasks
for each row execute function public.set_updated_at();

create index if not exists orchestrator_tasks_exec_idx
  on public.orchestrator_tasks (execution_id, created_at);
create index if not exists orchestrator_tasks_org_status_idx
  on public.orchestrator_tasks (organization_id, status);

alter table public.orchestrator_tasks enable row level security;

drop policy if exists "orchestrator_tasks_select" on public.orchestrator_tasks;
create policy "orchestrator_tasks_select"
  on public.orchestrator_tasks for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "orchestrator_tasks_write" on public.orchestrator_tasks;
create policy "orchestrator_tasks_write"
  on public.orchestrator_tasks for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create table if not exists public.orchestrator_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  execution_id uuid not null references public.orchestrator_executions (id) on delete cascade,
  task_id uuid references public.orchestrator_tasks (id) on delete set null,
  approval_type text not null default 'manual'
    check (approval_type in ('auto', 'manual', 'multi', 'workflow', 'critical')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'expired', 'cancelled')),
  title text not null,
  rationale text not null default '',
  required_roles_json jsonb not null default '["owner","admin"]'::jsonb,
  decided_by uuid,
  decided_at timestamptz,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists orchestrator_approvals_org_idx
  on public.orchestrator_approvals (organization_id, status, created_at desc);

alter table public.orchestrator_approvals enable row level security;

drop policy if exists "orchestrator_approvals_select" on public.orchestrator_approvals;
create policy "orchestrator_approvals_select"
  on public.orchestrator_approvals for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "orchestrator_approvals_write" on public.orchestrator_approvals;
create policy "orchestrator_approvals_write"
  on public.orchestrator_approvals for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create table if not exists public.orchestrator_agent_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  execution_id uuid not null references public.orchestrator_executions (id) on delete cascade,
  from_agent_slug text not null,
  to_agent_slug text,
  message_type text not null default 'share'
    check (message_type in ('share', 'handoff', 'question', 'context', 'memory', 'result')),
  body text not null default '',
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists orchestrator_agent_messages_exec_idx
  on public.orchestrator_agent_messages (execution_id, created_at);

alter table public.orchestrator_agent_messages enable row level security;

drop policy if exists "orchestrator_agent_messages_select" on public.orchestrator_agent_messages;
create policy "orchestrator_agent_messages_select"
  on public.orchestrator_agent_messages for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "orchestrator_agent_messages_write" on public.orchestrator_agent_messages;
create policy "orchestrator_agent_messages_write"
  on public.orchestrator_agent_messages for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create table if not exists public.orchestrator_history_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  execution_id uuid,
  goal_id uuid,
  event_type text not null,
  actor_user_id uuid,
  summary text not null default '',
  payload_json jsonb not null default '{}'::jsonb,
  provider text,
  model text,
  cost_usd numeric(12,4) not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists orchestrator_history_org_idx
  on public.orchestrator_history_events (organization_id, created_at desc);

alter table public.orchestrator_history_events enable row level security;

drop policy if exists "orchestrator_history_select" on public.orchestrator_history_events;
create policy "orchestrator_history_select"
  on public.orchestrator_history_events for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "orchestrator_history_write" on public.orchestrator_history_events;
create policy "orchestrator_history_write"
  on public.orchestrator_history_events for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create table if not exists public.orchestrator_bulk_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  job_type text not null,
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

drop trigger if exists orchestrator_bulk_jobs_set_updated_at on public.orchestrator_bulk_jobs;
create trigger orchestrator_bulk_jobs_set_updated_at
before update on public.orchestrator_bulk_jobs
for each row execute function public.set_updated_at();

create index if not exists orchestrator_bulk_jobs_org_idx
  on public.orchestrator_bulk_jobs (organization_id, created_at desc);

alter table public.orchestrator_bulk_jobs enable row level security;

drop policy if exists "orchestrator_bulk_jobs_select" on public.orchestrator_bulk_jobs;
create policy "orchestrator_bulk_jobs_select"
  on public.orchestrator_bulk_jobs for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "orchestrator_bulk_jobs_write" on public.orchestrator_bulk_jobs;
create policy "orchestrator_bulk_jobs_write"
  on public.orchestrator_bulk_jobs for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
