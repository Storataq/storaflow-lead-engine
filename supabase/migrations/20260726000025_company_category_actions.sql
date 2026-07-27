-- Lead Engine — Category Actions & Smart Routing (Phase 23C)
-- Additive only. Run manually AFTER 20260726000024_company_category_classification.sql
-- Do NOT auto-execute from the app.
-- Do NOT modify migrations 00001–00024.
-- Idempotent: safe to re-run after partial execution.

-- ---------------------------------------------------------------------------
-- Funnel activation provenance (optional category link)
-- ---------------------------------------------------------------------------

alter table public.funnel_activation_runs
  add column if not exists source_company_category_id uuid
    references public.company_categories (id) on delete set null;

create index if not exists funnel_activation_runs_category_idx
  on public.funnel_activation_runs (organization_id, source_company_category_id);

-- ---------------------------------------------------------------------------
-- Category action runs — audit + future extension point
-- ---------------------------------------------------------------------------

create table if not exists public.company_category_action_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  company_category_id uuid not null references public.company_categories (id) on delete cascade,
  action_type text not null,
  status text not null default 'completed'
    check (status in ('pending', 'running', 'completed', 'failed', 'cancelled')),
  company_ids jsonb not null default '[]'::jsonb,
  company_count integer not null default 0,
  result_summary jsonb not null default '{}'::jsonb,
  error_message text,
  actor_user_id uuid,
  confirmed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create index if not exists company_category_action_runs_org_cat_idx
  on public.company_category_action_runs (organization_id, company_category_id, created_at desc);

create index if not exists company_category_action_runs_org_type_idx
  on public.company_category_action_runs (organization_id, action_type, created_at desc);

alter table public.company_category_action_runs enable row level security;

-- RBAC helpers (from 00001): public.is_org_member, public.is_org_owner_or_admin.
-- Do NOT use public.is_org_admin — that function does not exist.
-- Pattern matches company_categories (00023): members read; owner/admin write.

drop policy if exists "company_category_action_runs_select"
  on public.company_category_action_runs;
create policy "company_category_action_runs_select"
  on public.company_category_action_runs for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "company_category_action_runs_insert"
  on public.company_category_action_runs;
create policy "company_category_action_runs_insert"
  on public.company_category_action_runs for insert
  to authenticated with check (public.is_org_owner_or_admin(organization_id));

drop policy if exists "company_category_action_runs_update"
  on public.company_category_action_runs;
create policy "company_category_action_runs_update"
  on public.company_category_action_runs for update
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

drop policy if exists "company_category_action_runs_delete"
  on public.company_category_action_runs;
create policy "company_category_action_runs_delete"
  on public.company_category_action_runs for delete
  to authenticated using (public.is_org_owner_or_admin(organization_id));

comment on table public.company_category_action_runs is
  'Phase 23C audit log for category bulk actions. Extension point for future plugins (WhatsApp, SMS, webhooks).';
