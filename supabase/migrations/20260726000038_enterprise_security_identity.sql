-- Storaflow — Enterprise Security & Identity Platform (Phase 26E)
-- Additive only. Run manually AFTER 20260726000037_team_collaboration_platform.sql
-- Do NOT auto-execute from the app.
-- Do NOT modify migrations 00001–00037.
-- Org-scoped security; RLS isolation. Idempotent.

-- ---------------------------------------------------------------------------
-- Extend organization_role for least-privilege members/viewers
-- ---------------------------------------------------------------------------

do $$ begin
  alter type public.organization_role add value if not exists 'member';
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type public.organization_role add value if not exists 'viewer';
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Organization security / access / password policies
-- ---------------------------------------------------------------------------

create table if not exists public.security_organization_policies (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  force_mfa boolean not null default false,
  allow_password_login boolean not null default true,
  allow_passwordless boolean not null default false,
  allow_magic_link boolean not null default false,
  allow_passkeys boolean not null default false,
  allow_oauth boolean not null default false,
  session_timeout_minutes integer not null default 10080
    check (session_timeout_minutes between 15 and 525600),
  idle_timeout_minutes integer not null default 480
    check (idle_timeout_minutes between 5 and 10080),
  max_sessions integer not null default 10
    check (max_sessions between 1 and 100),
  allowed_ip_cidrs jsonb not null default '[]'::jsonb,
  allowed_login_hours_json jsonb not null default '{"enabled":false,"timezone":"UTC","windows":[]}'::jsonb,
  allowed_countries_json jsonb not null default '[]'::jsonb,
  password_min_length integer not null default 8
    check (password_min_length between 8 and 128),
  password_require_upper boolean not null default true,
  password_require_lower boolean not null default true,
  password_require_number boolean not null default true,
  password_require_symbol boolean not null default false,
  password_expiration_days integer
    check (password_expiration_days is null or password_expiration_days between 1 and 730),
  password_history_count integer not null default 0
    check (password_history_count between 0 and 24),
  failed_login_threshold integer not null default 5
    check (failed_login_threshold between 3 and 50),
  lockout_minutes integer not null default 15
    check (lockout_minutes between 1 and 1440),
  remember_device_days integer not null default 30
    check (remember_device_days between 1 and 365),
  future_ldap_ready boolean not null default false,
  future_ad_ready boolean not null default false,
  updated_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists security_organization_policies_set_updated_at
  on public.security_organization_policies;
create trigger security_organization_policies_set_updated_at
before update on public.security_organization_policies
for each row execute function public.set_updated_at();

alter table public.security_organization_policies enable row level security;

drop policy if exists "security_organization_policies_select" on public.security_organization_policies;
create policy "security_organization_policies_select"
  on public.security_organization_policies for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "security_organization_policies_write" on public.security_organization_policies;
create policy "security_organization_policies_write"
  on public.security_organization_policies for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- App-level sessions (Supabase auth session tracking overlay)
-- ---------------------------------------------------------------------------

create table if not exists public.security_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  user_id uuid not null,
  session_token_hash text not null,
  browser text,
  operating_system text,
  device_name text,
  ip_address text,
  country_code text,
  user_agent text,
  login_at timestamptz not null default timezone('utc', now()),
  last_activity_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoke_reason text,
  is_current boolean not null default false,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists security_sessions_user_idx
  on public.security_sessions (user_id, revoked_at, last_activity_at desc);

create index if not exists security_sessions_org_idx
  on public.security_sessions (organization_id, login_at desc)
  where organization_id is not null;

alter table public.security_sessions enable row level security;

drop policy if exists "security_sessions_select_own" on public.security_sessions;
create policy "security_sessions_select_own"
  on public.security_sessions for select
  to authenticated using (
    user_id = auth.uid()
    or (organization_id is not null and public.is_org_owner_or_admin(organization_id))
  );

drop policy if exists "security_sessions_insert_own" on public.security_sessions;
create policy "security_sessions_insert_own"
  on public.security_sessions for insert
  to authenticated with check (user_id = auth.uid());

drop policy if exists "security_sessions_update" on public.security_sessions;
create policy "security_sessions_update"
  on public.security_sessions for update
  to authenticated using (
    user_id = auth.uid()
    or (organization_id is not null and public.is_org_owner_or_admin(organization_id))
  )
  with check (
    user_id = auth.uid()
    or (organization_id is not null and public.is_org_owner_or_admin(organization_id))
  );

-- ---------------------------------------------------------------------------
-- Trusted devices
-- ---------------------------------------------------------------------------

create table if not exists public.security_devices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  user_id uuid not null,
  device_fingerprint text not null,
  device_name text not null default 'Unknown device',
  browser text,
  platform text,
  is_trusted boolean not null default false,
  first_seen_at timestamptz not null default timezone('utc', now()),
  last_used_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  unique (user_id, device_fingerprint)
);

create index if not exists security_devices_user_idx
  on public.security_devices (user_id, revoked_at);

alter table public.security_devices enable row level security;

drop policy if exists "security_devices_select" on public.security_devices;
create policy "security_devices_select"
  on public.security_devices for select
  to authenticated using (
    user_id = auth.uid()
    or (organization_id is not null and public.is_org_owner_or_admin(organization_id))
  );

drop policy if exists "security_devices_write" on public.security_devices;
create policy "security_devices_write"
  on public.security_devices for all
  to authenticated using (
    user_id = auth.uid()
    or (organization_id is not null and public.is_org_owner_or_admin(organization_id))
  )
  with check (
    user_id = auth.uid()
    or (organization_id is not null and public.is_org_owner_or_admin(organization_id))
  );

-- ---------------------------------------------------------------------------
-- MFA settings + recovery codes
-- ---------------------------------------------------------------------------

create table if not exists public.security_mfa_settings (
  user_id uuid primary key,
  organization_id uuid references public.organizations (id) on delete set null,
  mfa_enabled boolean not null default false,
  totp_enabled boolean not null default false,
  totp_secret_encrypted text,
  email_backup_enabled boolean not null default false,
  sms_ready boolean not null default false,
  enabled_at timestamptz,
  disabled_at timestamptz,
  last_verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists security_mfa_settings_set_updated_at on public.security_mfa_settings;
create trigger security_mfa_settings_set_updated_at
before update on public.security_mfa_settings
for each row execute function public.set_updated_at();

alter table public.security_mfa_settings enable row level security;

drop policy if exists "security_mfa_settings_select" on public.security_mfa_settings;
create policy "security_mfa_settings_select"
  on public.security_mfa_settings for select
  to authenticated using (
    user_id = auth.uid()
    or (organization_id is not null and public.is_org_owner_or_admin(organization_id))
  );

drop policy if exists "security_mfa_settings_write" on public.security_mfa_settings;
create policy "security_mfa_settings_write"
  on public.security_mfa_settings for all
  to authenticated using (
    user_id = auth.uid()
    or (organization_id is not null and public.is_org_owner_or_admin(organization_id))
  )
  with check (
    user_id = auth.uid()
    or (organization_id is not null and public.is_org_owner_or_admin(organization_id))
  );

create table if not exists public.security_mfa_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.security_mfa_settings (user_id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists security_mfa_recovery_codes_user_idx
  on public.security_mfa_recovery_codes (user_id, used_at);

alter table public.security_mfa_recovery_codes enable row level security;

drop policy if exists "security_mfa_recovery_codes_own" on public.security_mfa_recovery_codes;
create policy "security_mfa_recovery_codes_own"
  on public.security_mfa_recovery_codes for all
  to authenticated using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- SSO identity providers (per organization)
-- ---------------------------------------------------------------------------

create table if not exists public.security_sso_providers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  provider_type text not null
    check (provider_type in (
      'saml',
      'oidc',
      'google_workspace',
      'entra_id',
      'okta',
      'auth0',
      'onelogin',
      'ldap',
      'active_directory',
      'custom'
    )),
  display_name text not null,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'disabled')),
  issuer text,
  client_id text,
  metadata_url text,
  metadata_json jsonb not null default '{}'::jsonb,
  attribute_mapping_json jsonb not null default '{}'::jsonb,
  enforced boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists security_sso_providers_org_idx
  on public.security_sso_providers (organization_id, status);

drop trigger if exists security_sso_providers_set_updated_at on public.security_sso_providers;
create trigger security_sso_providers_set_updated_at
before update on public.security_sso_providers
for each row execute function public.set_updated_at();

alter table public.security_sso_providers enable row level security;

drop policy if exists "security_sso_providers_select" on public.security_sso_providers;
create policy "security_sso_providers_select"
  on public.security_sso_providers for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "security_sso_providers_write" on public.security_sso_providers;
create policy "security_sso_providers_write"
  on public.security_sso_providers for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Custom roles + granular permissions
-- ---------------------------------------------------------------------------

create table if not exists public.security_custom_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  code text not null,
  name text not null,
  description text not null default '',
  is_template boolean not null default false,
  inherits_from uuid references public.security_custom_roles (id) on delete set null,
  permissions_json jsonb not null default '{}'::jsonb,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, code)
);

create index if not exists security_custom_roles_org_idx
  on public.security_custom_roles (organization_id, status);

drop trigger if exists security_custom_roles_set_updated_at on public.security_custom_roles;
create trigger security_custom_roles_set_updated_at
before update on public.security_custom_roles
for each row execute function public.set_updated_at();

alter table public.security_custom_roles enable row level security;

drop policy if exists "security_custom_roles_select" on public.security_custom_roles;
create policy "security_custom_roles_select"
  on public.security_custom_roles for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "security_custom_roles_write" on public.security_custom_roles;
create policy "security_custom_roles_write"
  on public.security_custom_roles for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

create table if not exists public.security_member_role_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null,
  custom_role_id uuid not null references public.security_custom_roles (id) on delete cascade,
  assigned_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, user_id, custom_role_id)
);

alter table public.security_member_role_assignments enable row level security;

drop policy if exists "security_member_role_assignments_select" on public.security_member_role_assignments;
create policy "security_member_role_assignments_select"
  on public.security_member_role_assignments for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "security_member_role_assignments_write" on public.security_member_role_assignments;
create policy "security_member_role_assignments_write"
  on public.security_member_role_assignments for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Login attempts + security alerts + enterprise audit
-- ---------------------------------------------------------------------------

create table if not exists public.security_login_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete set null,
  email text,
  user_id uuid,
  success boolean not null default false,
  failure_reason text,
  ip_address text,
  user_agent text,
  device_fingerprint text,
  country_code text,
  is_suspicious boolean not null default false,
  suspicion_flags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists security_login_attempts_email_idx
  on public.security_login_attempts (email, created_at desc);

create index if not exists security_login_attempts_org_idx
  on public.security_login_attempts (organization_id, created_at desc)
  where organization_id is not null;

alter table public.security_login_attempts enable row level security;

drop policy if exists "security_login_attempts_select" on public.security_login_attempts;
create policy "security_login_attempts_select"
  on public.security_login_attempts for select
  to authenticated using (
    user_id = auth.uid()
    or (organization_id is not null and public.is_org_owner_or_admin(organization_id))
  );

-- Inserts often happen pre-auth — allow authenticated insert of own attempts;
-- service role / app uses authenticated session after login or anon via RPC later.
drop policy if exists "security_login_attempts_insert" on public.security_login_attempts;
create policy "security_login_attempts_insert"
  on public.security_login_attempts for insert
  to authenticated with check (true);

create table if not exists public.security_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  alert_type text not null,
  severity text not null default 'medium'
    check (severity in ('low', 'medium', 'high', 'critical')),
  title text not null,
  body text not null default '',
  entity_type text,
  entity_id uuid,
  status text not null default 'open'
    check (status in ('open', 'acknowledged', 'resolved', 'dismissed')),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  resolved_by uuid
);

create index if not exists security_alerts_org_idx
  on public.security_alerts (organization_id, status, created_at desc);

alter table public.security_alerts enable row level security;

drop policy if exists "security_alerts_select" on public.security_alerts;
create policy "security_alerts_select"
  on public.security_alerts for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "security_alerts_write" on public.security_alerts;
create policy "security_alerts_write"
  on public.security_alerts for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

create table if not exists public.security_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  actor_user_id uuid,
  action text not null,
  entity_type text,
  entity_id uuid,
  description text not null default '',
  ip_address text,
  user_agent text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists security_audit_events_org_idx
  on public.security_audit_events (organization_id, created_at desc);

create index if not exists security_audit_events_action_idx
  on public.security_audit_events (organization_id, action, created_at desc);

alter table public.security_audit_events enable row level security;

drop policy if exists "security_audit_events_select" on public.security_audit_events;
create policy "security_audit_events_select"
  on public.security_audit_events for select
  to authenticated using (
    organization_id is null and actor_user_id = auth.uid()
    or (organization_id is not null and public.is_org_member(organization_id))
  );

drop policy if exists "security_audit_events_insert" on public.security_audit_events;
create policy "security_audit_events_insert"
  on public.security_audit_events for insert
  to authenticated with check (
    actor_user_id = auth.uid()
    or (organization_id is not null and public.is_org_member(organization_id))
  );

-- ---------------------------------------------------------------------------
-- Account locks (admin tools)
-- ---------------------------------------------------------------------------

create table if not exists public.security_account_locks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null,
  reason text not null default '',
  locked_by uuid,
  locked_at timestamptz not null default timezone('utc', now()),
  unlock_at timestamptz,
  unlocked_at timestamptz,
  unlocked_by uuid,
  unique (organization_id, user_id)
);

alter table public.security_account_locks enable row level security;

drop policy if exists "security_account_locks_select" on public.security_account_locks;
create policy "security_account_locks_select"
  on public.security_account_locks for select
  to authenticated using (
    user_id = auth.uid()
    or public.is_org_owner_or_admin(organization_id)
  );

drop policy if exists "security_account_locks_write" on public.security_account_locks;
create policy "security_account_locks_write"
  on public.security_account_locks for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Consent / data processing log scaffolding (GDPR ready)
-- ---------------------------------------------------------------------------

create table if not exists public.security_data_processing_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_user_id uuid,
  processing_purpose text not null,
  legal_basis text,
  data_categories jsonb not null default '[]'::jsonb,
  description text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists security_data_processing_logs_org_idx
  on public.security_data_processing_logs (organization_id, created_at desc);

alter table public.security_data_processing_logs enable row level security;

drop policy if exists "security_data_processing_logs_select" on public.security_data_processing_logs;
create policy "security_data_processing_logs_select"
  on public.security_data_processing_logs for select
  to authenticated using (public.is_org_owner_or_admin(organization_id));

drop policy if exists "security_data_processing_logs_insert" on public.security_data_processing_logs;
create policy "security_data_processing_logs_insert"
  on public.security_data_processing_logs for insert
  to authenticated with check (public.is_org_member(organization_id));
