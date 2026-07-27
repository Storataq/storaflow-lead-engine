-- Storaflow — Multi-Tenant Administration Platform (Phase 26G)
-- Additive only. Run manually AFTER 20260726000039_billing_subscription_management.sql
-- Do NOT auto-execute from the app.
-- Do NOT modify migrations 00001–00039.
-- Platform-admin tables are NEVER exposed to customer org roles.
-- Idempotent.

-- ---------------------------------------------------------------------------
-- Organization lifecycle columns (additive — soft suspend/archive/delete)
-- ---------------------------------------------------------------------------

alter table public.organizations
  add column if not exists lifecycle_status text not null default 'active';

-- Add check constraint only if missing (idempotent-ish)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'organizations_lifecycle_status_check'
  ) then
    alter table public.organizations
      add constraint organizations_lifecycle_status_check
      check (lifecycle_status in ('active', 'suspended', 'archived', 'deleted'));
  end if;
exception when others then
  null;
end $$;

alter table public.organizations
  add column if not exists suspended_at timestamptz;

alter table public.organizations
  add column if not exists archived_at timestamptz;

alter table public.organizations
  add column if not exists deleted_at timestamptz;

alter table public.organizations
  add column if not exists country text;

alter table public.organizations
  add column if not exists last_activity_at timestamptz;

create index if not exists organizations_lifecycle_status_idx
  on public.organizations (lifecycle_status);

create index if not exists organizations_last_activity_idx
  on public.organizations (last_activity_at desc nulls last);

-- ---------------------------------------------------------------------------
-- Platform admins (never inherit customer org roles)
-- ---------------------------------------------------------------------------

create table if not exists public.platform_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  email text not null,
  display_name text not null default '',
  platform_role text not null default 'platform_admin'
    check (platform_role in (
      'platform_owner',
      'platform_admin',
      'platform_support',
      'platform_readonly'
    )),
  status text not null default 'active'
    check (status in ('active', 'disabled')),
  permissions_json jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists platform_admins_set_updated_at on public.platform_admins;
create trigger platform_admins_set_updated_at
before update on public.platform_admins
for each row execute function public.set_updated_at();

alter table public.platform_admins enable row level security;

-- MUST exist before any RLS policy references it (including platform_admins_*)
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
      and pa.status = 'active'
  );
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

drop policy if exists "platform_admins_select" on public.platform_admins;
create policy "platform_admins_select"
  on public.platform_admins for select
  to authenticated using (user_id = auth.uid() or public.is_platform_admin());

drop policy if exists "platform_admins_write" on public.platform_admins;
create policy "platform_admins_write"
  on public.platform_admins for all
  to authenticated using (false)
  with check (false);

-- ---------------------------------------------------------------------------
-- Platform user controls (cross-tenant; not org RBAC)
-- ---------------------------------------------------------------------------

create table if not exists public.platform_user_controls (
  user_id uuid primary key,
  email text,
  full_name text,
  status text not null default 'active'
    check (status in ('active', 'suspended', 'locked')),
  country text,
  last_login_at timestamptz,
  force_password_reset boolean not null default false,
  mfa_disabled_by_admin boolean not null default false,
  notes text not null default '',
  updated_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists platform_user_controls_set_updated_at on public.platform_user_controls;
create trigger platform_user_controls_set_updated_at
before update on public.platform_user_controls
for each row execute function public.set_updated_at();

alter table public.platform_user_controls enable row level security;

drop policy if exists "platform_user_controls_admin" on public.platform_user_controls;
create policy "platform_user_controls_admin"
  on public.platform_user_controls for all
  to authenticated using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Licenses
-- ---------------------------------------------------------------------------

create table if not exists public.platform_licenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  license_type text not null
    check (license_type in (
      'seat',
      'enterprise',
      'white_label',
      'partner',
      'lifetime',
      'custom'
    )),
  seats integer not null default 0 check (seats >= 0),
  status text not null default 'active'
    check (status in ('active', 'expired', 'revoked', 'pending')),
  starts_at timestamptz,
  ends_at timestamptz,
  contract_reference text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists platform_licenses_org_idx
  on public.platform_licenses (organization_id, status);

drop trigger if exists platform_licenses_set_updated_at on public.platform_licenses;
create trigger platform_licenses_set_updated_at
before update on public.platform_licenses
for each row execute function public.set_updated_at();

alter table public.platform_licenses enable row level security;

drop policy if exists "platform_licenses_admin" on public.platform_licenses;
create policy "platform_licenses_admin"
  on public.platform_licenses for all
  to authenticated using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Feature flags (global + org overrides)
-- ---------------------------------------------------------------------------

create table if not exists public.platform_feature_flags (
  id uuid primary key default gen_random_uuid(),
  flag_key text not null unique,
  name text not null,
  description text not null default '',
  scope text not null default 'global'
    check (scope in ('global', 'organization', 'beta', 'experimental', 'early_access')),
  enabled boolean not null default false,
  emergency_disabled boolean not null default false,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists platform_feature_flags_set_updated_at on public.platform_feature_flags;
create trigger platform_feature_flags_set_updated_at
before update on public.platform_feature_flags
for each row execute function public.set_updated_at();

create table if not exists public.platform_feature_flag_overrides (
  id uuid primary key default gen_random_uuid(),
  flag_id uuid not null references public.platform_feature_flags (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  enabled boolean not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (flag_id, organization_id)
);

alter table public.platform_feature_flags enable row level security;
alter table public.platform_feature_flag_overrides enable row level security;

drop policy if exists "platform_feature_flags_admin" on public.platform_feature_flags;
create policy "platform_feature_flags_admin"
  on public.platform_feature_flags for all
  to authenticated using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "platform_feature_flag_overrides_admin" on public.platform_feature_flag_overrides;
create policy "platform_feature_flag_overrides_admin"
  on public.platform_feature_flag_overrides for all
  to authenticated using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Announcements
-- ---------------------------------------------------------------------------

create table if not exists public.platform_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  announcement_type text not null default 'release'
    check (announcement_type in (
      'maintenance',
      'release_notes',
      'security',
      'feature',
      'general'
    )),
  target_scope text not null default 'all'
    check (target_scope in ('all', 'organizations', 'plans', 'countries')),
  target_json jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'published', 'archived')),
  published_at timestamptz,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists platform_announcements_set_updated_at on public.platform_announcements;
create trigger platform_announcements_set_updated_at
before update on public.platform_announcements
for each row execute function public.set_updated_at();

alter table public.platform_announcements enable row level security;

drop policy if exists "platform_announcements_admin" on public.platform_announcements;
create policy "platform_announcements_admin"
  on public.platform_announcements for all
  to authenticated using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Published announcements readable by org members (optional future UI)
drop policy if exists "platform_announcements_published_read" on public.platform_announcements;
create policy "platform_announcements_published_read"
  on public.platform_announcements for select
  to authenticated using (status = 'published' or public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Impersonation sessions
-- ---------------------------------------------------------------------------

create table if not exists public.platform_impersonation_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null,
  target_organization_id uuid not null references public.organizations (id) on delete cascade,
  target_user_id uuid,
  mode text not null default 'read_only'
    check (mode in ('read_only', 'elevated_support')),
  reason text not null,
  started_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  ended_at timestamptz,
  ip_address text,
  user_agent text,
  metadata_json jsonb not null default '{}'::jsonb
);

create index if not exists platform_impersonation_active_idx
  on public.platform_impersonation_sessions (admin_user_id, ended_at, expires_at);

alter table public.platform_impersonation_sessions enable row level security;

drop policy if exists "platform_impersonation_admin" on public.platform_impersonation_sessions;
create policy "platform_impersonation_admin"
  on public.platform_impersonation_sessions for all
  to authenticated using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Audit + notifications + settings + backup jobs
-- ---------------------------------------------------------------------------

create table if not exists public.platform_audit_events (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid,
  admin_email text,
  action text not null,
  affected_organization_id uuid,
  affected_user_id uuid,
  old_value_json jsonb not null default '{}'::jsonb,
  new_value_json jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  description text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists platform_audit_events_created_idx
  on public.platform_audit_events (created_at desc);

create index if not exists platform_audit_events_org_idx
  on public.platform_audit_events (affected_organization_id, created_at desc);

alter table public.platform_audit_events enable row level security;

drop policy if exists "platform_audit_events_admin" on public.platform_audit_events;
create policy "platform_audit_events_admin"
  on public.platform_audit_events for all
  to authenticated using (public.is_platform_admin())
  with check (public.is_platform_admin());

create table if not exists public.platform_notifications (
  id uuid primary key default gen_random_uuid(),
  notification_type text not null
    check (notification_type in (
      'system_failure',
      'security_incident',
      'billing_failure',
      'provider_downtime',
      'large_import',
      'large_export',
      'platform_update',
      'general'
    )),
  title text not null,
  body text not null default '',
  severity text not null default 'info'
    check (severity in ('info', 'warning', 'critical')),
  is_read boolean not null default false,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists platform_notifications_unread_idx
  on public.platform_notifications (is_read, created_at desc);

alter table public.platform_notifications enable row level security;

drop policy if exists "platform_notifications_admin" on public.platform_notifications;
create policy "platform_notifications_admin"
  on public.platform_notifications for all
  to authenticated using (public.is_platform_admin())
  with check (public.is_platform_admin());

create table if not exists public.platform_settings (
  key text primary key,
  value_json jsonb not null default '{}'::jsonb,
  description text not null default '',
  updated_by uuid,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.platform_settings enable row level security;

drop policy if exists "platform_settings_admin" on public.platform_settings;
create policy "platform_settings_admin"
  on public.platform_settings for all
  to authenticated using (public.is_platform_admin())
  with check (public.is_platform_admin());

create table if not exists public.platform_backup_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete set null,
  job_type text not null
    check (job_type in ('backup', 'restore', 'export', 'import', 'disaster_recovery')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  requested_by uuid,
  artifact_uri text,
  error_message text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

alter table public.platform_backup_jobs enable row level security;

drop policy if exists "platform_backup_jobs_admin" on public.platform_backup_jobs;
create policy "platform_backup_jobs_admin"
  on public.platform_backup_jobs for all
  to authenticated using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Seed defaults
-- ---------------------------------------------------------------------------

insert into public.platform_settings (key, value_json, description) values
  ('trial_length_days', '14'::jsonb, 'Default free trial length'),
  ('maintenance_mode', 'false'::jsonb, 'Global maintenance mode'),
  ('registration_enabled', 'true'::jsonb, 'Allow new organization registration'),
  ('default_limits', '{"max_users":3,"max_companies":1000}'::jsonb, 'Default plan limit hints'),
  ('impersonation_timeout_minutes', '30'::jsonb, 'Impersonation session timeout')
on conflict (key) do nothing;

insert into public.platform_feature_flags (flag_key, name, description, scope, enabled) values
  ('copilot_global', 'AI Copilot', 'Global copilot availability', 'global', true),
  ('marketplace_beta', 'Marketplace beta', 'Beta marketplace access', 'beta', false),
  ('experimental_analytics', 'Experimental analytics', 'Experimental BI widgets', 'experimental', false),
  ('early_access_api_v2', 'API v2 early access', 'Early access for API v2', 'early_access', false),
  ('emergency_send_pause', 'Emergency send pause', 'Emergency disable outbound email', 'global', false)
on conflict (flag_key) do nothing;
