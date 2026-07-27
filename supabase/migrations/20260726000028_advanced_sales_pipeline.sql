-- Storaflow — Advanced CRM & Sales Pipeline (Phase 25C)
-- Additive only. Run manually AFTER 20260726000027_contact_intelligence.sql
-- Do NOT auto-execute from the app.
-- Do NOT modify migrations 00001–00027.
-- Idempotent: safe to re-run after partial execution.

-- ---------------------------------------------------------------------------
-- Pipelines: archive support
-- ---------------------------------------------------------------------------

alter table public.crm_pipelines
  add column if not exists is_archived boolean not null default false,
  add column if not exists archived_at timestamptz;

create index if not exists crm_pipelines_org_active_idx
  on public.crm_pipelines (organization_id, is_archived, sort_order);

-- ---------------------------------------------------------------------------
-- Stages: win probability
-- ---------------------------------------------------------------------------

alter table public.crm_funnel_stages
  add column if not exists probability integer not null default 0
    check (probability >= 0 and probability <= 100);

-- Best-effort backfill for common default slugs (existing orgs)
update public.crm_funnel_stages set probability = 10 where slug = 'nieuw' and probability = 0;
update public.crm_funnel_stages set probability = 25 where slug = 'gekwalificeerd' and probability = 0;
update public.crm_funnel_stages set probability = 35 where slug = 'contact-gepland' and probability = 0;
update public.crm_funnel_stages set probability = 40 where slug = 'eerste-email' and probability = 0;
update public.crm_funnel_stages set probability = 50 where slug = 'follow-up' and probability = 0;
update public.crm_funnel_stages set probability = 60 where slug = 'demo-gepland' and probability = 0;
update public.crm_funnel_stages set probability = 75 where slug = 'onderhandeling' and probability = 0;
update public.crm_funnel_stages set probability = 100 where is_won = true;
update public.crm_funnel_stages set probability = 0 where is_lost = true;

-- ---------------------------------------------------------------------------
-- Deals: advanced sales fields
-- ---------------------------------------------------------------------------

alter table public.crm_deals
  add column if not exists description text,
  add column if not exists probability integer
    check (probability is null or (probability >= 0 and probability <= 100)),
  add column if not exists expected_revenue numeric(14,2),
  add column if not exists priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists primary_contact_id uuid
    references public.crm_lead_contacts (id) on delete set null,
  add column if not exists closed_at timestamptz,
  add column if not exists won_reason text,
  add column if not exists lost_reason text,
  add column if not exists close_notes text,
  add column if not exists competitor text,
  add column if not exists last_stage_changed_at timestamptz;

create index if not exists crm_deals_org_pipeline_stage_idx
  on public.crm_deals (organization_id, pipeline_id, stage_id);

create index if not exists crm_deals_org_priority_idx
  on public.crm_deals (organization_id, priority);

-- ---------------------------------------------------------------------------
-- Tasks: typed sales activities
-- ---------------------------------------------------------------------------

alter table public.crm_tasks
  add column if not exists task_type text not null default 'internal'
    check (
      task_type in (
        'call',
        'meeting',
        'email',
        'follow_up',
        'demo',
        'proposal',
        'reminder',
        'internal'
      )
    );

-- ---------------------------------------------------------------------------
-- Deal stage history (timeline / audit)
-- ---------------------------------------------------------------------------

create table if not exists public.crm_deal_stage_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  deal_id uuid not null references public.crm_deals (id) on delete cascade,
  from_stage_id uuid references public.crm_funnel_stages (id) on delete set null,
  to_stage_id uuid not null references public.crm_funnel_stages (id) on delete restrict,
  from_status text,
  to_status text,
  changed_by uuid,
  note text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists crm_deal_stage_history_deal_idx
  on public.crm_deal_stage_history (organization_id, deal_id, created_at desc);

alter table public.crm_deal_stage_history enable row level security;

drop policy if exists "crm_deal_stage_history_select" on public.crm_deal_stage_history;
create policy "crm_deal_stage_history_select"
  on public.crm_deal_stage_history for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "crm_deal_stage_history_insert" on public.crm_deal_stage_history;
create policy "crm_deal_stage_history_insert"
  on public.crm_deal_stage_history for insert
  to authenticated with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Close reason catalog (won / lost analysis)
-- ---------------------------------------------------------------------------

create table if not exists public.crm_close_reasons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind text not null check (kind in ('won', 'lost')),
  code text not null,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, kind, code)
);

create index if not exists crm_close_reasons_org_kind_idx
  on public.crm_close_reasons (organization_id, kind, sort_order);

alter table public.crm_close_reasons enable row level security;

drop policy if exists "crm_close_reasons_select" on public.crm_close_reasons;
create policy "crm_close_reasons_select"
  on public.crm_close_reasons for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "crm_close_reasons_write" on public.crm_close_reasons;
create policy "crm_close_reasons_write"
  on public.crm_close_reasons for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Automation extension point (future workers subscribe to these events)
-- ---------------------------------------------------------------------------

create table if not exists public.crm_automation_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  event_type text not null,
  entity_type text not null,
  entity_id uuid not null,
  payload_json jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists crm_automation_events_pending_idx
  on public.crm_automation_events (organization_id, created_at)
  where processed_at is null;

alter table public.crm_automation_events enable row level security;

drop policy if exists "crm_automation_events_select" on public.crm_automation_events;
create policy "crm_automation_events_select"
  on public.crm_automation_events for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "crm_automation_events_insert" on public.crm_automation_events;
create policy "crm_automation_events_insert"
  on public.crm_automation_events for insert
  to authenticated with check (public.is_org_member(organization_id));

comment on table public.crm_deal_stage_history is
  'Phase 25C — deal stage move audit / timeline.';
comment on table public.crm_close_reasons is
  'Phase 25C — org catalog for won/lost reason analysis.';
comment on table public.crm_automation_events is
  'Phase 25C — outbox for future pipeline automation workers.';
