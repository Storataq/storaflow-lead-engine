-- Lead Engine — Delivery, Bounce & Complaint Processing (Phase 21G)
-- Additive only. Run manually AFTER 20260726000016_email_provider_integration.sql
-- Do NOT auto-execute from the app.

-- ---------------------------------------------------------------------------
-- Expand legacy outbound queue statuses for provider lifecycle events
-- ---------------------------------------------------------------------------

do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.email_queue'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%';

  if cname is not null then
    execute format('alter table public.email_queue drop constraint %I', cname);
  end if;

  alter table public.email_queue
    add constraint email_queue_status_check
    check (status in (
      'queued',
      'waiting',
      'scheduled',
      'sending',
      'sent',
      'delivered',
      'delayed',
      'bounced',
      'complained',
      'rejected',
      'failed',
      'cancelled'
    ));
end $$;

-- ---------------------------------------------------------------------------
-- Raw verified provider events
-- ---------------------------------------------------------------------------

create table if not exists public.email_provider_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete set null,
  provider text not null,
  provider_event_id text,
  provider_message_id text,
  event_type text not null,
  normalized_event_type text not null default 'unknown',
  raw_payload jsonb not null default '{}'::jsonb,
  payload_fingerprint text not null,
  signature_verification_status text not null default 'verified'
    check (signature_verification_status in ('verified', 'invalid', 'missing', 'skipped')),
  received_at timestamptz not null default timezone('utc', now()),
  provider_event_timestamp timestamptz,
  processing_status text not null default 'pending'
    check (processing_status in ('pending', 'processed', 'duplicate', 'failed', 'needs_review')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  processed_at timestamptz,
  last_error_code text,
  last_error_message text,
  correlation_status text not null default 'unmatched'
    check (correlation_status in ('matched', 'partially_matched', 'unmatched', 'ambiguous', 'invalid')),
  duplicate_flag boolean not null default false,
  queue_item_id uuid references public.email_queue (id) on delete set null,
  campaign_execution_id uuid references public.email_campaign_executions (id) on delete set null,
  enrollment_id uuid references public.email_sequence_enrollments (id) on delete set null,
  step_execution_id uuid references public.email_step_executions (id) on delete set null,
  recipient_id uuid references public.email_recipients (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists email_provider_events_provider_event_id_idx
  on public.email_provider_events (provider, provider_event_id)
  where provider_event_id is not null;

create unique index if not exists email_provider_events_fingerprint_idx
  on public.email_provider_events (provider, payload_fingerprint);

create index if not exists email_provider_events_message_idx
  on public.email_provider_events (provider, provider_message_id, received_at desc);

create index if not exists email_provider_events_processing_idx
  on public.email_provider_events (processing_status, correlation_status, received_at desc);

create trigger email_provider_events_set_updated_at
before update on public.email_provider_events
for each row execute function public.set_updated_at();

alter table public.email_provider_events enable row level security;

create policy "email_provider_events_select"
  on public.email_provider_events for select
  to authenticated
  using (
    organization_id is not null
    and public.is_org_member(organization_id)
  );

-- ---------------------------------------------------------------------------
-- Aggregated delivery status per outbound message / queue row
-- ---------------------------------------------------------------------------

create table if not exists public.email_message_delivery_status (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  queue_item_id uuid not null references public.email_queue (id) on delete cascade,
  campaign_id uuid references public.email_campaigns (id) on delete set null,
  campaign_execution_id uuid references public.email_campaign_executions (id) on delete set null,
  enrollment_id uuid references public.email_sequence_enrollments (id) on delete set null,
  step_execution_id uuid references public.email_step_executions (id) on delete set null,
  recipient_id uuid references public.email_recipients (id) on delete set null,
  provider text not null,
  provider_message_id text,
  current_status text not null default 'prepared'
    check (current_status in (
      'prepared',
      'dispatching',
      'accepted',
      'queued',
      'sent',
      'delivered',
      'delayed',
      'soft_bounced',
      'hard_bounced',
      'complained',
      'rejected',
      'failed',
      'cancelled',
      'unknown'
    )),
  latest_event_at timestamptz,
  accepted_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  first_delayed_at timestamptz,
  last_delayed_at timestamptz,
  soft_bounced_at timestamptz,
  hard_bounced_at timestamptz,
  complained_at timestamptz,
  failed_at timestamptz,
  provider_status text,
  last_event_id uuid references public.email_provider_events (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (queue_item_id)
);

create index if not exists email_message_delivery_status_provider_message_idx
  on public.email_message_delivery_status (organization_id, provider_message_id);

create index if not exists email_message_delivery_status_current_idx
  on public.email_message_delivery_status (organization_id, current_status, updated_at desc);

create trigger email_message_delivery_status_set_updated_at
before update on public.email_message_delivery_status
for each row execute function public.set_updated_at();

alter table public.email_message_delivery_status enable row level security;

create policy "email_message_delivery_status_select"
  on public.email_message_delivery_status for select
  to authenticated using (public.is_org_member(organization_id));

create policy "email_message_delivery_status_insert"
  on public.email_message_delivery_status for insert
  to authenticated with check (public.is_org_member(organization_id));

create policy "email_message_delivery_status_update"
  on public.email_message_delivery_status for update
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Campaign execution delivery counters
-- ---------------------------------------------------------------------------

alter table public.email_campaign_executions
  add column if not exists accepted_message_count integer not null default 0,
  add column if not exists sent_message_count integer not null default 0,
  add column if not exists delivered_message_count integer not null default 0,
  add column if not exists delayed_message_count integer not null default 0,
  add column if not exists soft_bounce_count integer not null default 0,
  add column if not exists hard_bounce_count integer not null default 0,
  add column if not exists complaint_count integer not null default 0,
  add column if not exists rejection_count integer not null default 0,
  add column if not exists delivery_failure_count integer not null default 0;

