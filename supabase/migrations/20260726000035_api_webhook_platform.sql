-- Storaflow — API & Webhook Platform (Phase 26B)
-- Additive only. Run manually AFTER 20260726000034_integrations_marketplace.sql
-- Do NOT auto-execute from the app.
-- Do NOT modify migrations 00001–00034.
-- Distinct from integration_* marketplace tables (inbound connectors).
-- Idempotent: safe to re-run after partial execution.

-- ---------------------------------------------------------------------------
-- API keys (hash only — plaintext shown once at creation)
-- ---------------------------------------------------------------------------

create table if not exists public.platform_api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null,
  permission_tier text not null default 'read_only'
    check (permission_tier in ('read_only', 'read_write', 'admin', 'custom')),
  scopes_json jsonb not null default '[]'::jsonb,
  status text not null default 'active'
    check (status in ('active', 'revoked', 'expired', 'rotated')),
  expires_at timestamptz,
  last_used_at timestamptz,
  created_by uuid,
  revoked_at timestamptz,
  revoked_by uuid,
  rate_limit_per_minute integer not null default 60,
  rate_limit_per_day integer not null default 10000,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, key_hash)
);

create index if not exists platform_api_keys_org_status_idx
  on public.platform_api_keys (organization_id, status);

create index if not exists platform_api_keys_hash_idx
  on public.platform_api_keys (key_hash)
  where status = 'active';

drop trigger if exists platform_api_keys_set_updated_at on public.platform_api_keys;
create trigger platform_api_keys_set_updated_at
before update on public.platform_api_keys
for each row execute function public.set_updated_at();

alter table public.platform_api_keys enable row level security;

drop policy if exists "platform_api_keys_select" on public.platform_api_keys;
create policy "platform_api_keys_select"
  on public.platform_api_keys for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "platform_api_keys_write" on public.platform_api_keys;
create policy "platform_api_keys_write"
  on public.platform_api_keys for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

create table if not exists public.platform_api_key_rotations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  api_key_id uuid not null references public.platform_api_keys (id) on delete cascade,
  previous_key_prefix text not null,
  rotated_by uuid,
  reason text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists platform_api_key_rotations_key_idx
  on public.platform_api_key_rotations (api_key_id, created_at desc);

alter table public.platform_api_key_rotations enable row level security;

drop policy if exists "platform_api_key_rotations_select" on public.platform_api_key_rotations;
create policy "platform_api_key_rotations_select"
  on public.platform_api_key_rotations for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "platform_api_key_rotations_write" on public.platform_api_key_rotations;
create policy "platform_api_key_rotations_write"
  on public.platform_api_key_rotations for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Request logs + daily usage (rate limits / observability)
-- ---------------------------------------------------------------------------

create table if not exists public.platform_api_request_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  api_key_id uuid references public.platform_api_keys (id) on delete set null,
  request_id text not null,
  method text not null,
  path text not null,
  status_code integer not null,
  latency_ms integer,
  error_code text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists platform_api_request_logs_org_idx
  on public.platform_api_request_logs (organization_id, created_at desc);

create index if not exists platform_api_request_logs_key_idx
  on public.platform_api_request_logs (api_key_id, created_at desc);

alter table public.platform_api_request_logs enable row level security;

drop policy if exists "platform_api_request_logs_select" on public.platform_api_request_logs;
create policy "platform_api_request_logs_select"
  on public.platform_api_request_logs for select
  to authenticated using (public.is_org_member(organization_id));

-- Inserts typically via service role from API handlers
drop policy if exists "platform_api_request_logs_insert" on public.platform_api_request_logs;
create policy "platform_api_request_logs_insert"
  on public.platform_api_request_logs for insert
  to authenticated with check (public.is_org_owner_or_admin(organization_id));

create table if not exists public.platform_api_usage_daily (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  api_key_id uuid references public.platform_api_keys (id) on delete cascade,
  usage_date date not null,
  request_count integer not null default 0,
  error_count integer not null default 0,
  rate_limit_429_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, api_key_id, usage_date)
);

create index if not exists platform_api_usage_daily_org_idx
  on public.platform_api_usage_daily (organization_id, usage_date desc);

drop trigger if exists platform_api_usage_daily_set_updated_at on public.platform_api_usage_daily;
create trigger platform_api_usage_daily_set_updated_at
before update on public.platform_api_usage_daily
for each row execute function public.set_updated_at();

alter table public.platform_api_usage_daily enable row level security;

drop policy if exists "platform_api_usage_daily_select" on public.platform_api_usage_daily;
create policy "platform_api_usage_daily_select"
  on public.platform_api_usage_daily for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "platform_api_usage_daily_write" on public.platform_api_usage_daily;
create policy "platform_api_usage_daily_write"
  on public.platform_api_usage_daily for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Outbound platform webhooks (customer endpoints)
-- ---------------------------------------------------------------------------

create table if not exists public.platform_webhooks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  target_url text not null,
  status text not null default 'active'
    check (status in ('active', 'paused', 'disabled')),
  event_types_json jsonb not null default '[]'::jsonb,
  secret_ciphertext_base64 text,
  secret_iv_base64 text,
  secret_auth_tag_base64 text,
  secret_key_version integer not null default 1,
  secret_prefix text,
  https_only boolean not null default true,
  ip_allowlist_json jsonb not null default '[]'::jsonb,
  timestamp_tolerance_seconds integer not null default 300,
  created_by uuid,
  last_delivery_at timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists platform_webhooks_org_status_idx
  on public.platform_webhooks (organization_id, status);

drop trigger if exists platform_webhooks_set_updated_at on public.platform_webhooks;
create trigger platform_webhooks_set_updated_at
before update on public.platform_webhooks
for each row execute function public.set_updated_at();

alter table public.platform_webhooks enable row level security;

drop policy if exists "platform_webhooks_select" on public.platform_webhooks;
create policy "platform_webhooks_select"
  on public.platform_webhooks for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "platform_webhooks_write" on public.platform_webhooks;
create policy "platform_webhooks_write"
  on public.platform_webhooks for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

create table if not exists public.platform_webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  webhook_id uuid not null references public.platform_webhooks (id) on delete cascade,
  event_type text not null,
  event_id text not null,
  status text not null default 'queued'
    check (status in ('queued', 'delivered', 'failed', 'retrying', 'cancelled')),
  attempt_count integer not null default 0,
  http_status integer,
  duration_ms integer,
  payload_size_bytes integer,
  response_body_preview text,
  error_message text,
  next_retry_at timestamptz,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  delivered_at timestamptz
);

create index if not exists platform_webhook_deliveries_org_idx
  on public.platform_webhook_deliveries (organization_id, created_at desc);

create index if not exists platform_webhook_deliveries_retry_idx
  on public.platform_webhook_deliveries (organization_id, next_retry_at)
  where status in ('queued', 'retrying');

alter table public.platform_webhook_deliveries enable row level security;

drop policy if exists "platform_webhook_deliveries_select" on public.platform_webhook_deliveries;
create policy "platform_webhook_deliveries_select"
  on public.platform_webhook_deliveries for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "platform_webhook_deliveries_write" on public.platform_webhook_deliveries;
create policy "platform_webhook_deliveries_write"
  on public.platform_webhook_deliveries for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Audit + internal event outbox
-- ---------------------------------------------------------------------------

create table if not exists public.platform_api_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_user_id uuid,
  api_key_id uuid references public.platform_api_keys (id) on delete set null,
  event_type text not null,
  message text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists platform_api_audit_events_org_idx
  on public.platform_api_audit_events (organization_id, created_at desc);

alter table public.platform_api_audit_events enable row level security;

drop policy if exists "platform_api_audit_events_select" on public.platform_api_audit_events;
create policy "platform_api_audit_events_select"
  on public.platform_api_audit_events for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "platform_api_audit_events_insert" on public.platform_api_audit_events;
create policy "platform_api_audit_events_insert"
  on public.platform_api_audit_events for insert
  to authenticated with check (public.is_org_owner_or_admin(organization_id));

create table if not exists public.platform_event_outbox (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  event_type text not null,
  event_id text not null,
  payload_json jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'published', 'failed')),
  published_at timestamptz,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, event_id)
);

create index if not exists platform_event_outbox_pending_idx
  on public.platform_event_outbox (organization_id, created_at)
  where status = 'pending';

alter table public.platform_event_outbox enable row level security;

drop policy if exists "platform_event_outbox_select" on public.platform_event_outbox;
create policy "platform_event_outbox_select"
  on public.platform_event_outbox for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "platform_event_outbox_write" on public.platform_event_outbox;
create policy "platform_event_outbox_write"
  on public.platform_event_outbox for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));
