-- Lead Engine — Email Preferences, Unsubscribe & Suppression Automation (Phase 21I)
-- Additive only. Run manually AFTER 20260726000018_email_tracking_engine.sql
-- Do NOT auto-execute from the app.
-- Do NOT modify migrations 00001–00018.

-- ---------------------------------------------------------------------------
-- Organization communication settings (address / privacy / terms)
-- ---------------------------------------------------------------------------

alter table public.organizations
  add column if not exists postal_address text,
  add column if not exists privacy_policy_url text,
  add column if not exists terms_url text,
  add column if not exists support_email text,
  add column if not exists logo_url text,
  add column if not exists default_email_language text not null default 'en',
  add column if not exists email_company_address_required boolean not null default true;

-- ---------------------------------------------------------------------------
-- Extend existing email_suppressions (reuse; do not fork a second system)
-- ---------------------------------------------------------------------------

alter table public.email_suppressions
  add column if not exists scope text not null default 'organization'
    check (scope in (
      'organization', 'category', 'campaign', 'sequence',
      'sender_profile', 'temporary_pause', 'legal'
    )),
  add column if not exists permanent_flag boolean not null default true,
  add column if not exists starts_at timestamptz not null default timezone('utc', now()),
  add column if not exists expires_at timestamptz,
  add column if not exists campaign_id uuid references public.email_campaigns (id) on delete set null,
  add column if not exists sequence_id uuid references public.email_sequences (id) on delete set null,
  add column if not exists sender_profile_id uuid references public.email_sender_profiles (id) on delete set null,
  add column if not exists contact_id uuid,
  add column if not exists lead_id uuid,
  add column if not exists company_id uuid,
  add column if not exists category_code text,
  add column if not exists provider text,
  add column if not exists provider_event_id text,
  add column if not exists related_message_id uuid references public.email_queue (id) on delete set null,
  add column if not exists evidence_json jsonb not null default '{}'::jsonb,
  add column if not exists precedence_rank integer not null default 100,
  add column if not exists active boolean not null default true,
  add column if not exists created_by uuid,
  add column if not exists removed_by uuid,
  add column if not exists removed_at timestamptz,
  add column if not exists removal_reason text;

create index if not exists email_suppressions_org_active_idx
  on public.email_suppressions (organization_id, active, status, precedence_rank);

create index if not exists email_suppressions_org_email_active_idx
  on public.email_suppressions (organization_id, email_normalized, active);

-- ---------------------------------------------------------------------------
-- Immutable suppression history (legal / operational evidence)
-- ---------------------------------------------------------------------------

create table if not exists public.email_suppression_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  suppression_id uuid references public.email_suppressions (id) on delete set null,
  email_normalized text not null,
  action text not null
    check (action in ('created', 'updated', 'deactivated', 'reactivated', 'expired', 'notes_updated')),
  status text,
  reason text,
  source text,
  scope text,
  permanent_flag boolean,
  evidence_json jsonb not null default '{}'::jsonb,
  notes text,
  actor_user_id uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_suppression_history_org_email_idx
  on public.email_suppression_history (organization_id, email_normalized, created_at desc);

alter table public.email_suppression_history enable row level security;

create policy "email_suppression_history_select"
  on public.email_suppression_history for select
  to authenticated using (public.is_org_member(organization_id));

create policy "email_suppression_history_insert"
  on public.email_suppression_history for insert
  to authenticated with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Communication categories
-- ---------------------------------------------------------------------------

create table if not exists public.email_communication_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  is_essential boolean not null default false,
  is_active boolean not null default true,
  default_subscribed boolean not null default true,
  display_order integer not null default 100,
  created_by uuid,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, code)
);

create index if not exists email_communication_categories_org_active_idx
  on public.email_communication_categories (organization_id, is_active, display_order);

create trigger email_communication_categories_set_updated_at
before update on public.email_communication_categories
for each row execute function public.set_updated_at();

alter table public.email_communication_categories enable row level security;

create policy "email_communication_categories_select"
  on public.email_communication_categories for select
  to authenticated using (public.is_org_member(organization_id));

create policy "email_communication_categories_insert"
  on public.email_communication_categories for insert
  to authenticated with check (public.is_org_owner_or_admin(organization_id));

create policy "email_communication_categories_update"
  on public.email_communication_categories for update
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Recipient communication preferences (one row per normalized email)
-- ---------------------------------------------------------------------------

create table if not exists public.email_recipient_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email_normalized text not null,
  contact_id uuid,
  lead_id uuid,
  company_id uuid,
  effective_status text not null default 'subscribed'
    check (effective_status in (
      'subscribed', 'partially_subscribed', 'paused', 'unsubscribed',
      'suppressed', 'invalid', 'complaint_blocked', 'hard_bounce_blocked',
      'legal_hold', 'unknown'
    )),
  frequency_type text not null default 'immediate'
    check (frequency_type in (
      'no_promotional', 'immediate', 'daily', 'weekly',
      'every_two_weeks', 'monthly', 'quarterly', 'only_important', 'custom'
    )),
  min_days_between_emails integer,
  max_emails_per_week integer,
  max_emails_per_month integer,
  preferred_language text,
  preferred_timezone text,
  pause_starts_at timestamptz,
  pause_ends_at timestamptz,
  pause_scope text
    check (pause_scope is null or pause_scope in ('organization', 'category')),
  pause_reason text,
  category_preferences_json jsonb not null default '{}'::jsonb,
  global_unsubscribed_at timestamptz,
  last_preference_update_at timestamptz,
  last_unsubscribe_at timestamptz,
  last_resubscribe_at timestamptz,
  last_suppression_at timestamptz,
  last_suppression_reason text,
  eligible_for_outreach boolean not null default true,
  eligibility_reason text,
  do_not_contact boolean not null default false,
  source text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, email_normalized)
);

create index if not exists email_recipient_preferences_org_status_idx
  on public.email_recipient_preferences (organization_id, effective_status, updated_at desc);

create index if not exists email_recipient_preferences_org_email_idx
  on public.email_recipient_preferences (organization_id, email_normalized);

create trigger email_recipient_preferences_set_updated_at
before update on public.email_recipient_preferences
for each row execute function public.set_updated_at();

alter table public.email_recipient_preferences enable row level security;

create policy "email_recipient_preferences_select"
  on public.email_recipient_preferences for select
  to authenticated using (public.is_org_member(organization_id));

create policy "email_recipient_preferences_insert"
  on public.email_recipient_preferences for insert
  to authenticated with check (public.is_org_member(organization_id));

create policy "email_recipient_preferences_update"
  on public.email_recipient_preferences for update
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Preference / unsubscribe / consent event ledgers
-- ---------------------------------------------------------------------------

create table if not exists public.email_preference_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  preference_id uuid references public.email_recipient_preferences (id) on delete set null,
  email_normalized text not null,
  event_type text not null
    check (event_type in (
      'preference_center_opened', 'preference_updated', 'global_unsubscribe',
      'category_unsubscribe', 'temporary_pause', 'pause_ended',
      'resubscribe_requested', 'resubscribe_confirmed', 'frequency_updated',
      'language_updated', 'timezone_updated', 'suppression_created',
      'suppression_updated', 'suppression_removed', 'enrollment_stopped',
      'queue_jobs_cancelled', 'manual_review_required', 'one_click_unsubscribe',
      'reply_unsubscribe', 'dispatch_blocked'
    )),
  scope text,
  category_code text,
  campaign_id uuid references public.email_campaigns (id) on delete set null,
  sequence_id uuid references public.email_sequences (id) on delete set null,
  source text,
  idempotency_key text,
  payload_json jsonb not null default '{}'::jsonb,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists email_preference_events_org_idempotency_idx
  on public.email_preference_events (organization_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists email_preference_events_org_email_idx
  on public.email_preference_events (organization_id, email_normalized, created_at desc);

alter table public.email_preference_events enable row level security;

create policy "email_preference_events_select"
  on public.email_preference_events for select
  to authenticated using (public.is_org_member(organization_id));

create table if not exists public.email_unsubscribe_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  preference_id uuid references public.email_recipient_preferences (id) on delete set null,
  email_normalized text not null,
  scope text not null default 'organization'
    check (scope in (
      'organization', 'category', 'campaign', 'sequence', 'temporary_pause'
    )),
  category_code text,
  campaign_id uuid references public.email_campaigns (id) on delete set null,
  sequence_id uuid references public.email_sequences (id) on delete set null,
  reason_code text
    check (reason_code is null or reason_code in (
      'too_many_emails', 'not_relevant', 'never_signed_up', 'no_longer_interested',
      'changed_role', 'wrong_person', 'privacy_concern', 'prefer_another_channel',
      'other', 'no_reason_provided'
    )),
  reason_text text,
  source text not null,
  related_queue_item_id uuid references public.email_queue (id) on delete set null,
  related_message_id uuid,
  idempotency_key text,
  side_effects_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists email_unsubscribe_events_org_idempotency_idx
  on public.email_unsubscribe_events (organization_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists email_unsubscribe_events_org_email_idx
  on public.email_unsubscribe_events (organization_id, email_normalized, created_at desc);

alter table public.email_unsubscribe_events enable row level security;

create policy "email_unsubscribe_events_select"
  on public.email_unsubscribe_events for select
  to authenticated using (public.is_org_member(organization_id));

create table if not exists public.email_consent_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email_normalized text not null,
  consent_status text not null
    check (consent_status in (
      'unknown', 'inferred_interest', 'explicit_opt_in', 'withdrawn', 'reconfirmed'
    )),
  consent_timestamp timestamptz,
  consent_source text,
  consent_version text,
  consent_text_version text,
  collection_method text,
  withdrawal_timestamp timestamptz,
  withdrawal_source text,
  reconfirmation_timestamp timestamptz,
  lawful_basis_placeholder text,
  proof_metadata_json jsonb not null default '{}'::jsonb,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_consent_records_org_email_idx
  on public.email_consent_records (organization_id, email_normalized, created_at desc);

create trigger email_consent_records_set_updated_at
before update on public.email_consent_records
for each row execute function public.set_updated_at();

alter table public.email_consent_records enable row level security;

create policy "email_consent_records_select"
  on public.email_consent_records for select
  to authenticated using (public.is_org_member(organization_id));

create policy "email_consent_records_insert"
  on public.email_consent_records for insert
  to authenticated with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Preference tokens (opaque public access; no plain email / org id in token)
-- ---------------------------------------------------------------------------

create table if not exists public.email_preference_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  preference_id uuid references public.email_recipient_preferences (id) on delete set null,
  email_normalized text not null,
  public_token text not null,
  purpose text not null
    check (purpose in (
      'preference_center', 'one_click_unsubscribe', 'unsubscribe_page',
      'resubscribe_confirm', 'single_use_confirm'
    )),
  token_version integer not null default 1,
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_reason text,
  single_use boolean not null default false,
  used_at timestamptz,
  related_queue_item_id uuid references public.email_queue (id) on delete set null,
  related_campaign_id uuid references public.email_campaigns (id) on delete set null,
  related_category_code text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (public_token)
);

create index if not exists email_preference_tokens_org_email_idx
  on public.email_preference_tokens (organization_id, email_normalized, purpose, created_at desc);

create index if not exists email_preference_tokens_lookup_idx
  on public.email_preference_tokens (public_token)
  where revoked_at is null;

create trigger email_preference_tokens_set_updated_at
before update on public.email_preference_tokens
for each row execute function public.set_updated_at();

alter table public.email_preference_tokens enable row level security;

-- Authenticated org members may view token metadata (never the signing secret).
-- Public token resolution uses the service role on the server only.
create policy "email_preference_tokens_select"
  on public.email_preference_tokens for select
  to authenticated using (public.is_org_member(organization_id));

create policy "email_preference_tokens_insert"
  on public.email_preference_tokens for insert
  to authenticated with check (public.is_org_member(organization_id));

create policy "email_preference_tokens_update"
  on public.email_preference_tokens for update
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Resubscribe confirmation requests
-- ---------------------------------------------------------------------------

create table if not exists public.email_resubscribe_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  preference_id uuid references public.email_recipient_preferences (id) on delete set null,
  email_normalized text not null,
  token_id uuid references public.email_preference_tokens (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'expired', 'blocked', 'cancelled')),
  requested_at timestamptz not null default timezone('utc', now()),
  confirmed_at timestamptz,
  blocked_reason text,
  source text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_resubscribe_requests_org_status_idx
  on public.email_resubscribe_requests (organization_id, status, requested_at desc);

create trigger email_resubscribe_requests_set_updated_at
before update on public.email_resubscribe_requests
for each row execute function public.set_updated_at();

alter table public.email_resubscribe_requests enable row level security;

create policy "email_resubscribe_requests_select"
  on public.email_resubscribe_requests for select
  to authenticated using (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Effective communication status cache (resolver output)
-- ---------------------------------------------------------------------------

create table if not exists public.email_effective_communication_status (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email_normalized text not null,
  preference_id uuid references public.email_recipient_preferences (id) on delete set null,
  effective_status text not null,
  eligible boolean not null default true,
  blocking_reasons_json jsonb not null default '[]'::jsonb,
  warning_reasons_json jsonb not null default '[]'::jsonb,
  next_eligible_at timestamptz,
  strongest_suppression_id uuid references public.email_suppressions (id) on delete set null,
  applied_rules_json jsonb not null default '[]'::jsonb,
  evaluated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, email_normalized)
);

create index if not exists email_effective_communication_status_org_eligible_idx
  on public.email_effective_communication_status (organization_id, eligible, effective_status);

create trigger email_effective_communication_status_set_updated_at
before update on public.email_effective_communication_status
for each row execute function public.set_updated_at();

alter table public.email_effective_communication_status enable row level security;

create policy "email_effective_communication_status_select"
  on public.email_effective_communication_status for select
  to authenticated using (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Rendered message compliance snapshot fields
-- ---------------------------------------------------------------------------

alter table public.email_rendered_messages
  add column if not exists communication_purpose text
    check (communication_purpose is null or communication_purpose in (
      'promotional', 'sales_outreach', 'newsletter', 'product_update',
      'transactional', 'essential_system', 'legal', 'internal_test'
    )),
  add column if not exists communication_category_code text,
  add column if not exists footer_version text,
  add column if not exists footer_html text,
  add column if not exists list_unsubscribe_header text,
  add column if not exists preference_token_id uuid references public.email_preference_tokens (id) on delete set null,
  add column if not exists one_click_token_id uuid references public.email_preference_tokens (id) on delete set null;

comment on table public.email_recipient_preferences is
  'Phase 21I recipient communication preferences and effective outreach status.';
comment on table public.email_preference_tokens is
  'Opaque preference/unsubscribe tokens. Public resolution uses server service role only.';
