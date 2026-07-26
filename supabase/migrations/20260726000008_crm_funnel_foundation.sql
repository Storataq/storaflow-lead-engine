-- Lead Engine — CRM & Funnel foundation
-- Voer uit NA 20260726000007_job_queue_foundation.sql

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.crm_lead_status as enum (
  'open',
  'won',
  'lost',
  'archived'
);

create type public.crm_deal_status as enum (
  'open',
  'won',
  'lost'
);

create type public.crm_task_priority as enum (
  'low',
  'normal',
  'high',
  'urgent'
);

create type public.crm_task_status as enum (
  'todo',
  'in_progress',
  'done',
  'cancelled'
);

-- ---------------------------------------------------------------------------
-- crm_pipelines
-- ---------------------------------------------------------------------------

create table public.crm_pipelines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  color text not null default '#2563eb',
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, slug)
);

create index crm_pipelines_organization_id_idx
  on public.crm_pipelines (organization_id, sort_order);

create trigger crm_pipelines_set_updated_at
before update on public.crm_pipelines
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- crm_funnel_stages
-- ---------------------------------------------------------------------------

create table public.crm_funnel_stages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  pipeline_id uuid not null references public.crm_pipelines (id) on delete cascade,
  name text not null,
  slug text not null,
  color text not null default '#64748b',
  sort_order integer not null default 0,
  is_won boolean not null default false,
  is_lost boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (pipeline_id, slug),
  check (not (is_won and is_lost))
);

create index crm_funnel_stages_pipeline_id_idx
  on public.crm_funnel_stages (pipeline_id, sort_order);

create index crm_funnel_stages_organization_id_idx
  on public.crm_funnel_stages (organization_id);

create trigger crm_funnel_stages_set_updated_at
before update on public.crm_funnel_stages
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- crm_leads
-- ---------------------------------------------------------------------------

create table public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  pipeline_id uuid not null references public.crm_pipelines (id) on delete restrict,
  stage_id uuid not null references public.crm_funnel_stages (id) on delete restrict,
  company_id uuid references public.companies (id) on delete set null,
  company_name text not null,
  contact_name text,
  email text,
  phone text,
  website text,
  country text,
  city text,
  industry text,
  owner_user_id uuid,
  source text,
  lead_score integer not null default 0 check (lead_score >= 0 and lead_score <= 100),
  status public.crm_lead_status not null default 'open',
  tags text[] not null default '{}'::text[],
  notes text,
  deal_value numeric(12, 2) not null default 0,
  currency text not null default 'EUR',
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index crm_leads_organization_id_idx
  on public.crm_leads (organization_id, created_at desc);

create index crm_leads_pipeline_stage_idx
  on public.crm_leads (pipeline_id, stage_id);

create index crm_leads_company_id_idx
  on public.crm_leads (company_id);

create index crm_leads_owner_user_id_idx
  on public.crm_leads (organization_id, owner_user_id);

create trigger crm_leads_set_updated_at
before update on public.crm_leads
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- crm_deals
-- ---------------------------------------------------------------------------

create table public.crm_deals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  lead_id uuid references public.crm_leads (id) on delete set null,
  pipeline_id uuid not null references public.crm_pipelines (id) on delete restrict,
  stage_id uuid not null references public.crm_funnel_stages (id) on delete restrict,
  title text not null,
  value numeric(12, 2) not null default 0,
  currency text not null default 'EUR',
  status public.crm_deal_status not null default 'open',
  expected_close_date date,
  owner_user_id uuid,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index crm_deals_organization_id_idx
  on public.crm_deals (organization_id, created_at desc);

create index crm_deals_pipeline_stage_idx
  on public.crm_deals (pipeline_id, stage_id);

create trigger crm_deals_set_updated_at
before update on public.crm_deals
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- crm_tasks
-- ---------------------------------------------------------------------------

create table public.crm_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  lead_id uuid references public.crm_leads (id) on delete cascade,
  deal_id uuid references public.crm_deals (id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz,
  priority public.crm_task_priority not null default 'normal',
  status public.crm_task_status not null default 'todo',
  assigned_user_id uuid,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index crm_tasks_organization_id_idx
  on public.crm_tasks (organization_id, due_at);

create index crm_tasks_lead_id_idx
  on public.crm_tasks (lead_id);

create trigger crm_tasks_set_updated_at
before update on public.crm_tasks
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- crm_notes
-- ---------------------------------------------------------------------------

create table public.crm_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  lead_id uuid references public.crm_leads (id) on delete cascade,
  deal_id uuid references public.crm_deals (id) on delete cascade,
  body_html text not null default '',
  body_text text not null default '',
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (lead_id is not null or deal_id is not null)
);

create index crm_notes_lead_id_idx
  on public.crm_notes (lead_id, created_at desc);

create index crm_notes_organization_id_idx
  on public.crm_notes (organization_id, created_at desc);

create trigger crm_notes_set_updated_at
before update on public.crm_notes
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.crm_pipelines enable row level security;
alter table public.crm_funnel_stages enable row level security;
alter table public.crm_leads enable row level security;
alter table public.crm_deals enable row level security;
alter table public.crm_tasks enable row level security;
alter table public.crm_notes enable row level security;

create policy "crm_pipelines_select" on public.crm_pipelines for select to authenticated
  using (public.is_org_member(organization_id));
create policy "crm_pipelines_insert" on public.crm_pipelines for insert to authenticated
  with check (public.is_org_member(organization_id));
create policy "crm_pipelines_update" on public.crm_pipelines for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "crm_pipelines_delete" on public.crm_pipelines for delete to authenticated
  using (public.is_org_member(organization_id));

create policy "crm_funnel_stages_select" on public.crm_funnel_stages for select to authenticated
  using (public.is_org_member(organization_id));
create policy "crm_funnel_stages_insert" on public.crm_funnel_stages for insert to authenticated
  with check (public.is_org_member(organization_id));
create policy "crm_funnel_stages_update" on public.crm_funnel_stages for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "crm_funnel_stages_delete" on public.crm_funnel_stages for delete to authenticated
  using (public.is_org_member(organization_id));

create policy "crm_leads_select" on public.crm_leads for select to authenticated
  using (public.is_org_member(organization_id));
create policy "crm_leads_insert" on public.crm_leads for insert to authenticated
  with check (public.is_org_member(organization_id));
create policy "crm_leads_update" on public.crm_leads for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "crm_leads_delete" on public.crm_leads for delete to authenticated
  using (public.is_org_member(organization_id));

create policy "crm_deals_select" on public.crm_deals for select to authenticated
  using (public.is_org_member(organization_id));
create policy "crm_deals_insert" on public.crm_deals for insert to authenticated
  with check (public.is_org_member(organization_id));
create policy "crm_deals_update" on public.crm_deals for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "crm_deals_delete" on public.crm_deals for delete to authenticated
  using (public.is_org_member(organization_id));

create policy "crm_tasks_select" on public.crm_tasks for select to authenticated
  using (public.is_org_member(organization_id));
create policy "crm_tasks_insert" on public.crm_tasks for insert to authenticated
  with check (public.is_org_member(organization_id));
create policy "crm_tasks_update" on public.crm_tasks for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "crm_tasks_delete" on public.crm_tasks for delete to authenticated
  using (public.is_org_member(organization_id));

create policy "crm_notes_select" on public.crm_notes for select to authenticated
  using (public.is_org_member(organization_id));
create policy "crm_notes_insert" on public.crm_notes for insert to authenticated
  with check (public.is_org_member(organization_id));
create policy "crm_notes_update" on public.crm_notes for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "crm_notes_delete" on public.crm_notes for delete to authenticated
  using (public.is_org_member(organization_id));
