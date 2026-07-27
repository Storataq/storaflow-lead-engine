-- Lead Engine — Campaign Manager (Phase 21C)
-- Additive only. Run manually AFTER 20260726000012_email_template_engine.sql
-- Do NOT auto-execute from the app.
-- NO email sending / scheduling execution in this phase.

-- ---------------------------------------------------------------------------
-- email_sender_profiles (foundation — no provider verification yet)
-- ---------------------------------------------------------------------------

create table if not exists public.email_sender_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  sender_name text not null default '',
  sender_email text not null default '',
  reply_to_name text,
  reply_to_email text,
  status text not null default 'draft'
    check (status in (
      'draft', 'pending_verification', 'verified', 'invalid', 'disabled'
    )),
  provider_reference text,
  domain_verification_status text not null default 'unverified'
    check (domain_verification_status in (
      'unverified', 'pending', 'verified', 'failed', 'not_applicable'
    )),
  is_default boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_sender_profiles_org_idx
  on public.email_sender_profiles (organization_id, updated_at desc);

create trigger email_sender_profiles_set_updated_at
before update on public.email_sender_profiles
for each row execute function public.set_updated_at();

alter table public.email_sender_profiles enable row level security;

create policy "email_sender_profiles_select" on public.email_sender_profiles
  for select to authenticated using (public.is_org_member(organization_id));
create policy "email_sender_profiles_insert" on public.email_sender_profiles
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "email_sender_profiles_update" on public.email_sender_profiles
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "email_sender_profiles_delete" on public.email_sender_profiles
  for delete to authenticated using (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Extend email_campaigns
-- ---------------------------------------------------------------------------

alter table public.email_campaigns
  add column if not exists campaign_type text not null default 'custom',
  add column if not exists objective text,
  add column if not exists language text not null default 'en',
  add column if not exists template_id uuid
    references public.email_templates (id) on delete set null,
  add column if not exists template_version_id uuid
    references public.email_template_versions (id) on delete set null,
  add column if not exists template_subject_snapshot text,
  add column if not exists template_preview_snapshot text,
  add column if not exists template_html_snapshot text,
  add column if not exists template_text_snapshot text,
  add column if not exists template_variables_snapshot text[] not null default '{}'::text[],
  add column if not exists sender_profile_id uuid
    references public.email_sender_profiles (id) on delete set null,
  add column if not exists owner_user_id uuid,
  add column if not exists approved_by uuid,
  add column if not exists approved_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists notes text,
  add column if not exists settings_json jsonb not null default '{}'::jsonb,
  add column if not exists audience_definition_json jsonb not null default '{}'::jsonb,
  add column if not exists recipient_count integer not null default 0,
  add column if not exists valid_recipient_count integer not null default 0,
  add column if not exists excluded_recipient_count integer not null default 0,
  add column if not exists readiness_score integer not null default 0
    check (readiness_score >= 0 and readiness_score <= 100),
  add column if not exists readiness_classification text not null default 'not_ready',
  add column if not exists locked boolean not null default false,
  add column if not exists sequence_version integer,
  add column if not exists compliance_ack boolean not null default false,
  add column if not exists last_validation_json jsonb not null default '{}'::jsonb;

-- Expand campaign status constraint for manager workflow + future execution
do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.email_campaigns'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%';

  if cname is not null then
    execute format('alter table public.email_campaigns drop constraint %I', cname);
  end if;

  alter table public.email_campaigns
    add constraint email_campaigns_status_check
    check (status in (
      'draft',
      'needs_review',
      'ready',
      'approved',
      'scheduled',
      'running',
      'paused',
      'completed',
      'cancelled',
      'archived',
      'failed'
    ));
end $$;

create index if not exists email_campaigns_org_type_idx
  on public.email_campaigns (organization_id, campaign_type);
create index if not exists email_campaigns_org_template_idx
  on public.email_campaigns (organization_id, template_id);
create index if not exists email_campaigns_org_owner_idx
  on public.email_campaigns (organization_id, owner_user_id);

-- ---------------------------------------------------------------------------
-- Extend email_recipients for snapshots / eligibility
-- ---------------------------------------------------------------------------

alter table public.email_recipients
  add column if not exists is_snapshot boolean not null default false,
  add column if not exists eligibility_status text not null default 'not_eligible',
  add column if not exists exclusion_reason text,
  add column if not exists company_name text,
  add column if not exists owner_user_id uuid,
  add column if not exists qualification_score integer,
  add column if not exists opportunity_score integer,
  add column if not exists priority text,
  add column if not exists source text,
  add column if not exists snapshot_at timestamptz,
  add column if not exists duplicate_of_recipient_id uuid
    references public.email_recipients (id) on delete set null,
  add column if not exists personalization_status text;

create index if not exists email_recipients_campaign_eligibility_idx
  on public.email_recipients (organization_id, campaign_id, eligibility_status);

-- ---------------------------------------------------------------------------
-- email_campaign_approvals
-- ---------------------------------------------------------------------------

create table if not exists public.email_campaign_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  campaign_id uuid not null references public.email_campaigns (id) on delete cascade,
  status text not null default 'pending_review'
    check (status in (
      'pending_review', 'approved', 'rejected', 'changes_required', 'invalidated'
    )),
  reviewer_user_id uuid,
  reviewed_at timestamptz,
  decision text,
  reason text,
  notes text,
  validation_snapshot jsonb not null default '{}'::jsonb,
  recipient_count_snapshot integer not null default 0,
  template_version_id uuid
    references public.email_template_versions (id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_campaign_approvals_campaign_idx
  on public.email_campaign_approvals (organization_id, campaign_id, created_at desc);

create trigger email_campaign_approvals_set_updated_at
before update on public.email_campaign_approvals
for each row execute function public.set_updated_at();

alter table public.email_campaign_approvals enable row level security;

create policy "email_campaign_approvals_select" on public.email_campaign_approvals
  for select to authenticated using (public.is_org_member(organization_id));
create policy "email_campaign_approvals_insert" on public.email_campaign_approvals
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "email_campaign_approvals_update" on public.email_campaign_approvals
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "email_campaign_approvals_delete" on public.email_campaign_approvals
  for delete to authenticated using (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- email_campaign_validations (latest + history)
-- ---------------------------------------------------------------------------

create table if not exists public.email_campaign_validations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  campaign_id uuid not null references public.email_campaigns (id) on delete cascade,
  readiness_score integer not null default 0
    check (readiness_score >= 0 and readiness_score <= 100),
  classification text not null default 'not_ready',
  blocking_count integer not null default 0,
  warning_count integer not null default 0,
  info_count integer not null default 0,
  issues_json jsonb not null default '[]'::jsonb,
  summary_json jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_campaign_validations_campaign_idx
  on public.email_campaign_validations (organization_id, campaign_id, created_at desc);

alter table public.email_campaign_validations enable row level security;

create policy "email_campaign_validations_select" on public.email_campaign_validations
  for select to authenticated using (public.is_org_member(organization_id));
create policy "email_campaign_validations_insert" on public.email_campaign_validations
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "email_campaign_validations_delete" on public.email_campaign_validations
  for delete to authenticated using (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- email_campaign_activities
-- ---------------------------------------------------------------------------

create table if not exists public.email_campaign_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  campaign_id uuid not null references public.email_campaigns (id) on delete cascade,
  event_type text not null,
  description text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_campaign_activities_campaign_idx
  on public.email_campaign_activities (organization_id, campaign_id, created_at desc);

alter table public.email_campaign_activities enable row level security;

create policy "email_campaign_activities_select" on public.email_campaign_activities
  for select to authenticated using (public.is_org_member(organization_id));
create policy "email_campaign_activities_insert" on public.email_campaign_activities
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "email_campaign_activities_delete" on public.email_campaign_activities
  for delete to authenticated using (public.is_org_member(organization_id));

comment on table public.email_sender_profiles is
  'Sender identity foundation — provider verification not integrated yet';
comment on column public.email_campaigns.locked is
  'When true (approved), audience/template/sender/settings are locked until returned to draft';
comment on column public.email_campaigns.sequence_id is
  'Reserved for Phase 21D Sequence Engine linking';
