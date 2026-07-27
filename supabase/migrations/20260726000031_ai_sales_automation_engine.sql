-- Storaflow — AI Sales Automation Engine (Phase 25F)
-- Additive only. Run manually AFTER 20260726000030_ai_lead_scoring_engine.sql
-- Do NOT auto-execute from the app.
-- Do NOT modify migrations 00001–00030.
-- Extends crm_automation_events outbox — does not replace it.
-- Idempotent: safe to re-run after partial execution.

-- ---------------------------------------------------------------------------
-- Automation definitions
-- ---------------------------------------------------------------------------

create table if not exists public.crm_automations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'archived')),
  trigger_type text not null default 'lead_score_changed',
  trigger_config_json jsonb not null default '{}'::jsonb,
  workflow_graph_json jsonb not null default '{}'::jsonb,
  definition_json jsonb not null default '{}'::jsonb,
  template_code text,
  owner_user_id uuid,
  current_version integer not null default 1,
  enabled boolean not null default false,
  channel_plan_json jsonb not null default '{"email":true}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists crm_automations_org_status_idx
  on public.crm_automations (organization_id, status);

create index if not exists crm_automations_org_trigger_idx
  on public.crm_automations (organization_id, trigger_type)
  where enabled = true and status = 'active';

drop trigger if exists crm_automations_set_updated_at on public.crm_automations;
create trigger crm_automations_set_updated_at
before update on public.crm_automations
for each row execute function public.set_updated_at();

alter table public.crm_automations enable row level security;

drop policy if exists "crm_automations_select" on public.crm_automations;
create policy "crm_automations_select"
  on public.crm_automations for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "crm_automations_write" on public.crm_automations;
create policy "crm_automations_write"
  on public.crm_automations for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Versions (immutable snapshots)
-- ---------------------------------------------------------------------------

create table if not exists public.crm_automation_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  automation_id uuid not null references public.crm_automations (id) on delete cascade,
  version_number integer not null,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  name text not null,
  description text,
  trigger_type text not null,
  trigger_config_json jsonb not null default '{}'::jsonb,
  workflow_graph_json jsonb not null default '{}'::jsonb,
  definition_json jsonb not null default '{}'::jsonb,
  change_notes text,
  is_current boolean not null default false,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (automation_id, version_number)
);

create index if not exists crm_automation_versions_org_idx
  on public.crm_automation_versions (organization_id, automation_id, version_number desc);

drop trigger if exists crm_automation_versions_set_updated_at
  on public.crm_automation_versions;
create trigger crm_automation_versions_set_updated_at
before update on public.crm_automation_versions
for each row execute function public.set_updated_at();

alter table public.crm_automation_versions enable row level security;

drop policy if exists "crm_automation_versions_select" on public.crm_automation_versions;
create policy "crm_automation_versions_select"
  on public.crm_automation_versions for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "crm_automation_versions_write" on public.crm_automation_versions;
create policy "crm_automation_versions_write"
  on public.crm_automation_versions for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Execution runs + logs
-- ---------------------------------------------------------------------------

create table if not exists public.crm_automation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  automation_id uuid not null references public.crm_automations (id) on delete cascade,
  version_id uuid references public.crm_automation_versions (id) on delete set null,
  source_event_id uuid references public.crm_automation_events (id) on delete set null,
  entity_type text,
  entity_id uuid,
  status text not null default 'pending'
    check (
      status in (
        'pending',
        'running',
        'completed',
        'failed',
        'cancelled'
      )
    ),
  trigger_type text,
  started_at timestamptz,
  finished_at timestamptz,
  duration_ms integer,
  executed_actions_json jsonb not null default '[]'::jsonb,
  context_json jsonb not null default '{}'::jsonb,
  error_message text,
  idempotency_key text,
  retry_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, idempotency_key)
);

create index if not exists crm_automation_runs_org_status_idx
  on public.crm_automation_runs (organization_id, status, created_at desc);

create index if not exists crm_automation_runs_automation_idx
  on public.crm_automation_runs (organization_id, automation_id, created_at desc);

create index if not exists crm_automation_runs_pending_idx
  on public.crm_automation_runs (organization_id, created_at)
  where status in ('pending', 'running');

alter table public.crm_automation_runs enable row level security;

drop policy if exists "crm_automation_runs_select" on public.crm_automation_runs;
create policy "crm_automation_runs_select"
  on public.crm_automation_runs for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "crm_automation_runs_write" on public.crm_automation_runs;
create policy "crm_automation_runs_write"
  on public.crm_automation_runs for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

create table if not exists public.crm_automation_run_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  run_id uuid not null references public.crm_automation_runs (id) on delete cascade,
  step_key text,
  step_type text,
  level text not null default 'info'
    check (level in ('debug', 'info', 'warn', 'error')),
  message text not null,
  result text,
  execution_time_ms integer,
  payload_json jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists crm_automation_run_logs_run_idx
  on public.crm_automation_run_logs (organization_id, run_id, created_at);

alter table public.crm_automation_run_logs enable row level security;

drop policy if exists "crm_automation_run_logs_select" on public.crm_automation_run_logs;
create policy "crm_automation_run_logs_select"
  on public.crm_automation_run_logs for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "crm_automation_run_logs_write" on public.crm_automation_run_logs;
create policy "crm_automation_run_logs_write"
  on public.crm_automation_run_logs for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Templates (org + system)
-- ---------------------------------------------------------------------------

create table if not exists public.crm_automation_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  category text not null default 'general',
  trigger_type text not null,
  workflow_graph_json jsonb not null default '{}'::jsonb,
  definition_json jsonb not null default '{}'::jsonb,
  is_system boolean not null default false,
  enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, code)
);

create unique index if not exists crm_automation_templates_system_code_uidx
  on public.crm_automation_templates (code)
  where organization_id is null and is_system = true;

alter table public.crm_automation_templates enable row level security;

drop policy if exists "crm_automation_templates_select" on public.crm_automation_templates;
create policy "crm_automation_templates_select"
  on public.crm_automation_templates for select
  to authenticated using (
    organization_id is null
    or public.is_org_member(organization_id)
  );

drop policy if exists "crm_automation_templates_write" on public.crm_automation_templates;
create policy "crm_automation_templates_write"
  on public.crm_automation_templates for all
  to authenticated using (
    organization_id is not null
    and public.is_org_owner_or_admin(organization_id)
  )
  with check (
    organization_id is not null
    and public.is_org_owner_or_admin(organization_id)
  );

comment on table public.crm_automations is
  'Phase 25F — visual sales automation definitions (queue-ready).';
comment on table public.crm_automation_runs is
  'Phase 25F — automation execution history; workers process pending runs.';
comment on table public.crm_automation_templates is
  'Phase 25F — ready-made automation templates (system + org). System templates seeded by app.';

-- Allow owners/admins to mark outbox events processed (Phase 25F processor)
drop policy if exists "crm_automation_events_update" on public.crm_automation_events;
create policy "crm_automation_events_update"
  on public.crm_automation_events for update
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));
