-- Storaflow — Integrations Marketplace (Phase 25I)
-- Additive only. Run manually AFTER 20260726000033_ai_copilot.sql
-- Do NOT auto-execute from the app.
-- Do NOT modify migrations 00001–00033.
-- Plugin catalog lives in app code; this stores connections, secrets, sync, webhooks.
-- Idempotent: safe to re-run after partial execution.

-- ---------------------------------------------------------------------------
-- Org connections to marketplace integrations
-- ---------------------------------------------------------------------------

create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  integration_code text not null,
  display_name text,
  status text not null default 'disconnected'
    check (status in (
      'disconnected',
      'pending_auth',
      'connected',
      'error',
      'needs_reauth',
      'disabled'
    )),
  auth_type text not null default 'oauth2'
    check (auth_type in ('oauth2', 'api_key', 'webhook_only', 'custom')),
  account_label text,
  external_account_id text,
  scopes_json jsonb not null default '[]'::jsonb,
  config_json jsonb not null default '{}'::jsonb,
  health_status text not null default 'unknown'
    check (health_status in ('unknown', 'healthy', 'degraded', 'unhealthy')),
  health_message text,
  last_validated_at timestamptz,
  last_synced_at timestamptz,
  next_sync_at timestamptz,
  sync_stats_json jsonb not null default '{}'::jsonb,
  installed_by uuid,
  installed_at timestamptz,
  disconnected_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, integration_code, external_account_id)
);

create index if not exists integration_connections_org_status_idx
  on public.integration_connections (organization_id, status);

create index if not exists integration_connections_org_code_idx
  on public.integration_connections (organization_id, integration_code);

drop trigger if exists integration_connections_set_updated_at on public.integration_connections;
create trigger integration_connections_set_updated_at
before update on public.integration_connections
for each row execute function public.set_updated_at();

alter table public.integration_connections enable row level security;

drop policy if exists "integration_connections_select" on public.integration_connections;
create policy "integration_connections_select"
  on public.integration_connections for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "integration_connections_write" on public.integration_connections;
create policy "integration_connections_write"
  on public.integration_connections for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Encrypted credentials (never returned to clients)
-- ciphertext_base64 = AES-GCM payload produced by app crypto helper
-- ---------------------------------------------------------------------------

create table if not exists public.integration_credentials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  connection_id uuid not null references public.integration_connections (id) on delete cascade,
  credential_kind text not null
    check (credential_kind in (
      'access_token',
      'refresh_token',
      'api_key',
      'client_secret',
      'webhook_secret',
      'other'
    )),
  ciphertext_base64 text not null,
  iv_base64 text not null,
  auth_tag_base64 text not null,
  key_version integer not null default 1,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (connection_id, credential_kind)
);

create index if not exists integration_credentials_org_idx
  on public.integration_credentials (organization_id);

drop trigger if exists integration_credentials_set_updated_at on public.integration_credentials;
create trigger integration_credentials_set_updated_at
before update on public.integration_credentials
for each row execute function public.set_updated_at();

alter table public.integration_credentials enable row level security;

-- Members can see that a credential exists (no ciphertext via select of metadata only
-- through a view would be ideal; RLS still blocks non-admins from reading rows if we
-- restrict select to owners/admins for credential table entirely.
drop policy if exists "integration_credentials_admin" on public.integration_credentials;
create policy "integration_credentials_admin"
  on public.integration_credentials for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Sync runs + history
-- ---------------------------------------------------------------------------

create table if not exists public.integration_sync_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  connection_id uuid not null references public.integration_connections (id) on delete cascade,
  sync_mode text not null default 'manual'
    check (sync_mode in ('manual', 'scheduled', 'incremental', 'full', 'webhook')),
  status text not null default 'queued'
    check (status in (
      'queued',
      'running',
      'completed',
      'failed',
      'cancelled',
      'partial'
    )),
  direction text not null default 'import'
    check (direction in ('import', 'export', 'bidirectional')),
  started_at timestamptz,
  finished_at timestamptz,
  duration_ms integer,
  records_imported integer not null default 0,
  records_exported integer not null default 0,
  error_count integer not null default 0,
  warning_count integer not null default 0,
  error_code text,
  error_message text,
  cursor_json jsonb not null default '{}'::jsonb,
  stats_json jsonb not null default '{}'::jsonb,
  retry_count integer not null default 0,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists integration_sync_runs_org_idx
  on public.integration_sync_runs (organization_id, created_at desc);

create index if not exists integration_sync_runs_connection_idx
  on public.integration_sync_runs (connection_id, created_at desc);

create index if not exists integration_sync_runs_queue_idx
  on public.integration_sync_runs (organization_id, created_at)
  where status in ('queued', 'running');

alter table public.integration_sync_runs enable row level security;

drop policy if exists "integration_sync_runs_select" on public.integration_sync_runs;
create policy "integration_sync_runs_select"
  on public.integration_sync_runs for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "integration_sync_runs_write" on public.integration_sync_runs;
create policy "integration_sync_runs_write"
  on public.integration_sync_runs for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

create table if not exists public.integration_sync_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  sync_run_id uuid not null references public.integration_sync_runs (id) on delete cascade,
  level text not null default 'info'
    check (level in ('info', 'warning', 'error')),
  code text,
  message text not null,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists integration_sync_events_run_idx
  on public.integration_sync_events (sync_run_id, created_at);

alter table public.integration_sync_events enable row level security;

drop policy if exists "integration_sync_events_select" on public.integration_sync_events;
create policy "integration_sync_events_select"
  on public.integration_sync_events for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "integration_sync_events_write" on public.integration_sync_events;
create policy "integration_sync_events_write"
  on public.integration_sync_events for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Webhooks (incoming / outgoing) — architecture ready
-- ---------------------------------------------------------------------------

create table if not exists public.integration_webhooks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  connection_id uuid references public.integration_connections (id) on delete set null,
  direction text not null check (direction in ('incoming', 'outgoing')),
  endpoint_url text,
  event_types_json jsonb not null default '[]'::jsonb,
  status text not null default 'active'
    check (status in ('active', 'paused', 'disabled')),
  signature_algo text not null default 'hmac_sha256',
  secret_credential_id uuid references public.integration_credentials (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists integration_webhooks_org_idx
  on public.integration_webhooks (organization_id, direction, status);

drop trigger if exists integration_webhooks_set_updated_at on public.integration_webhooks;
create trigger integration_webhooks_set_updated_at
before update on public.integration_webhooks
for each row execute function public.set_updated_at();

alter table public.integration_webhooks enable row level security;

drop policy if exists "integration_webhooks_select" on public.integration_webhooks;
create policy "integration_webhooks_select"
  on public.integration_webhooks for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "integration_webhooks_write" on public.integration_webhooks;
create policy "integration_webhooks_write"
  on public.integration_webhooks for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

create table if not exists public.integration_webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  webhook_id uuid not null references public.integration_webhooks (id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'delivered', 'failed', 'retrying')),
  http_status integer,
  attempt_count integer not null default 0,
  error_message text,
  payload_json jsonb not null default '{}'::jsonb,
  signature_valid boolean,
  next_retry_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  delivered_at timestamptz
);

create index if not exists integration_webhook_deliveries_retry_idx
  on public.integration_webhook_deliveries (organization_id, next_retry_at)
  where status in ('queued', 'retrying');

alter table public.integration_webhook_deliveries enable row level security;

drop policy if exists "integration_webhook_deliveries_select" on public.integration_webhook_deliveries;
create policy "integration_webhook_deliveries_select"
  on public.integration_webhook_deliveries for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "integration_webhook_deliveries_write" on public.integration_webhook_deliveries;
create policy "integration_webhook_deliveries_write"
  on public.integration_webhook_deliveries for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Audit log for connection changes
-- ---------------------------------------------------------------------------

create table if not exists public.integration_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  connection_id uuid references public.integration_connections (id) on delete set null,
  actor_user_id uuid,
  event_type text not null,
  message text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists integration_audit_events_org_idx
  on public.integration_audit_events (organization_id, created_at desc);

alter table public.integration_audit_events enable row level security;

drop policy if exists "integration_audit_events_select" on public.integration_audit_events;
create policy "integration_audit_events_select"
  on public.integration_audit_events for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "integration_audit_events_insert" on public.integration_audit_events;
create policy "integration_audit_events_insert"
  on public.integration_audit_events for insert
  to authenticated with check (public.is_org_owner_or_admin(organization_id));
