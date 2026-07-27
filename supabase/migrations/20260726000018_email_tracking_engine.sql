-- Lead Engine — Open, Click & Reply Tracking Engine (Phase 21H)
-- Additive only. Run manually AFTER 20260726000017_email_delivery_events.sql
-- Do NOT auto-execute from the app.

create table if not exists public.email_tracking_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  queue_item_id uuid not null references public.email_queue (id) on delete cascade,
  rendered_message_id uuid not null references public.email_rendered_messages (id) on delete cascade,
  campaign_execution_id uuid references public.email_campaign_executions (id) on delete set null,
  enrollment_id uuid references public.email_sequence_enrollments (id) on delete set null,
  step_execution_id uuid references public.email_step_executions (id) on delete set null,
  recipient_id uuid references public.email_recipients (id) on delete set null,
  public_token text not null,
  original_url text not null,
  normalized_url text not null,
  link_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (public_token),
  unique (rendered_message_id, link_order, normalized_url)
);

create index if not exists email_tracking_links_queue_idx
  on public.email_tracking_links (organization_id, queue_item_id, created_at desc);

create trigger email_tracking_links_set_updated_at
before update on public.email_tracking_links
for each row execute function public.set_updated_at();

alter table public.email_tracking_links enable row level security;

create policy "email_tracking_links_select"
  on public.email_tracking_links for select
  to authenticated using (public.is_org_member(organization_id));

create table if not exists public.email_tracking_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  queue_item_id uuid not null references public.email_queue (id) on delete cascade,
  rendered_message_id uuid references public.email_rendered_messages (id) on delete set null,
  tracking_link_id uuid references public.email_tracking_links (id) on delete set null,
  provider_event_id uuid references public.email_provider_events (id) on delete set null,
  campaign_execution_id uuid references public.email_campaign_executions (id) on delete set null,
  enrollment_id uuid references public.email_sequence_enrollments (id) on delete set null,
  step_execution_id uuid references public.email_step_executions (id) on delete set null,
  recipient_id uuid references public.email_recipients (id) on delete set null,
  event_type text not null check (event_type in ('opened', 'clicked', 'replied')),
  dedupe_key text not null,
  is_unique boolean not null default false,
  occurred_at timestamptz not null default timezone('utc', now()),
  ip_hash text,
  user_agent_hash text,
  referer text,
  target_url text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, dedupe_key)
);

create index if not exists email_tracking_events_queue_idx
  on public.email_tracking_events (organization_id, queue_item_id, event_type, occurred_at desc);

create index if not exists email_tracking_events_campaign_idx
  on public.email_tracking_events (organization_id, campaign_execution_id, event_type, occurred_at desc);

alter table public.email_tracking_events enable row level security;

create policy "email_tracking_events_select"
  on public.email_tracking_events for select
  to authenticated using (public.is_org_member(organization_id));

create table if not exists public.email_message_engagement_status (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  queue_item_id uuid not null references public.email_queue (id) on delete cascade,
  rendered_message_id uuid references public.email_rendered_messages (id) on delete set null,
  campaign_id uuid references public.email_campaigns (id) on delete set null,
  campaign_execution_id uuid references public.email_campaign_executions (id) on delete set null,
  enrollment_id uuid references public.email_sequence_enrollments (id) on delete set null,
  step_execution_id uuid references public.email_step_executions (id) on delete set null,
  recipient_id uuid references public.email_recipients (id) on delete set null,
  first_opened_at timestamptz,
  last_opened_at timestamptz,
  total_open_count integer not null default 0,
  unique_open_count integer not null default 0,
  first_clicked_at timestamptz,
  last_clicked_at timestamptz,
  total_click_count integer not null default 0,
  unique_click_count integer not null default 0,
  replied_at timestamptz,
  reply_count integer not null default 0,
  last_reply_provider_event_id uuid references public.email_provider_events (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (queue_item_id)
);

create index if not exists email_message_engagement_status_campaign_idx
  on public.email_message_engagement_status (organization_id, campaign_execution_id, updated_at desc);

create trigger email_message_engagement_status_set_updated_at
before update on public.email_message_engagement_status
for each row execute function public.set_updated_at();

alter table public.email_message_engagement_status enable row level security;

create policy "email_message_engagement_status_select"
  on public.email_message_engagement_status for select
  to authenticated using (public.is_org_member(organization_id));

alter table public.email_campaign_executions
  add column if not exists opened_message_count integer not null default 0,
  add column if not exists unique_opened_message_count integer not null default 0,
  add column if not exists clicked_message_count integer not null default 0,
  add column if not exists unique_clicked_message_count integer not null default 0,
  add column if not exists replied_message_count integer not null default 0;

