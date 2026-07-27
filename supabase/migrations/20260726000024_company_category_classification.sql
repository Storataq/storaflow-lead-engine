-- Lead Engine — AI Company Category Classification (Phase 23B)
-- Additive only. Run manually AFTER 20260726000023_company_categories.sql
-- Do NOT auto-execute from the app.
-- Do NOT modify migrations 00001–00023.
-- Idempotent: safe to re-run after partial execution.

-- ---------------------------------------------------------------------------
-- Denormalized classification fields on companies (fast filters)
-- ---------------------------------------------------------------------------

alter table public.companies
  add column if not exists category_manual_override boolean not null default false,
  add column if not exists category_needs_review boolean not null default false,
  add column if not exists category_confidence numeric(5,2),
  add column if not exists suggested_company_category_id uuid,
  add column if not exists category_classified_at timestamptz,
  add column if not exists category_classified_by text
    check (
      category_classified_by is null
      or category_classified_by in ('automatic', 'manual', 'imported', 'hybrid')
    );

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'companies_suggested_company_category_id_fkey'
  ) then
    alter table public.companies
      add constraint companies_suggested_company_category_id_fkey
      foreign key (suggested_company_category_id)
      references public.company_categories (id)
      on delete set null;
  end if;
end $$;

create index if not exists companies_org_category_review_idx
  on public.companies (organization_id, category_needs_review, category_manual_override);

create index if not exists companies_org_category_confidence_idx
  on public.companies (organization_id, category_confidence);

-- ---------------------------------------------------------------------------
-- Latest classification result per company
-- ---------------------------------------------------------------------------

create table if not exists public.company_category_classifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  suggested_category_id uuid references public.company_categories (id) on delete set null,
  applied_category_id uuid references public.company_categories (id) on delete set null,
  confidence numeric(5,2) not null default 0,
  confidence_band text not null default 'unknown'
    check (confidence_band in (
      'auto_select', 'needs_confirmation', 'possible', 'unknown'
    )),
  reason text,
  keywords_json jsonb not null default '[]'::jsonb,
  alternatives_json jsonb not null default '[]'::jsonb,
  input_summary_json jsonb not null default '{}'::jsonb,
  source text not null default 'manual_reclassify'
    check (source in (
      'scrape', 'search', 'enrichment', 'csv_import', 'manual_create',
      'manual_reclassify', 'bulk', 'reset_automatic'
    )),
  classified_by text not null default 'automatic'
    check (classified_by in ('automatic', 'manual', 'imported', 'hybrid')),
  provider text,
  model text,
  actor_user_id uuid,
  manual_override boolean not null default false,
  needs_review boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id)
);

create index if not exists company_category_classifications_org_idx
  on public.company_category_classifications (organization_id, needs_review, confidence desc);

create index if not exists company_category_classifications_suggested_idx
  on public.company_category_classifications (organization_id, suggested_category_id);

drop trigger if exists company_category_classifications_set_updated_at
  on public.company_category_classifications;
create trigger company_category_classifications_set_updated_at
before update on public.company_category_classifications
for each row execute function public.set_updated_at();

alter table public.company_category_classifications enable row level security;

drop policy if exists "company_category_classifications_select"
  on public.company_category_classifications;
create policy "company_category_classifications_select"
  on public.company_category_classifications for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "company_category_classifications_insert"
  on public.company_category_classifications;
create policy "company_category_classifications_insert"
  on public.company_category_classifications for insert
  to authenticated with check (public.is_org_member(organization_id));

drop policy if exists "company_category_classifications_update"
  on public.company_category_classifications;
create policy "company_category_classifications_update"
  on public.company_category_classifications for update
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Classification history (audit trail)
-- ---------------------------------------------------------------------------

create table if not exists public.company_category_classification_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  classification_id uuid references public.company_category_classifications (id) on delete set null,
  old_category_id uuid references public.company_categories (id) on delete set null,
  new_category_id uuid references public.company_categories (id) on delete set null,
  suggested_category_id uuid references public.company_categories (id) on delete set null,
  confidence numeric(5,2),
  reason text,
  event_type text not null
    check (event_type in (
      'automatic_assign', 'suggestion_only', 'manual_override',
      'reclassify', 'reset_automatic', 'bulk_classify', 'imported_assign',
      'enrichment_classify', 'scrape_classify'
    )),
  is_automatic boolean not null default true,
  actor_user_id uuid,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists company_category_classification_history_company_idx
  on public.company_category_classification_history (organization_id, company_id, created_at desc);

alter table public.company_category_classification_history enable row level security;

drop policy if exists "company_category_classification_history_select"
  on public.company_category_classification_history;
create policy "company_category_classification_history_select"
  on public.company_category_classification_history for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "company_category_classification_history_insert"
  on public.company_category_classification_history;
create policy "company_category_classification_history_insert"
  on public.company_category_classification_history for insert
  to authenticated with check (public.is_org_member(organization_id));

comment on table public.company_category_classifications is
  'Phase 23B latest AI/heuristic category classification per company. Manual override blocks auto overwrite.';
comment on table public.company_category_classification_history is
  'Phase 23B audit trail for category classification and overrides.';
