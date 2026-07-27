-- Storaflow — Executive Analytics Dashboard (Phase 25G)
-- Additive only. Run manually AFTER 20260726000031_ai_sales_automation_engine.sql
-- Do NOT auto-execute from the app.
-- Do NOT modify migrations 00001–00031.
-- Persists saved dashboard report configurations (filters + layout prefs).
-- Idempotent: safe to re-run after partial execution.

-- ---------------------------------------------------------------------------
-- Saved executive reports
-- ---------------------------------------------------------------------------

create table if not exists public.crm_executive_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  filters_json jsonb not null default '{}'::jsonb,
  layout_json jsonb not null default '{}'::jsonb,
  is_favorite boolean not null default false,
  is_default boolean not null default false,
  is_archived boolean not null default false,
  created_by uuid,
  updated_by uuid,
  -- Future scheduled reports (not implemented in 25G)
  schedule_cron text,
  schedule_enabled boolean not null default false,
  last_exported_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists crm_executive_reports_org_idx
  on public.crm_executive_reports (organization_id, is_archived, updated_at desc);

create unique index if not exists crm_executive_reports_one_default_idx
  on public.crm_executive_reports (organization_id)
  where is_default = true and is_archived = false;

drop trigger if exists crm_executive_reports_set_updated_at on public.crm_executive_reports;
create trigger crm_executive_reports_set_updated_at
before update on public.crm_executive_reports
for each row execute function public.set_updated_at();

alter table public.crm_executive_reports enable row level security;

drop policy if exists "crm_executive_reports_select" on public.crm_executive_reports;
create policy "crm_executive_reports_select"
  on public.crm_executive_reports for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "crm_executive_reports_insert" on public.crm_executive_reports;
create policy "crm_executive_reports_insert"
  on public.crm_executive_reports for insert
  to authenticated with check (public.is_org_member(organization_id));

drop policy if exists "crm_executive_reports_update" on public.crm_executive_reports;
create policy "crm_executive_reports_update"
  on public.crm_executive_reports for update
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

drop policy if exists "crm_executive_reports_delete" on public.crm_executive_reports;
create policy "crm_executive_reports_delete"
  on public.crm_executive_reports for delete
  to authenticated using (public.is_org_owner_or_admin(organization_id));
