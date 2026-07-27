-- Lead Engine — Email Sequence Engine (Phase 21D)
-- Additive only. Run manually AFTER 20260726000013_campaign_manager.sql
-- Do NOT auto-execute from the app.
-- NO sequence execution / sending / scheduling in this phase.

-- ---------------------------------------------------------------------------
-- Extend email_sequences
-- ---------------------------------------------------------------------------

alter table public.email_sequences
  add column if not exists category text not null default 'custom',
  add column if not exists default_language text not null default 'en',
  add column if not exists campaign_type_compatibility text[] not null default '{}'::text[],
  add column if not exists created_by uuid,
  add column if not exists updated_by uuid,
  add column if not exists archived_at timestamptz,
  add column if not exists current_version_id uuid,
  add column if not exists readiness_score integer not null default 0
    check (readiness_score >= 0 and readiness_score <= 100),
  add column if not exists readiness_classification text not null default 'not_ready',
  add column if not exists stop_rules_json jsonb not null default '[]'::jsonb,
  add column if not exists safety_limits_json jsonb not null default '{}'::jsonb,
  add column if not exists settings_json jsonb not null default '{}'::jsonb,
  add column if not exists last_validation_json jsonb not null default '{}'::jsonb;

-- Expand status: draft, active, inactive, archived, deprecated (map paused -> inactive)
update public.email_sequences set status = 'inactive' where status = 'paused';

do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.email_sequences'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%';

  if cname is not null then
    execute format('alter table public.email_sequences drop constraint %I', cname);
  end if;

  alter table public.email_sequences
    add constraint email_sequences_status_check
    check (status in ('draft', 'active', 'inactive', 'archived', 'deprecated'));
end $$;

create index if not exists email_sequences_org_status_idx
  on public.email_sequences (organization_id, status, updated_at desc);

create index if not exists email_sequences_org_category_idx
  on public.email_sequences (organization_id, category);

-- ---------------------------------------------------------------------------
-- email_sequence_versions (immutable published snapshots)
-- ---------------------------------------------------------------------------

create table if not exists public.email_sequence_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  sequence_id uuid not null references public.email_sequences (id) on delete cascade,
  version_number integer not null check (version_number >= 1),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'inactive', 'archived', 'deprecated')),
  name text not null,
  description text,
  category text not null default 'custom',
  default_language text not null default 'en',
  steps_json jsonb not null default '[]'::jsonb,
  stop_rules_json jsonb not null default '[]'::jsonb,
  safety_limits_json jsonb not null default '{}'::jsonb,
  change_notes text,
  is_current boolean not null default false,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (sequence_id, version_number)
);

create index if not exists email_sequence_versions_sequence_idx
  on public.email_sequence_versions (sequence_id, version_number desc);

create index if not exists email_sequence_versions_org_idx
  on public.email_sequence_versions (organization_id, created_at desc);

create trigger email_sequence_versions_set_updated_at
before update on public.email_sequence_versions
for each row execute function public.set_updated_at();

alter table public.email_sequence_versions enable row level security;

create policy "email_sequence_versions_select" on public.email_sequence_versions
  for select to authenticated using (public.is_org_member(organization_id));
create policy "email_sequence_versions_insert" on public.email_sequence_versions
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "email_sequence_versions_update" on public.email_sequence_versions
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "email_sequence_versions_delete" on public.email_sequence_versions
  for delete to authenticated using (public.is_org_member(organization_id));

-- FK from sequences to current version (after versions table exists)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'email_sequences_current_version_id_fkey'
  ) then
    alter table public.email_sequences
      add constraint email_sequences_current_version_id_fkey
      foreign key (current_version_id) references public.email_sequence_versions (id)
      on delete set null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- email_sequence_validations
-- ---------------------------------------------------------------------------

create table if not exists public.email_sequence_validations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  sequence_id uuid not null references public.email_sequences (id) on delete cascade,
  version_number integer,
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

create index if not exists email_sequence_validations_sequence_idx
  on public.email_sequence_validations (organization_id, sequence_id, created_at desc);

alter table public.email_sequence_validations enable row level security;

create policy "email_sequence_validations_select" on public.email_sequence_validations
  for select to authenticated using (public.is_org_member(organization_id));
create policy "email_sequence_validations_insert" on public.email_sequence_validations
  for insert to authenticated with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- email_sequence_activities
-- ---------------------------------------------------------------------------

create table if not exists public.email_sequence_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  sequence_id uuid not null references public.email_sequences (id) on delete cascade,
  event_type text not null,
  description text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_sequence_activities_sequence_idx
  on public.email_sequence_activities (organization_id, sequence_id, created_at desc);

alter table public.email_sequence_activities enable row level security;

create policy "email_sequence_activities_select" on public.email_sequence_activities
  for select to authenticated using (public.is_org_member(organization_id));
create policy "email_sequence_activities_insert" on public.email_sequence_activities
  for insert to authenticated with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Extend email_campaigns for sequence version locking
-- ---------------------------------------------------------------------------

alter table public.email_campaigns
  add column if not exists sequence_version_id uuid
    references public.email_sequence_versions (id) on delete set null,
  add column if not exists sequence_name_snapshot text,
  add column if not exists sequence_steps_snapshot jsonb;

comment on table public.email_sequence_versions is
  'Immutable sequence version snapshots — never overwrite published rows';
comment on column public.email_campaigns.sequence_version_id is
  'Locked sequence version when campaign is approved (Phase 21D)';
