-- Storaflow — Mobile Experience & PWA (Phase 26H)
-- Additive only. Run manually AFTER 20260726000040_multi_tenant_administration.sql
-- Do NOT auto-execute from the app.
-- Do NOT modify migrations 00001–00040.
-- Push subscription scaffolding + offline sync audit. Idempotent.

-- ---------------------------------------------------------------------------
-- Web Push subscriptions (VAPID-ready; no secrets in client)
-- ---------------------------------------------------------------------------

create table if not exists public.pwa_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  device_label text not null default '',
  enabled boolean not null default true,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, endpoint)
);

create index if not exists pwa_push_subscriptions_org_idx
  on public.pwa_push_subscriptions (organization_id, enabled);

alter table public.pwa_push_subscriptions enable row level security;

drop policy if exists "pwa_push_subscriptions_select" on public.pwa_push_subscriptions;
create policy "pwa_push_subscriptions_select"
  on public.pwa_push_subscriptions for select
  to authenticated using (
    user_id = auth.uid() and public.is_org_member(organization_id)
  );

drop policy if exists "pwa_push_subscriptions_write" on public.pwa_push_subscriptions;
create policy "pwa_push_subscriptions_write"
  on public.pwa_push_subscriptions for all
  to authenticated using (
    user_id = auth.uid() and public.is_org_member(organization_id)
  )
  with check (
    user_id = auth.uid() and public.is_org_member(organization_id)
  );

-- ---------------------------------------------------------------------------
-- Offline action queue (server-side sync log / conflict resolution scaffold)
-- Client IndexedDB is primary; this table receives flushed items.
-- ---------------------------------------------------------------------------

create table if not exists public.pwa_offline_sync_queue (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null,
  client_id text not null,
  action_type text not null
    check (action_type in (
      'company_create',
      'contact_create',
      'task_create',
      'task_update',
      'note_create',
      'activity_create',
      'comment_create',
      'ai_request_queue',
      'custom'
    )),
  payload_json jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed', 'conflict')),
  error_message text,
  conflict_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz,
  unique (organization_id, client_id)
);

create index if not exists pwa_offline_sync_queue_pending_idx
  on public.pwa_offline_sync_queue (organization_id, status, created_at);

alter table public.pwa_offline_sync_queue enable row level security;

drop policy if exists "pwa_offline_sync_queue_select" on public.pwa_offline_sync_queue;
create policy "pwa_offline_sync_queue_select"
  on public.pwa_offline_sync_queue for select
  to authenticated using (
    user_id = auth.uid() and public.is_org_member(organization_id)
  );

drop policy if exists "pwa_offline_sync_queue_write" on public.pwa_offline_sync_queue;
create policy "pwa_offline_sync_queue_write"
  on public.pwa_offline_sync_queue for all
  to authenticated using (
    user_id = auth.uid() and public.is_org_member(organization_id)
  )
  with check (
    user_id = auth.uid() and public.is_org_member(organization_id)
  );

-- ---------------------------------------------------------------------------
-- Push notification preference catalog (types prepared for Web Push)
-- ---------------------------------------------------------------------------

create table if not exists public.pwa_notification_preferences (
  user_id uuid not null,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  notification_type text not null
    check (notification_type in (
      'task_reminder',
      'campaign_finished',
      'automation_failed',
      'lead_alert',
      'deal_won',
      'deal_lost',
      'mention',
      'security_alert',
      'billing_alert'
    )),
  push_enabled boolean not null default true,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, organization_id, notification_type)
);

alter table public.pwa_notification_preferences enable row level security;

drop policy if exists "pwa_notification_preferences_own" on public.pwa_notification_preferences;
create policy "pwa_notification_preferences_own"
  on public.pwa_notification_preferences for all
  to authenticated using (
    user_id = auth.uid() and public.is_org_member(organization_id)
  )
  with check (
    user_id = auth.uid() and public.is_org_member(organization_id)
  );
