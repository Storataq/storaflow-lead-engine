-- Lead Engine — Automated Email Engine foundation (architecture tables)
-- Additive only. Run manually AFTER 20260726000010_funnel_activation.sql
-- Do NOT auto-execute from the app.
-- NO sending / tracking processors in this phase — schema readiness only.

-- ---------------------------------------------------------------------------
-- email_campaigns
-- ---------------------------------------------------------------------------

create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'draft'
    check (status in (
      'draft', 'scheduled', 'running', 'paused',
      'completed', 'cancelled', 'archived'
    )),
  audience_id uuid,
  sequence_id uuid,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_campaigns_org_status_idx
  on public.email_campaigns (organization_id, status, updated_at desc);

create trigger email_campaigns_set_updated_at
before update on public.email_campaigns
for each row execute function public.set_updated_at();

alter table public.email_campaigns enable row level security;

create policy "email_campaigns_select" on public.email_campaigns
  for select to authenticated using (public.is_org_member(organization_id));
create policy "email_campaigns_insert" on public.email_campaigns
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "email_campaigns_update" on public.email_campaigns
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "email_campaigns_delete" on public.email_campaigns
  for delete to authenticated using (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- email_sequences
-- ---------------------------------------------------------------------------

create table if not exists public.email_sequences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'archived')),
  version integer not null default 1 check (version >= 1),
  steps_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_sequences_org_idx
  on public.email_sequences (organization_id, updated_at desc);

create trigger email_sequences_set_updated_at
before update on public.email_sequences
for each row execute function public.set_updated_at();

alter table public.email_sequences enable row level security;

create policy "email_sequences_select" on public.email_sequences
  for select to authenticated using (public.is_org_member(organization_id));
create policy "email_sequences_insert" on public.email_sequences
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "email_sequences_update" on public.email_sequences
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "email_sequences_delete" on public.email_sequences
  for delete to authenticated using (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- email_templates
-- ---------------------------------------------------------------------------

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  subject text not null default '',
  preview_text text,
  html_body text not null default '',
  text_body text,
  variables text[] not null default '{}'::text[],
  language text not null default 'en',
  category text,
  version integer not null default 1 check (version >= 1),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_templates_org_idx
  on public.email_templates (organization_id, status, updated_at desc);

create trigger email_templates_set_updated_at
before update on public.email_templates
for each row execute function public.set_updated_at();

alter table public.email_templates enable row level security;

create policy "email_templates_select" on public.email_templates
  for select to authenticated using (public.is_org_member(organization_id));
create policy "email_templates_insert" on public.email_templates
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "email_templates_update" on public.email_templates
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "email_templates_delete" on public.email_templates
  for delete to authenticated using (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- email_audiences
-- ---------------------------------------------------------------------------

create table if not exists public.email_audiences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  filter_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_audiences_org_idx
  on public.email_audiences (organization_id, updated_at desc);

create trigger email_audiences_set_updated_at
before update on public.email_audiences
for each row execute function public.set_updated_at();

alter table public.email_audiences enable row level security;

create policy "email_audiences_select" on public.email_audiences
  for select to authenticated using (public.is_org_member(organization_id));
create policy "email_audiences_insert" on public.email_audiences
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "email_audiences_update" on public.email_audiences
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "email_audiences_delete" on public.email_audiences
  for delete to authenticated using (public.is_org_member(organization_id));

-- FK soft links for campaigns (after audiences/sequences exist)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'email_campaigns_audience_id_fkey'
  ) then
    alter table public.email_campaigns
      add constraint email_campaigns_audience_id_fkey
      foreign key (audience_id) references public.email_audiences (id) on delete set null;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'email_campaigns_sequence_id_fkey'
  ) then
    alter table public.email_campaigns
      add constraint email_campaigns_sequence_id_fkey
      foreign key (sequence_id) references public.email_sequences (id) on delete set null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- email_recipients
-- ---------------------------------------------------------------------------

create table if not exists public.email_recipients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  campaign_id uuid references public.email_campaigns (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  lead_id uuid references public.crm_leads (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  preferred_email text not null,
  preferred_name text,
  language text,
  campaign_status text not null default 'pending'
    check (campaign_status in (
      'pending', 'enrolled', 'active', 'completed',
      'paused', 'exited', 'suppressed', 'failed'
    )),
  sequence_status text not null default 'not_started'
    check (sequence_status in (
      'not_started', 'in_progress', 'waiting', 'completed',
      'stopped', 'bounced_out', 'unsubscribed'
    )),
  suppression_status text not null default 'active'
    check (suppression_status in (
      'active', 'suppressed', 'unsubscribed',
      'complaint', 'invalid_email', 'manual_block'
    )),
  validation_status text not null default 'not_checked'
    check (validation_status in (
      'unknown', 'syntax_valid', 'syntax_invalid',
      'domain_valid', 'mx_available', 'risky', 'not_checked'
    )),
  personalization_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_recipients_org_campaign_idx
  on public.email_recipients (organization_id, campaign_id, updated_at desc);

create index if not exists email_recipients_email_idx
  on public.email_recipients (organization_id, preferred_email);

create trigger email_recipients_set_updated_at
before update on public.email_recipients
for each row execute function public.set_updated_at();

alter table public.email_recipients enable row level security;

create policy "email_recipients_select" on public.email_recipients
  for select to authenticated using (public.is_org_member(organization_id));
create policy "email_recipients_insert" on public.email_recipients
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "email_recipients_update" on public.email_recipients
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "email_recipients_delete" on public.email_recipients
  for delete to authenticated using (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- email_queue
-- ---------------------------------------------------------------------------

create table if not exists public.email_queue (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  campaign_id uuid references public.email_campaigns (id) on delete set null,
  recipient_id uuid not null references public.email_recipients (id) on delete cascade,
  sequence_id uuid references public.email_sequences (id) on delete set null,
  step_id text,
  template_id uuid references public.email_templates (id) on delete set null,
  status text not null default 'queued'
    check (status in (
      'queued', 'waiting', 'scheduled', 'sending', 'sent', 'delivered',
      'opened', 'clicked', 'replied', 'bounced', 'failed', 'cancelled'
    )),
  scheduled_at timestamptz,
  provider_code text not null default 'none',
  provider_message_id text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_queue_org_status_idx
  on public.email_queue (organization_id, status, scheduled_at);

create index if not exists email_queue_recipient_idx
  on public.email_queue (organization_id, recipient_id, created_at desc);

create trigger email_queue_set_updated_at
before update on public.email_queue
for each row execute function public.set_updated_at();

alter table public.email_queue enable row level security;

create policy "email_queue_select" on public.email_queue
  for select to authenticated using (public.is_org_member(organization_id));
create policy "email_queue_insert" on public.email_queue
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "email_queue_update" on public.email_queue
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "email_queue_delete" on public.email_queue
  for delete to authenticated using (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- email_suppressions
-- ---------------------------------------------------------------------------

create table if not exists public.email_suppressions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email_normalized text not null,
  status text not null default 'suppressed'
    check (status in (
      'active', 'suppressed', 'unsubscribed',
      'complaint', 'invalid_email', 'manual_block'
    )),
  reason text not null default 'other'
    check (reason in (
      'user_blocked', 'do_not_contact', 'unsubscribed', 'complaint',
      'invalid_email', 'duplicate', 'legal_restriction', 'internal_exclusion',
      'competitor', 'existing_customer', 'bounce_hard', 'manual', 'other'
    )),
  source text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, email_normalized)
);

create index if not exists email_suppressions_org_status_idx
  on public.email_suppressions (organization_id, status);

create trigger email_suppressions_set_updated_at
before update on public.email_suppressions
for each row execute function public.set_updated_at();

alter table public.email_suppressions enable row level security;

create policy "email_suppressions_select" on public.email_suppressions
  for select to authenticated using (public.is_org_member(organization_id));
create policy "email_suppressions_insert" on public.email_suppressions
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "email_suppressions_update" on public.email_suppressions
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "email_suppressions_delete" on public.email_suppressions
  for delete to authenticated using (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- email_events
-- ---------------------------------------------------------------------------

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  queue_item_id uuid references public.email_queue (id) on delete set null,
  recipient_id uuid references public.email_recipients (id) on delete set null,
  campaign_id uuid references public.email_campaigns (id) on delete set null,
  event_type text not null
    check (event_type in (
      'email_queued', 'email_sent', 'email_delivered', 'email_opened',
      'email_clicked', 'email_replied', 'email_bounced',
      'complaint_received', 'recipient_unsubscribed'
    )),
  bounce_type text
    check (bounce_type is null or bounce_type in ('hard', 'soft', 'unknown')),
  payload_json jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_events_org_occurred_idx
  on public.email_events (organization_id, occurred_at desc);

create index if not exists email_events_campaign_idx
  on public.email_events (organization_id, campaign_id, event_type);

alter table public.email_events enable row level security;

create policy "email_events_select" on public.email_events
  for select to authenticated using (public.is_org_member(organization_id));
create policy "email_events_insert" on public.email_events
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "email_events_update" on public.email_events
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "email_events_delete" on public.email_events
  for delete to authenticated using (public.is_org_member(organization_id));

comment on table public.email_campaigns is
  'Automated Email Engine foundation — no send execution in this phase';
comment on table public.email_queue is
  'Outbound queue schema only — workers/providers not wired yet';
