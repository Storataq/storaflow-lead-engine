-- Lead Engine — Email Production Hardening (Phase 21L)
-- Additive only. Run manually AFTER 20260726000021_email_ai_intelligence.sql
-- Do NOT auto-execute from the app.
-- Do NOT modify migrations 00001–00021.

-- ---------------------------------------------------------------------------
-- Organization emergency / kill-switch controls
-- ---------------------------------------------------------------------------

create table if not exists public.email_emergency_controls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email_sending_enabled boolean not null default true,
  scheduler_enabled boolean not null default true,
  worker_enabled boolean not null default true,
  provider_dispatch_enabled boolean not null default false,
  webhook_processing_enabled boolean not null default true,
  tracking_enabled boolean not null default true,
  analytics_aggregation_enabled boolean not null default true,
  ai_enabled_override boolean,
  emergency_stop boolean not null default false,
  emergency_stop_reason text,
  emergency_stopped_at timestamptz,
  emergency_stopped_by uuid,
  test_mode boolean not null default true,
  test_recipient_allowlist_json jsonb not null default '[]'::jsonb,
  provider_circuit_state text not null default 'closed'
    check (provider_circuit_state in ('closed', 'open', 'half_open', 'disabled')),
  provider_circuit_opened_at timestamptz,
  provider_circuit_reason text,
  provider_consecutive_failures integer not null default 0,
  daily_send_limit integer,
  hourly_send_limit integer,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id)
);

create trigger email_emergency_controls_set_updated_at
before update on public.email_emergency_controls
for each row execute function public.set_updated_at();

alter table public.email_emergency_controls enable row level security;

create policy "email_emergency_controls_select"
  on public.email_emergency_controls for select
  to authenticated using (public.is_org_member(organization_id));

create policy "email_emergency_controls_insert"
  on public.email_emergency_controls for insert
  to authenticated with check (public.is_org_owner_or_admin(organization_id));

create policy "email_emergency_controls_update"
  on public.email_emergency_controls for update
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Operational health snapshots (org-scoped)
-- ---------------------------------------------------------------------------

create table if not exists public.email_operational_health (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  component text not null
    check (component in (
      'database', 'authentication', 'queue', 'scheduler', 'worker',
      'email_provider', 'webhook_processing', 'tracking', 'inbound_replies',
      'suppression', 'analytics_aggregation', 'ai_provider', 'environment'
    )),
  status text not null default 'unknown'
    check (status in ('healthy', 'degraded', 'unhealthy', 'disabled', 'unknown')),
  last_success_at timestamptz,
  last_failure_at timestamptz,
  latency_ms integer,
  error_summary text,
  warning_summary text,
  evidence_json jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists email_operational_health_org_component_idx
  on public.email_operational_health (organization_id, component);

create index if not exists email_operational_health_status_idx
  on public.email_operational_health (organization_id, status, checked_at desc);

create trigger email_operational_health_set_updated_at
before update on public.email_operational_health
for each row execute function public.set_updated_at();

alter table public.email_operational_health enable row level security;

create policy "email_operational_health_select"
  on public.email_operational_health for select
  to authenticated using (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Alert rules + operational alerts (deduped)
-- ---------------------------------------------------------------------------

create table if not exists public.email_alert_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  rule_code text not null,
  name text not null,
  metric_or_event text not null,
  warning_threshold numeric,
  critical_threshold numeric,
  observation_window_minutes integer not null default 60,
  minimum_sample_size integer not null default 5,
  cooldown_minutes integer not null default 30,
  enabled boolean not null default true,
  notification_channel_placeholder text,
  last_triggered_at timestamptz,
  current_state text not null default 'normal'
    check (current_state in ('normal', 'warning', 'critical', 'acknowledged', 'resolved', 'disabled')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, rule_code)
);

create trigger email_alert_rules_set_updated_at
before update on public.email_alert_rules
for each row execute function public.set_updated_at();

alter table public.email_alert_rules enable row level security;

create policy "email_alert_rules_select"
  on public.email_alert_rules for select
  to authenticated using (public.is_org_member(organization_id));

create policy "email_alert_rules_manage"
  on public.email_alert_rules for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

create table if not exists public.email_operational_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  alert_rule_id uuid references public.email_alert_rules (id) on delete set null,
  fingerprint text not null,
  component text not null,
  severity text not null
    check (severity in ('informational', 'warning', 'high_priority', 'critical')),
  title text not null,
  description text,
  status text not null default 'open'
    check (status in ('open', 'acknowledged', 'resolved', 'ignored')),
  evidence_json jsonb not null default '{}'::jsonb,
  first_detected_at timestamptz not null default timezone('utc', now()),
  last_detected_at timestamptz not null default timezone('utc', now()),
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists email_operational_alerts_active_fp_idx
  on public.email_operational_alerts (organization_id, fingerprint)
  where status in ('open', 'acknowledged');

create index if not exists email_operational_alerts_org_status_idx
  on public.email_operational_alerts (organization_id, status, severity, last_detected_at desc);

create trigger email_operational_alerts_set_updated_at
before update on public.email_operational_alerts
for each row execute function public.set_updated_at();

alter table public.email_operational_alerts enable row level security;

create policy "email_operational_alerts_select"
  on public.email_operational_alerts for select
  to authenticated using (public.is_org_member(organization_id));

create policy "email_operational_alerts_update"
  on public.email_operational_alerts for update
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Incidents
-- ---------------------------------------------------------------------------

create table if not exists public.email_incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  component text not null,
  severity text not null
    check (severity in ('informational', 'warning', 'high_priority', 'critical')),
  title text not null,
  description text,
  status text not null default 'open'
    check (status in ('open', 'investigating', 'monitoring', 'resolved', 'ignored')),
  trigger_source text,
  alert_rule_id uuid references public.email_alert_rules (id) on delete set null,
  related_provider text,
  related_campaign_id uuid,
  related_job_id uuid,
  evidence_json jsonb not null default '{}'::jsonb,
  first_detected_at timestamptz not null default timezone('utc', now()),
  last_detected_at timestamptz not null default timezone('utc', now()),
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_incidents_org_status_idx
  on public.email_incidents (organization_id, status, severity, last_detected_at desc);

create trigger email_incidents_set_updated_at
before update on public.email_incidents
for each row execute function public.set_updated_at();

alter table public.email_incidents enable row level security;

create policy "email_incidents_select"
  on public.email_incidents for select
  to authenticated using (public.is_org_member(organization_id));

create policy "email_incidents_insert"
  on public.email_incidents for insert
  to authenticated with check (public.is_org_owner_or_admin(organization_id));

create policy "email_incidents_update"
  on public.email_incidents for update
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Reconciliation runs / findings
-- ---------------------------------------------------------------------------

create table if not exists public.email_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  run_type text not null
    check (run_type in (
      'expired_locks', 'stuck_processing', 'orphan_jobs',
      'suppressed_pending', 'counter_compare', 'full_dry_run', 'authorized_repair'
    )),
  mode text not null default 'dry_run'
    check (mode in ('dry_run', 'repair')),
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed')),
  correlation_id text,
  summary_json jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_reconciliation_runs_org_idx
  on public.email_reconciliation_runs (organization_id, created_at desc);

create trigger email_reconciliation_runs_set_updated_at
before update on public.email_reconciliation_runs
for each row execute function public.set_updated_at();

alter table public.email_reconciliation_runs enable row level security;

create policy "email_reconciliation_runs_select"
  on public.email_reconciliation_runs for select
  to authenticated using (public.is_org_owner_or_admin(organization_id));

create table if not exists public.email_reconciliation_findings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  run_id uuid not null references public.email_reconciliation_runs (id) on delete cascade,
  finding_code text not null,
  severity text not null default 'warning'
    check (severity in ('informational', 'warning', 'high_priority', 'critical')),
  resource_type text,
  resource_id text,
  description text not null,
  evidence_json jsonb not null default '{}'::jsonb,
  repaired boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_reconciliation_findings_run_idx
  on public.email_reconciliation_findings (run_id, severity);

alter table public.email_reconciliation_findings enable row level security;

create policy "email_reconciliation_findings_select"
  on public.email_reconciliation_findings for select
  to authenticated using (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- E2E test runs (organization-scoped, synthetic only)
-- ---------------------------------------------------------------------------

create table if not exists public.email_e2e_test_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'pass', 'pass_with_warning', 'fail', 'skipped', 'blocked')),
  environment text,
  correlation_id text,
  steps_json jsonb not null default '[]'::jsonb,
  evidence_json jsonb not null default '{}'::jsonb,
  errors_json jsonb not null default '[]'::jsonb,
  warnings_json jsonb not null default '[]'::jsonb,
  cleanup_status text,
  started_at timestamptz,
  ended_at timestamptz,
  duration_ms integer,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_e2e_test_runs_org_idx
  on public.email_e2e_test_runs (organization_id, created_at desc);

create trigger email_e2e_test_runs_set_updated_at
before update on public.email_e2e_test_runs
for each row execute function public.set_updated_at();

alter table public.email_e2e_test_runs enable row level security;

create policy "email_e2e_test_runs_select"
  on public.email_e2e_test_runs for select
  to authenticated using (public.is_org_owner_or_admin(organization_id));

create policy "email_e2e_test_runs_insert"
  on public.email_e2e_test_runs for insert
  to authenticated with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Production readiness checklist rows
-- ---------------------------------------------------------------------------

create table if not exists public.email_production_readiness_checks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  check_code text not null,
  category text not null,
  status text not null default 'not_checked'
    check (status in ('not_checked', 'pass', 'pass_with_warning', 'fail', 'not_applicable', 'deferred')),
  evidence text,
  owner_placeholder text,
  blocking boolean not null default false,
  notes text,
  last_checked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists email_production_readiness_checks_org_code_idx
  on public.email_production_readiness_checks (coalesce(organization_id::text, 'global'), check_code);

create trigger email_production_readiness_checks_set_updated_at
before update on public.email_production_readiness_checks
for each row execute function public.set_updated_at();

alter table public.email_production_readiness_checks enable row level security;

create policy "email_production_readiness_checks_select"
  on public.email_production_readiness_checks for select
  to authenticated using (
    organization_id is null
    or public.is_org_member(organization_id)
  );

create policy "email_production_readiness_checks_manage"
  on public.email_production_readiness_checks for all
  to authenticated using (
    organization_id is not null
    and public.is_org_owner_or_admin(organization_id)
  )
  with check (
    organization_id is not null
    and public.is_org_owner_or_admin(organization_id)
  );

-- ---------------------------------------------------------------------------
-- Security audit run stubs
-- ---------------------------------------------------------------------------

create table if not exists public.email_security_audit_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  scope text not null default 'organization',
  status text not null default 'completed'
    check (status in ('pending', 'running', 'completed', 'failed')),
  findings_json jsonb not null default '[]'::jsonb,
  summary_json jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create index if not exists email_security_audit_runs_org_idx
  on public.email_security_audit_runs (organization_id, created_at desc);

alter table public.email_security_audit_runs enable row level security;

create policy "email_security_audit_runs_select"
  on public.email_security_audit_runs for select
  to authenticated using (
    organization_id is not null
    and public.is_org_owner_or_admin(organization_id)
  );

-- Helpful indexes for queue / delivery ops (if missing)
create index if not exists email_queue_jobs_org_status_due_idx
  on public.email_queue_jobs (organization_id, status, scheduled_for)
  where status in ('scheduled', 'available', 'locked', 'processing', 'retry');

create index if not exists email_queue_jobs_lease_expires_idx
  on public.email_queue_jobs (organization_id, lease_expires_at)
  where lease_expires_at is not null;

comment on table public.email_emergency_controls is
  'Phase 21L kill switches. provider_dispatch_enabled and test_mode default conservative.';
comment on table public.email_reconciliation_runs is
  'Phase 21L reconciliation. Prefer dry_run; never auto-repair destructive guesses.';
