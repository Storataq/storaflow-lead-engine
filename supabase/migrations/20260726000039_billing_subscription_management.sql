-- Storaflow — Billing & Subscription Management (Phase 26F)
-- Additive only. Run manually AFTER 20260726000038_enterprise_security_identity.sql
-- Do NOT auto-execute from the app.
-- Do NOT modify migrations 00001–00038.
-- Org-scoped billing; RLS isolation. Idempotent.

-- ---------------------------------------------------------------------------
-- Catalog: plans, limits, features, add-ons, coupons
-- ---------------------------------------------------------------------------

create table if not exists public.billing_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null default '',
  plan_tier text not null
    check (plan_tier in (
      'free_trial',
      'starter',
      'professional',
      'business',
      'enterprise',
      'white_label'
    )),
  billing_interval text not null default 'month'
    check (billing_interval in ('month', 'year', 'custom')),
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'eur',
  seat_price_cents integer not null default 0 check (seat_price_cents >= 0),
  included_seats integer not null default 1 check (included_seats >= 0),
  is_public boolean not null default true,
  is_enterprise_contract boolean not null default false,
  trial_days integer not null default 0 check (trial_days >= 0),
  stripe_price_id text,
  stripe_product_id text,
  sort_order integer not null default 0,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists billing_plans_set_updated_at on public.billing_plans;
create trigger billing_plans_set_updated_at
before update on public.billing_plans
for each row execute function public.set_updated_at();

alter table public.billing_plans enable row level security;

drop policy if exists "billing_plans_select" on public.billing_plans;
create policy "billing_plans_select"
  on public.billing_plans for select
  to authenticated using (status = 'active' or public.is_org_owner_or_admin(
    (select organization_id from public.organization_members where user_id = auth.uid() limit 1)
  ));

-- Simpler: all authenticated can read active plans
drop policy if exists "billing_plans_select" on public.billing_plans;
create policy "billing_plans_select"
  on public.billing_plans for select
  to authenticated using (true);

drop policy if exists "billing_plans_write" on public.billing_plans;
create policy "billing_plans_write"
  on public.billing_plans for all
  to authenticated using (false)
  with check (false);

create table if not exists public.billing_plan_limits (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.billing_plans (id) on delete cascade,
  limit_key text not null,
  limit_value bigint not null default 0,
  soft_limit bigint,
  warning_threshold_pct integer not null default 80
    check (warning_threshold_pct between 1 and 100),
  enforcement text not null default 'hard'
    check (enforcement in ('soft', 'hard')),
  unique (plan_id, limit_key)
);

alter table public.billing_plan_limits enable row level security;

drop policy if exists "billing_plan_limits_select" on public.billing_plan_limits;
create policy "billing_plan_limits_select"
  on public.billing_plan_limits for select
  to authenticated using (true);

create table if not exists public.billing_plan_features (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.billing_plans (id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default true,
  unique (plan_id, feature_key)
);

alter table public.billing_plan_features enable row level security;

drop policy if exists "billing_plan_features_select" on public.billing_plan_features;
create policy "billing_plan_features_select"
  on public.billing_plan_features for select
  to authenticated using (true);

create table if not exists public.billing_addons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null default '',
  addon_type text not null
    check (addon_type in (
      'extra_users',
      'extra_storage',
      'extra_ai_credits',
      'extra_api_calls',
      'extra_organizations',
      'extra_automations',
      'premium_support',
      'custom'
    )),
  price_cents integer not null default 0,
  currency text not null default 'eur',
  quantity_unit text not null default 'unit',
  stripe_price_id text,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.billing_addons enable row level security;

drop policy if exists "billing_addons_select" on public.billing_addons;
create policy "billing_addons_select"
  on public.billing_addons for select
  to authenticated using (true);

create table if not exists public.billing_coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  discount_type text not null
    check (discount_type in ('percent', 'fixed', 'referral', 'partner', 'lifetime', 'founding', 'education', 'nonprofit')),
  percent_off numeric(5,2),
  amount_off_cents integer,
  currency text not null default 'eur',
  duration text not null default 'once'
    check (duration in ('once', 'repeating', 'forever')),
  max_redemptions integer,
  redeem_by timestamptz,
  status text not null default 'active'
    check (status in ('active', 'expired', 'disabled')),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.billing_coupons enable row level security;

drop policy if exists "billing_coupons_select" on public.billing_coupons;
create policy "billing_coupons_select"
  on public.billing_coupons for select
  to authenticated using (status = 'active');

-- ---------------------------------------------------------------------------
-- Organization subscriptions & Stripe customer mapping
-- ---------------------------------------------------------------------------

create table if not exists public.billing_customers (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  stripe_customer_id text unique,
  billing_email text,
  billing_name text,
  billing_address_json jsonb not null default '{}'::jsonb,
  tax_id text,
  vat_number text,
  currency text not null default 'eur',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists billing_customers_set_updated_at on public.billing_customers;
create trigger billing_customers_set_updated_at
before update on public.billing_customers
for each row execute function public.set_updated_at();

alter table public.billing_customers enable row level security;

drop policy if exists "billing_customers_select" on public.billing_customers;
create policy "billing_customers_select"
  on public.billing_customers for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "billing_customers_write" on public.billing_customers;
create policy "billing_customers_write"
  on public.billing_customers for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  plan_id uuid not null references public.billing_plans (id),
  status text not null default 'trialing'
    check (status in (
      'trialing',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'paused',
      'incomplete'
    )),
  billing_interval text not null default 'month'
    check (billing_interval in ('month', 'year', 'custom')),
  seats_purchased integer not null default 1 check (seats_purchased >= 0),
  trial_starts_at timestamptz,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  scheduled_plan_id uuid references public.billing_plans (id),
  stripe_subscription_id text unique,
  coupon_id uuid references public.billing_coupons (id) on delete set null,
  reseller_organization_id uuid references public.organizations (id) on delete set null,
  contract_json jsonb not null default '{}'::jsonb,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id)
);

create index if not exists billing_subscriptions_status_idx
  on public.billing_subscriptions (status, current_period_end);

drop trigger if exists billing_subscriptions_set_updated_at on public.billing_subscriptions;
create trigger billing_subscriptions_set_updated_at
before update on public.billing_subscriptions
for each row execute function public.set_updated_at();

alter table public.billing_subscriptions enable row level security;

drop policy if exists "billing_subscriptions_select" on public.billing_subscriptions;
create policy "billing_subscriptions_select"
  on public.billing_subscriptions for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "billing_subscriptions_write" on public.billing_subscriptions;
create policy "billing_subscriptions_write"
  on public.billing_subscriptions for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

create table if not exists public.billing_org_addons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  addon_id uuid not null references public.billing_addons (id),
  quantity integer not null default 1 check (quantity > 0),
  status text not null default 'active'
    check (status in ('active', 'canceled')),
  stripe_subscription_item_id text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, addon_id)
);

alter table public.billing_org_addons enable row level security;

drop policy if exists "billing_org_addons_select" on public.billing_org_addons;
create policy "billing_org_addons_select"
  on public.billing_org_addons for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "billing_org_addons_write" on public.billing_org_addons;
create policy "billing_org_addons_write"
  on public.billing_org_addons for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

create table if not exists public.billing_coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  coupon_id uuid not null references public.billing_coupons (id),
  redeemed_by uuid,
  redeemed_at timestamptz not null default timezone('utc', now())
);

alter table public.billing_coupon_redemptions enable row level security;

drop policy if exists "billing_coupon_redemptions_select" on public.billing_coupon_redemptions;
create policy "billing_coupon_redemptions_select"
  on public.billing_coupon_redemptions for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "billing_coupon_redemptions_write" on public.billing_coupon_redemptions;
create policy "billing_coupon_redemptions_write"
  on public.billing_coupon_redemptions for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Seats, usage, invoices, payment methods (tokenized), notifications, webhooks
-- ---------------------------------------------------------------------------

create table if not exists public.billing_seat_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  change_type text not null
    check (change_type in ('purchase', 'invite', 'remove', 'adjust', 'addon')),
  seats_delta integer not null,
  seats_after integer not null,
  actor_user_id uuid,
  note text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists billing_seat_ledger_org_idx
  on public.billing_seat_ledger (organization_id, created_at desc);

alter table public.billing_seat_ledger enable row level security;

drop policy if exists "billing_seat_ledger_select" on public.billing_seat_ledger;
create policy "billing_seat_ledger_select"
  on public.billing_seat_ledger for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "billing_seat_ledger_write" on public.billing_seat_ledger;
create policy "billing_seat_ledger_write"
  on public.billing_seat_ledger for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

create table if not exists public.billing_usage_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  metric_key text not null,
  metric_value bigint not null default 0,
  period_start timestamptz not null,
  period_end timestamptz not null,
  source text not null default 'computed',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, metric_key, period_start)
);

create index if not exists billing_usage_snapshots_org_idx
  on public.billing_usage_snapshots (organization_id, metric_key, period_end desc);

alter table public.billing_usage_snapshots enable row level security;

drop policy if exists "billing_usage_snapshots_select" on public.billing_usage_snapshots;
create policy "billing_usage_snapshots_select"
  on public.billing_usage_snapshots for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "billing_usage_snapshots_write" on public.billing_usage_snapshots;
create policy "billing_usage_snapshots_write"
  on public.billing_usage_snapshots for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  stripe_invoice_id text unique,
  number text,
  status text not null default 'draft'
    check (status in ('draft', 'open', 'paid', 'void', 'uncollectible', 'retrying')),
  currency text not null default 'eur',
  amount_due_cents integer not null default 0,
  amount_paid_cents integer not null default 0,
  tax_cents integer not null default 0,
  period_start timestamptz,
  period_end timestamptz,
  hosted_invoice_url text,
  invoice_pdf_url text,
  due_at timestamptz,
  paid_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists billing_invoices_org_idx
  on public.billing_invoices (organization_id, created_at desc);

drop trigger if exists billing_invoices_set_updated_at on public.billing_invoices;
create trigger billing_invoices_set_updated_at
before update on public.billing_invoices
for each row execute function public.set_updated_at();

alter table public.billing_invoices enable row level security;

drop policy if exists "billing_invoices_select" on public.billing_invoices;
create policy "billing_invoices_select"
  on public.billing_invoices for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "billing_invoices_write" on public.billing_invoices;
create policy "billing_invoices_write"
  on public.billing_invoices for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- Never store raw PAN — provider payment method tokens only
create table if not exists public.billing_payment_methods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  stripe_payment_method_id text,
  method_type text not null default 'card'
    check (method_type in ('card', 'debit', 'apple_pay', 'google_pay', 'bank_transfer', 'other')),
  brand text,
  last4 text,
  exp_month integer,
  exp_year integer,
  is_default boolean not null default false,
  status text not null default 'active'
    check (status in ('active', 'detached')),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.billing_payment_methods enable row level security;

drop policy if exists "billing_payment_methods_select" on public.billing_payment_methods;
create policy "billing_payment_methods_select"
  on public.billing_payment_methods for select
  to authenticated using (public.is_org_owner_or_admin(organization_id));

drop policy if exists "billing_payment_methods_write" on public.billing_payment_methods;
create policy "billing_payment_methods_write"
  on public.billing_payment_methods for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

create table if not exists public.billing_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  notification_type text not null,
  title text not null,
  body text not null default '',
  is_read boolean not null default false,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists billing_notifications_org_idx
  on public.billing_notifications (organization_id, is_read, created_at desc);

alter table public.billing_notifications enable row level security;

drop policy if exists "billing_notifications_select" on public.billing_notifications;
create policy "billing_notifications_select"
  on public.billing_notifications for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "billing_notifications_write" on public.billing_notifications;
create policy "billing_notifications_write"
  on public.billing_notifications for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create table if not exists public.billing_stripe_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  organization_id uuid references public.organizations (id) on delete set null,
  payload_json jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.billing_stripe_events enable row level security;

drop policy if exists "billing_stripe_events_select" on public.billing_stripe_events;
create policy "billing_stripe_events_select"
  on public.billing_stripe_events for select
  to authenticated using (
    organization_id is not null and public.is_org_owner_or_admin(organization_id)
  );

create table if not exists public.billing_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_user_id uuid,
  action text not null,
  description text not null default '',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists billing_audit_events_org_idx
  on public.billing_audit_events (organization_id, created_at desc);

alter table public.billing_audit_events enable row level security;

drop policy if exists "billing_audit_events_select" on public.billing_audit_events;
create policy "billing_audit_events_select"
  on public.billing_audit_events for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "billing_audit_events_insert" on public.billing_audit_events;
create policy "billing_audit_events_insert"
  on public.billing_audit_events for insert
  to authenticated with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Seed default plans (configurable limits — not hardcoded in app)
-- ---------------------------------------------------------------------------

insert into public.billing_plans (
  code, name, description, plan_tier, billing_interval, price_cents, included_seats, trial_days, sort_order
) values
  ('free_trial', 'Free Trial', '14-day trial of Professional features', 'free_trial', 'month', 0, 3, 14, 10),
  ('starter_month', 'Starter', 'For small teams getting started', 'starter', 'month', 2900, 3, 0, 20),
  ('starter_year', 'Starter (Yearly)', 'Starter billed annually', 'starter', 'year', 29000, 3, 0, 21),
  ('professional_month', 'Professional', 'Growing sales teams', 'professional', 'month', 7900, 10, 0, 30),
  ('professional_year', 'Professional (Yearly)', 'Professional billed annually', 'professional', 'year', 79000, 10, 0, 31),
  ('business_month', 'Business', 'Advanced automation and API', 'business', 'month', 14900, 25, 0, 40),
  ('business_year', 'Business (Yearly)', 'Business billed annually', 'business', 'year', 149000, 25, 0, 41),
  ('enterprise', 'Enterprise', 'Custom contracts and SLAs', 'enterprise', 'custom', 0, 100, 0, 50),
  ('white_label', 'White Label', 'Partner / reseller licensing', 'white_label', 'custom', 0, 50, 0, 60)
on conflict (code) do nothing;

-- Helper to seed limits/features for a plan code
do $$
declare
  p record;
begin
  for p in select id, code, plan_tier from public.billing_plans loop
    -- users / seats
    insert into public.billing_plan_limits (plan_id, limit_key, limit_value, soft_limit, warning_threshold_pct, enforcement)
    values
      (p.id, 'max_users', case p.plan_tier
        when 'free_trial' then 3 when 'starter' then 3 when 'professional' then 10
        when 'business' then 25 when 'enterprise' then 1000 else 50 end, null, 80, 'hard'),
      (p.id, 'max_companies', case p.plan_tier
        when 'free_trial' then 500 when 'starter' then 1000 when 'professional' then 10000
        when 'business' then 50000 when 'enterprise' then 1000000 else 100000 end, null, 80, 'hard'),
      (p.id, 'max_contacts', case p.plan_tier
        when 'free_trial' then 1000 when 'starter' then 2500 when 'professional' then 25000
        when 'business' then 100000 when 'enterprise' then 5000000 else 500000 end, null, 80, 'hard'),
      (p.id, 'max_campaigns', case p.plan_tier
        when 'free_trial' then 3 when 'starter' then 5 when 'professional' then 50
        when 'business' then 200 when 'enterprise' then 10000 else 500 end, null, 80, 'hard'),
      (p.id, 'max_ai_requests', case p.plan_tier
        when 'free_trial' then 100 when 'starter' then 500 when 'professional' then 5000
        when 'business' then 25000 when 'enterprise' then 1000000 else 50000 end, null, 85, 'soft'),
      (p.id, 'max_api_calls', case p.plan_tier
        when 'free_trial' then 1000 when 'starter' then 5000 when 'professional' then 50000
        when 'business' then 250000 when 'enterprise' then 10000000 else 500000 end, null, 85, 'soft'),
      (p.id, 'max_automations', case p.plan_tier
        when 'free_trial' then 2 when 'starter' then 5 when 'professional' then 25
        when 'business' then 100 when 'enterprise' then 10000 else 200 end, null, 80, 'hard'),
      (p.id, 'max_storage_mb', case p.plan_tier
        when 'free_trial' then 512 when 'starter' then 2048 when 'professional' then 20480
        when 'business' then 102400 when 'enterprise' then 1048576 else 204800 end, null, 80, 'soft')
    on conflict (plan_id, limit_key) do nothing;

    insert into public.billing_plan_features (plan_id, feature_key, enabled)
    values
      (p.id, 'marketplace', p.plan_tier not in ('free_trial', 'starter')),
      (p.id, 'copilot', p.plan_tier <> 'starter'),
      (p.id, 'analytics', true),
      (p.id, 'white_label', p.plan_tier in ('white_label', 'enterprise')),
      (p.id, 'api_access', p.plan_tier not in ('free_trial', 'starter')),
      (p.id, 'priority_support', p.plan_tier in ('business', 'enterprise', 'white_label')),
      (p.id, 'automations', p.plan_tier <> 'starter')
    on conflict (plan_id, feature_key) do nothing;
  end loop;
end $$;

insert into public.billing_addons (code, name, description, addon_type, price_cents, quantity_unit)
values
  ('extra_users', 'Extra users', 'Additional seats', 'extra_users', 900, 'seat'),
  ('extra_storage', 'Extra storage', '+10 GB storage', 'extra_storage', 500, '10gb'),
  ('extra_ai_credits', 'Extra AI credits', '+1000 AI requests', 'extra_ai_credits', 1500, '1000'),
  ('extra_api_calls', 'Extra API calls', '+10k API calls', 'extra_api_calls', 1000, '10000'),
  ('premium_support', 'Premium support', 'Priority support channel', 'premium_support', 4900, 'month')
on conflict (code) do nothing;
