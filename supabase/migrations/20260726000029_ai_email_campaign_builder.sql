-- Storaflow — AI Email Campaign Builder (Phase 25D)
-- Additive only. Run manually AFTER 20260726000028_advanced_sales_pipeline.sql
-- Do NOT auto-execute from the app.
-- Do NOT modify migrations 00001–00028.
-- Does NOT replace Resend / queue / execution — metadata + builder UX only.
-- Idempotent: safe to re-run after partial execution.

-- ---------------------------------------------------------------------------
-- Campaign builder metadata on email_campaigns
-- ---------------------------------------------------------------------------

alter table public.email_campaigns
  add column if not exists builder_mode text not null default 'classic'
    check (builder_mode in ('classic', 'ai_builder')),
  add column if not exists workflow_graph_json jsonb not null default '{}'::jsonb,
  add column if not exists calendar_metadata_json jsonb not null default '{}'::jsonb,
  add column if not exists ai_brief_json jsonb not null default '{}'::jsonb,
  add column if not exists scheduled_for timestamptz,
  add column if not exists timezone text,
  add column if not exists tags text[] not null default '{}'::text[];

create index if not exists email_campaigns_org_builder_mode_idx
  on public.email_campaigns (organization_id, builder_mode);

create index if not exists email_campaigns_org_scheduled_for_idx
  on public.email_campaigns (organization_id, scheduled_for);

-- ---------------------------------------------------------------------------
-- Sequence workflow graph layout (companion to steps_json)
-- ---------------------------------------------------------------------------

alter table public.email_sequences
  add column if not exists workflow_graph_json jsonb not null default '{}'::jsonb;

alter table public.email_sequence_versions
  add column if not exists workflow_graph_json jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- A/B testing (draft metadata; execution assignment later)
-- ---------------------------------------------------------------------------

create table if not exists public.email_campaign_ab_tests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  campaign_id uuid not null references public.email_campaigns (id) on delete cascade,
  name text not null,
  status text not null default 'draft'
    check (status in ('draft', 'running', 'completed', 'cancelled')),
  test_dimension text not null default 'subject'
    check (
      test_dimension in (
        'subject',
        'content',
        'cta',
        'sender_name',
        'send_time'
      )
    ),
  metric text not null default 'open_rate'
    check (
      metric in ('open_rate', 'click_rate', 'reply_rate', 'conversion_rate')
    ),
  traffic_split_json jsonb not null default '{"a":50,"b":50}'::jsonb,
  winner_variant_id uuid,
  auto_pick_winner boolean not null default true,
  started_at timestamptz,
  ended_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_campaign_ab_tests_org_campaign_idx
  on public.email_campaign_ab_tests (organization_id, campaign_id, created_at desc);

drop trigger if exists email_campaign_ab_tests_set_updated_at
  on public.email_campaign_ab_tests;
create trigger email_campaign_ab_tests_set_updated_at
before update on public.email_campaign_ab_tests
for each row execute function public.set_updated_at();

alter table public.email_campaign_ab_tests enable row level security;

drop policy if exists "email_campaign_ab_tests_select" on public.email_campaign_ab_tests;
create policy "email_campaign_ab_tests_select"
  on public.email_campaign_ab_tests for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "email_campaign_ab_tests_write" on public.email_campaign_ab_tests;
create policy "email_campaign_ab_tests_write"
  on public.email_campaign_ab_tests for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

create table if not exists public.email_campaign_ab_variants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  ab_test_id uuid not null references public.email_campaign_ab_tests (id) on delete cascade,
  label text not null,
  weight integer not null default 50 check (weight >= 0 and weight <= 100),
  subject text,
  preview_text text,
  html_body text,
  text_body text,
  cta_label text,
  sender_name_override text,
  send_time_override timestamptz,
  template_version_id uuid,
  ai_generation_variant_id uuid,
  is_control boolean not null default false,
  metrics_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_campaign_ab_variants_test_idx
  on public.email_campaign_ab_variants (organization_id, ab_test_id);

drop trigger if exists email_campaign_ab_variants_set_updated_at
  on public.email_campaign_ab_variants;
create trigger email_campaign_ab_variants_set_updated_at
before update on public.email_campaign_ab_variants
for each row execute function public.set_updated_at();

alter table public.email_campaign_ab_variants enable row level security;

drop policy if exists "email_campaign_ab_variants_select" on public.email_campaign_ab_variants;
create policy "email_campaign_ab_variants_select"
  on public.email_campaign_ab_variants for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "email_campaign_ab_variants_write" on public.email_campaign_ab_variants;
create policy "email_campaign_ab_variants_write"
  on public.email_campaign_ab_variants for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- Optional winner FK (after variants exist)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'email_campaign_ab_tests_winner_fk'
  ) then
    alter table public.email_campaign_ab_tests
      add constraint email_campaign_ab_tests_winner_fk
      foreign key (winner_variant_id)
      references public.email_campaign_ab_variants (id)
      on delete set null;
  end if;
end $$;

create table if not exists public.email_campaign_ab_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  ab_test_id uuid not null references public.email_campaign_ab_tests (id) on delete cascade,
  variant_id uuid not null references public.email_campaign_ab_variants (id) on delete cascade,
  enrollment_id uuid,
  recipient_snapshot_id uuid,
  assigned_at timestamptz not null default timezone('utc', now()),
  unique (ab_test_id, enrollment_id),
  unique (ab_test_id, recipient_snapshot_id)
);

create index if not exists email_campaign_ab_assignments_test_idx
  on public.email_campaign_ab_assignments (organization_id, ab_test_id);

alter table public.email_campaign_ab_assignments enable row level security;

drop policy if exists "email_campaign_ab_assignments_select"
  on public.email_campaign_ab_assignments;
create policy "email_campaign_ab_assignments_select"
  on public.email_campaign_ab_assignments for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "email_campaign_ab_assignments_write"
  on public.email_campaign_ab_assignments;
create policy "email_campaign_ab_assignments_write"
  on public.email_campaign_ab_assignments for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- AI subject line scores
-- ---------------------------------------------------------------------------

create table if not exists public.email_ai_subject_scores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  subject text not null,
  generation_id uuid,
  generation_variant_id uuid,
  ab_variant_id uuid references public.email_campaign_ab_variants (id) on delete set null,
  campaign_id uuid references public.email_campaigns (id) on delete set null,
  open_rate_score numeric(5,2) not null default 0,
  spam_risk_score numeric(5,2) not null default 0,
  professional_tone_score numeric(5,2) not null default 0,
  urgency_score numeric(5,2) not null default 0,
  personalization_score numeric(5,2) not null default 0,
  overall_score numeric(5,2) not null default 0,
  rationale_json jsonb not null default '{}'::jsonb,
  model text,
  provider text,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_ai_subject_scores_org_campaign_idx
  on public.email_ai_subject_scores (organization_id, campaign_id, created_at desc);

alter table public.email_ai_subject_scores enable row level security;

drop policy if exists "email_ai_subject_scores_select" on public.email_ai_subject_scores;
create policy "email_ai_subject_scores_select"
  on public.email_ai_subject_scores for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "email_ai_subject_scores_write" on public.email_ai_subject_scores;
create policy "email_ai_subject_scores_write"
  on public.email_ai_subject_scores for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Multi-channel extension stub (future SMS / WhatsApp / LinkedIn / push)
-- ---------------------------------------------------------------------------

create table if not exists public.email_campaign_channel_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  campaign_id uuid not null references public.email_campaigns (id) on delete cascade,
  channel text not null
    check (
      channel in (
        'email',
        'sms',
        'whatsapp',
        'linkedin',
        'push',
        'in_app'
      )
    ),
  enabled boolean not null default false,
  settings_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (campaign_id, channel)
);

alter table public.email_campaign_channel_plans enable row level security;

drop policy if exists "email_campaign_channel_plans_select"
  on public.email_campaign_channel_plans;
create policy "email_campaign_channel_plans_select"
  on public.email_campaign_channel_plans for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "email_campaign_channel_plans_write"
  on public.email_campaign_channel_plans;
create policy "email_campaign_channel_plans_write"
  on public.email_campaign_channel_plans for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

comment on column public.email_campaigns.workflow_graph_json is
  'Phase 25D — visual builder layout; execution source of truth remains sequence steps.';
comment on table public.email_campaign_ab_tests is
  'Phase 25D — A/B experiment definitions (assignment hooks into enrollments later).';
comment on table public.email_ai_subject_scores is
  'Phase 25D — scored AI subject line suggestions.';
comment on table public.email_campaign_channel_plans is
  'Phase 25D — future multi-channel campaign extension point.';
