-- Lead Engine — Email Execution Engine (Phase 21E)
-- Additive only. Run manually AFTER 20260726000014_email_sequence_engine.sql
-- NO external sending / provider integration in this phase.

-- ---------------------------------------------------------------------------
-- email_campaign_executions
-- ---------------------------------------------------------------------------

create table if not exists public.email_campaign_executions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  campaign_id uuid not null references public.email_campaigns (id) on delete cascade,
  campaign_approval_id uuid references public.email_campaign_approvals (id) on delete set null,
  sequence_id uuid references public.email_sequences (id) on delete set null,
  sequence_version_id uuid references public.email_sequence_versions (id) on delete set null,
  status text not null default 'draft'
    check (status in (
      'draft',
      'preparing',
      'ready',
      'running',
      'paused',
      'completed',
      'cancelled',
      'failed'
    )),
  total_recipient_count integer not null default 0,
  enrolled_count integer not null default 0,
  active_count integer not null default 0,
  completed_count integer not null default 0,
  stopped_count integer not null default 0,
  failed_count integer not null default 0,
  created_by uuid,
  started_by uuid,
  started_at timestamptz,
  paused_at timestamptz,
  resumed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  pause_reason text,
  cancel_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_campaign_executions_org_status_idx
  on public.email_campaign_executions (organization_id, status, updated_at desc);

create trigger email_campaign_executions_set_updated_at
before update on public.email_campaign_executions
for each row execute function public.set_updated_at();

alter table public.email_campaign_executions enable row level security;

create policy "email_campaign_executions_select"
  on public.email_campaign_executions for select
  to authenticated using (public.is_org_member(organization_id));

create policy "email_campaign_executions_insert"
  on public.email_campaign_executions for insert
  to authenticated with check (public.is_org_member(organization_id));

create policy "email_campaign_executions_update"
  on public.email_campaign_executions for update
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- email_sequence_enrollments
-- ---------------------------------------------------------------------------

create table if not exists public.email_sequence_enrollments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  campaign_execution_id uuid not null references public.email_campaign_executions (id) on delete cascade,
  campaign_id uuid not null references public.email_campaigns (id) on delete cascade,
  recipient_snapshot_id uuid not null references public.email_recipients (id) on delete cascade,
  lead_id uuid,
  company_id uuid,
  contact_id uuid,
  email_address text not null,
  sequence_id uuid references public.email_sequences (id) on delete set null,
  sequence_version_id uuid references public.email_sequence_versions (id) on delete set null,
  status text not null default 'pending'
    check (status in (
      'pending',
      'scheduled',
      'active',
      'waiting',
      'paused',
      'completed',
      'stopped',
      'failed',
      'cancelled'
    )),
  current_step_id text,
  current_step_number integer,
  previous_step_id text,
  next_execution_time timestamptz,
  timezone_strategy text not null default 'utc',
  attempt_count integer not null default 0 check (attempt_count >= 0),
  pause_reason text,
  stop_reason text,
  completion_reason text,
  started_at timestamptz,
  last_executed_at timestamptz,
  paused_at timestamptz,
  stopped_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  unique (organization_id, campaign_execution_id, recipient_snapshot_id, sequence_version_id)
);

create index if not exists email_sequence_enrollments_org_status_idx
  on public.email_sequence_enrollments (organization_id, status, updated_at desc);
create index if not exists email_sequence_enrollments_next_exec_idx
  on public.email_sequence_enrollments (organization_id, next_execution_time);

create trigger email_sequence_enrollments_set_updated_at
before update on public.email_sequence_enrollments
for each row execute function public.set_updated_at();

alter table public.email_sequence_enrollments enable row level security;

create policy "email_sequence_enrollments_select"
  on public.email_sequence_enrollments for select
  to authenticated using (public.is_org_member(organization_id));
create policy "email_sequence_enrollments_insert"
  on public.email_sequence_enrollments for insert
  to authenticated with check (public.is_org_member(organization_id));
create policy "email_sequence_enrollments_update"
  on public.email_sequence_enrollments for update
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- email_step_executions
-- ---------------------------------------------------------------------------

create table if not exists public.email_step_executions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  enrollment_id uuid not null references public.email_sequence_enrollments (id) on delete cascade,
  campaign_execution_id uuid not null references public.email_campaign_executions (id) on delete cascade,
  sequence_step_id text not null,
  sequence_version_id uuid references public.email_sequence_versions (id) on delete set null,
  step_number integer not null,
  step_type text not null,
  status text not null default 'pending'
    check (status in (
      'pending',
      'queued',
      'scheduled',
      'processing',
      'completed',
      'skipped',
      'failed',
      'cancelled',
      'stopped'
    )),
  scheduled_for timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  result_type text,
  result_data jsonb not null default '{}'::jsonb,
  error_code text,
  error_message text,
  next_step_id text,
  branch_selected text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  unique (organization_id, enrollment_id, sequence_step_id, attempt_count)
);

create index if not exists email_step_executions_org_scheduled_idx
  on public.email_step_executions (organization_id, scheduled_for);

create trigger email_step_executions_set_updated_at
before update on public.email_step_executions
for each row execute function public.set_updated_at();

alter table public.email_step_executions enable row level security;

create policy "email_step_executions_select"
  on public.email_step_executions for select
  to authenticated using (public.is_org_member(organization_id));
create policy "email_step_executions_insert"
  on public.email_step_executions for insert
  to authenticated with check (public.is_org_member(organization_id));
create policy "email_step_executions_update"
  on public.email_step_executions for update
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- email_queue_jobs (execution queue)
-- ---------------------------------------------------------------------------

create table if not exists public.email_queue_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  job_type text not null,
  campaign_execution_id uuid references public.email_campaign_executions (id) on delete cascade,
  enrollment_id uuid references public.email_sequence_enrollments (id) on delete cascade,
  step_execution_id uuid references public.email_step_executions (id) on delete cascade,
  sequence_step_id text,
  status text not null default 'pending'
    check (status in (
      'pending',
      'scheduled',
      'available',
      'locked',
      'processing',
      'completed',
      'retry',
      'failed',
      'cancelled',
      'dead_letter'
    )),
  priority integer not null default 0,
  scheduled_for timestamptz,
  available_at timestamptz,
  locked_at timestamptz,
  locked_by text,
  lease_expires_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  maximum_attempts integer not null default 5,
  last_attempt_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,
  idempotency_key text not null,
  payload_json jsonb not null default '{}'::jsonb,
  result_json jsonb not null default '{}'::jsonb,
  error_code text,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  unique (organization_id, idempotency_key)
);

create index if not exists email_queue_jobs_org_status_scheduled_idx
  on public.email_queue_jobs (organization_id, status, scheduled_for);
create index if not exists email_queue_jobs_lease_idx
  on public.email_queue_jobs (organization_id, lease_expires_at);

create trigger email_queue_jobs_set_updated_at
before update on public.email_queue_jobs
for each row execute function public.set_updated_at();

alter table public.email_queue_jobs enable row level security;

create policy "email_queue_jobs_select"
  on public.email_queue_jobs for select
  to authenticated using (public.is_org_member(organization_id));
create policy "email_queue_jobs_insert"
  on public.email_queue_jobs for insert
  to authenticated with check (public.is_org_member(organization_id));
create policy "email_queue_jobs_update"
  on public.email_queue_jobs for update
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- email_scheduler_runs
-- ---------------------------------------------------------------------------

create table if not exists public.email_scheduler_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  status text not null default 'running'
    check (status in ('running', 'completed', 'completed_with_warnings', 'failed')),
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  worker_id text,
  jobs_found integer not null default 0,
  jobs_released integer not null default 0,
  jobs_skipped integer not null default 0,
  jobs_failed integer not null default 0,
  error_summary text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_scheduler_runs_org_started_idx
  on public.email_scheduler_runs (organization_id, started_at desc);

create trigger email_scheduler_runs_set_updated_at
before update on public.email_scheduler_runs
for each row execute function public.set_updated_at();

alter table public.email_scheduler_runs enable row level security;

create policy "email_scheduler_runs_select"
  on public.email_scheduler_runs for select
  to authenticated using (public.is_org_member(organization_id));
create policy "email_scheduler_runs_insert"
  on public.email_scheduler_runs for insert
  to authenticated with check (public.is_org_member(organization_id));
create policy "email_scheduler_runs_update"
  on public.email_scheduler_runs for update
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- email_rendered_messages
-- ---------------------------------------------------------------------------

create table if not exists public.email_rendered_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  campaign_id uuid references public.email_campaigns (id) on delete cascade,
  campaign_execution_id uuid references public.email_campaign_executions (id) on delete cascade,
  enrollment_id uuid references public.email_sequence_enrollments (id) on delete cascade,
  recipient_snapshot_id uuid references public.email_recipients (id) on delete set null,
  step_execution_id uuid references public.email_step_executions (id) on delete set null,
  template_id uuid,
  template_version_id uuid,
  sender_profile_id uuid,
  recipient_email text,
  recipient_name text,
  language text,
  subject text,
  preview_text text,
  html_body text,
  text_body text,
  personalization_values jsonb not null default '{}'::jsonb,
  fallback_values jsonb not null default '{}'::jsonb,
  missing_optional_values integer not null default 0,
  unsubscribe_token_placeholder text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_rendered_messages_org_step_idx
  on public.email_rendered_messages (organization_id, step_execution_id, created_at desc);

alter table public.email_rendered_messages enable row level security;
create policy "email_rendered_messages_select"
  on public.email_rendered_messages for select
  to authenticated using (public.is_org_member(organization_id));
create policy "email_rendered_messages_insert"
  on public.email_rendered_messages for insert
  to authenticated with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- email_execution_stop_events
-- ---------------------------------------------------------------------------

create table if not exists public.email_execution_stop_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  enrollment_id uuid references public.email_sequence_enrollments (id) on delete cascade,
  step_execution_id uuid references public.email_step_executions (id) on delete set null,
  rule_type text,
  rule_code text,
  stop_reason text,
  source text,
  evaluated_at timestamptz not null default timezone('utc', now()),
  result_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_execution_stop_events_org_enroll_idx
  on public.email_execution_stop_events (organization_id, enrollment_id, evaluated_at desc);

alter table public.email_execution_stop_events enable row level security;
create policy "email_execution_stop_events_select"
  on public.email_execution_stop_events for select
  to authenticated using (public.is_org_member(organization_id));
create policy "email_execution_stop_events_insert"
  on public.email_execution_stop_events for insert
  to authenticated with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- email_execution_transitions
-- ---------------------------------------------------------------------------

create table if not exists public.email_execution_transitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  campaign_execution_id uuid references public.email_campaign_executions (id) on delete cascade,
  enrollment_id uuid references public.email_sequence_enrollments (id) on delete cascade,
  step_execution_id uuid references public.email_step_executions (id) on delete cascade,
  from_status text,
  to_status text,
  event_type text not null,
  actor_user_id uuid,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_execution_transitions_org_idx
  on public.email_execution_transitions (organization_id, created_at desc);

alter table public.email_execution_transitions enable row level security;
create policy "email_execution_transitions_select"
  on public.email_execution_transitions for select
  to authenticated using (public.is_org_member(organization_id));
create policy "email_execution_transitions_insert"
  on public.email_execution_transitions for insert
  to authenticated with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- email_worker_heartbeats
-- ---------------------------------------------------------------------------

create table if not exists public.email_worker_heartbeats (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  worker_id text not null,
  last_heartbeat_at timestamptz not null default timezone('utc', now()),
  status text not null default 'idle',
  unique (organization_id, worker_id)
);

create index if not exists email_worker_heartbeats_org_last_idx
  on public.email_worker_heartbeats (organization_id, last_heartbeat_at desc);

alter table public.email_worker_heartbeats enable row level security;
create policy "email_worker_heartbeats_select"
  on public.email_worker_heartbeats for select
  to authenticated using (public.is_org_member(organization_id));
create policy "email_worker_heartbeats_upsert"
  on public.email_worker_heartbeats for insert
  to authenticated with check (public.is_org_member(organization_id));
create policy "email_worker_heartbeats_update"
  on public.email_worker_heartbeats for update
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Safe queue claim RPC
-- ---------------------------------------------------------------------------

create or replace function public.claim_email_execution_queue_jobs(
  p_organization_id uuid,
  p_worker_id text,
  p_batch_size integer default 10,
  p_now timestamptz default timezone('utc', now()),
  p_lease_seconds integer default 120
)
returns table (
  id uuid,
  job_type text,
  campaign_execution_id uuid,
  enrollment_id uuid,
  step_execution_id uuid,
  sequence_step_id text,
  scheduled_for timestamptz,
  attempt_count integer,
  maximum_attempts integer,
  payload_json jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Allow internal workers using service role, otherwise require org membership.
  -- (Avoid cross-org job claims.)
  if auth.role() <> 'service_role' then
    if not public.is_org_member(p_organization_id) then
      raise exception 'Unauthorized queue claim for organization';
    end if;
  end if;

  return query
  with c as (
    select j.id
    from public.email_queue_jobs j
    where j.organization_id = p_organization_id
      and j.status in ('scheduled', 'available', 'retry')
      and (j.scheduled_for is null or j.scheduled_for <= p_now)
      and (j.lease_expires_at is null or j.lease_expires_at <= p_now)
      and j.attempt_count < j.maximum_attempts
    order by j.priority desc, j.scheduled_for asc nulls last, j.created_at asc
    limit p_batch_size
    for update skip locked
  )
  update public.email_queue_jobs j
  set status = 'locked',
      locked_at = p_now,
      locked_by = p_worker_id,
      lease_expires_at = p_now + (p_lease_seconds || ' seconds')::interval,
      available_at = null
  from c
  where j.id = c.id
  returning
    j.id,
    j.job_type,
    j.campaign_execution_id,
    j.enrollment_id,
    j.step_execution_id,
    j.sequence_step_id,
    j.scheduled_for,
    j.attempt_count,
    j.maximum_attempts,
    j.payload_json;
end $$;

