-- Storaflow — White Label Platform (Phase 26C)
-- Additive only. Run manually AFTER 20260726000035_api_webhook_platform.sql
-- Do NOT auto-execute from the app.
-- Do NOT modify migrations 00001–00035.
-- Org-scoped branding; isolated tenants. Idempotent.

-- ---------------------------------------------------------------------------
-- Per-organization white label configuration
-- ---------------------------------------------------------------------------

create table if not exists public.organization_white_label (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  config_json jsonb not null default '{}'::jsonb,
  theme_cache_json jsonb not null default '{}'::jsonb,
  status text not null default 'active'
    check (status in ('active', 'draft', 'disabled')),
  updated_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists organization_white_label_set_updated_at on public.organization_white_label;
create trigger organization_white_label_set_updated_at
before update on public.organization_white_label
for each row execute function public.set_updated_at();

alter table public.organization_white_label enable row level security;

drop policy if exists "organization_white_label_select" on public.organization_white_label;
create policy "organization_white_label_select"
  on public.organization_white_label for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "organization_white_label_write" on public.organization_white_label;
create policy "organization_white_label_write"
  on public.organization_white_label for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Brand assets metadata (URL or small data URLs; storage bucket later)
-- ---------------------------------------------------------------------------

create table if not exists public.organization_white_label_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  slot text not null
    check (slot in (
      'primary_logo',
      'dark_logo',
      'light_logo',
      'favicon',
      'app_icon',
      'mobile_icon',
      'email_logo',
      'loading_logo',
      'login_logo',
      'sidebar_logo',
      'small_logo',
      'login_background',
      'login_hero'
    )),
  content_type text not null,
  byte_size integer not null default 0,
  width_px integer,
  height_px integer,
  public_url text,
  data_url text,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, slot)
);

create index if not exists organization_white_label_assets_org_idx
  on public.organization_white_label_assets (organization_id);

drop trigger if exists organization_white_label_assets_set_updated_at on public.organization_white_label_assets;
create trigger organization_white_label_assets_set_updated_at
before update on public.organization_white_label_assets
for each row execute function public.set_updated_at();

alter table public.organization_white_label_assets enable row level security;

drop policy if exists "organization_white_label_assets_select" on public.organization_white_label_assets;
create policy "organization_white_label_assets_select"
  on public.organization_white_label_assets for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "organization_white_label_assets_write" on public.organization_white_label_assets;
create policy "organization_white_label_assets_write"
  on public.organization_white_label_assets for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Custom domains (DNS / SSL ready)
-- ---------------------------------------------------------------------------

create table if not exists public.organization_custom_domains (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  hostname text not null,
  is_primary boolean not null default false,
  status text not null default 'pending_dns'
    check (status in (
      'pending_dns',
      'dns_verified',
      'ssl_pending',
      'active',
      'disabled',
      'failed'
    )),
  ssl_status text not null default 'not_started'
    check (ssl_status in ('not_started', 'pending', 'issued', 'expired', 'failed')),
  dns_validation_token text not null,
  verified_at timestamptz,
  last_checked_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (hostname)
);

create index if not exists organization_custom_domains_org_idx
  on public.organization_custom_domains (organization_id, status);

drop trigger if exists organization_custom_domains_set_updated_at on public.organization_custom_domains;
create trigger organization_custom_domains_set_updated_at
before update on public.organization_custom_domains
for each row execute function public.set_updated_at();

alter table public.organization_custom_domains enable row level security;

drop policy if exists "organization_custom_domains_select" on public.organization_custom_domains;
create policy "organization_custom_domains_select"
  on public.organization_custom_domains for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "organization_custom_domains_write" on public.organization_custom_domains;
create policy "organization_custom_domains_write"
  on public.organization_custom_domains for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Partner portal scaffolding (multi-brand / agency)
-- ---------------------------------------------------------------------------

create table if not exists public.partner_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  code text not null,
  name text not null,
  status text not null default 'active'
    check (status in ('active', 'paused', 'disabled')),
  branding_json jsonb not null default '{}'::jsonb,
  stats_json jsonb not null default '{}'::jsonb,
  license_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, code)
);

create index if not exists partner_accounts_org_idx
  on public.partner_accounts (organization_id, status);

drop trigger if exists partner_accounts_set_updated_at on public.partner_accounts;
create trigger partner_accounts_set_updated_at
before update on public.partner_accounts
for each row execute function public.set_updated_at();

alter table public.partner_accounts enable row level security;

drop policy if exists "partner_accounts_select" on public.partner_accounts;
create policy "partner_accounts_select"
  on public.partner_accounts for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "partner_accounts_write" on public.partner_accounts;
create policy "partner_accounts_write"
  on public.partner_accounts for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

create table if not exists public.partner_customers (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partner_accounts (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_organization_id uuid not null references public.organizations (id) on delete cascade,
  license_status text not null default 'active'
    check (license_status in ('trial', 'active', 'suspended', 'cancelled')),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (partner_id, customer_organization_id)
);

create index if not exists partner_customers_partner_idx
  on public.partner_customers (partner_id);

alter table public.partner_customers enable row level security;

drop policy if exists "partner_customers_select" on public.partner_customers;
create policy "partner_customers_select"
  on public.partner_customers for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "partner_customers_write" on public.partner_customers;
create policy "partner_customers_write"
  on public.partner_customers for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Public branding lookup by verified custom domain (login / pre-auth)
-- Returns sanitized config only for dns_verified / active / ssl_pending hosts.
-- ---------------------------------------------------------------------------

create or replace function public.get_public_white_label_by_hostname(p_hostname text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_config jsonb;
  v_cache jsonb;
begin
  if p_hostname is null or length(trim(p_hostname)) = 0 then
    return null;
  end if;

  select d.organization_id into v_org
  from public.organization_custom_domains d
  where lower(d.hostname) = lower(trim(p_hostname))
    and d.status in ('dns_verified', 'ssl_pending', 'active')
  limit 1;

  if v_org is null then
    return null;
  end if;

  select wl.config_json, wl.theme_cache_json
    into v_config, v_cache
  from public.organization_white_label wl
  where wl.organization_id = v_org
    and wl.status = 'active'
  limit 1;

  if v_config is null then
    return jsonb_build_object(
      'organizationId', v_org,
      'hostname', lower(trim(p_hostname)),
      'config', '{}'::jsonb,
      'themeVariables', coalesce(v_cache, '{}'::jsonb)
    );
  end if;

  -- Never expose customJs body publicly; strip when not future-enabled
  v_config := v_config - 'customJs';
  if coalesce((v_config->>'customCssEnabled')::boolean, false) is not true then
    v_config := v_config - 'customCss';
  end if;

  return jsonb_build_object(
    'organizationId', v_org,
    'hostname', lower(trim(p_hostname)),
    'config', v_config,
    'themeVariables', coalesce(v_cache, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.get_public_white_label_by_hostname(text) from public;
grant execute on function public.get_public_white_label_by_hostname(text) to anon, authenticated;
