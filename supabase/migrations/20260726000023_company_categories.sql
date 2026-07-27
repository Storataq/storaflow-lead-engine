-- Lead Engine — Company Categories (Phase 23A)
-- Additive only. Run manually AFTER 20260726000022_email_production_hardening.sql
-- Do NOT auto-execute from the app.
-- Do NOT modify migrations 00001–00022.
-- Idempotent: safe to re-run after partial execution.

-- ---------------------------------------------------------------------------
-- Company categories (org-scoped taxonomy)
-- ---------------------------------------------------------------------------

create table if not exists public.company_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  icon text,
  color text,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  is_system_default boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, slug),
  unique (organization_id, name)
);

create index if not exists company_categories_org_active_sort_idx
  on public.company_categories (organization_id, is_active, sort_order, name);

create index if not exists company_categories_org_name_idx
  on public.company_categories (organization_id, lower(name));

drop trigger if exists company_categories_set_updated_at on public.company_categories;
create trigger company_categories_set_updated_at
before update on public.company_categories
for each row execute function public.set_updated_at();

alter table public.company_categories enable row level security;

drop policy if exists "company_categories_select" on public.company_categories;
create policy "company_categories_select"
  on public.company_categories for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "company_categories_insert" on public.company_categories;
create policy "company_categories_insert"
  on public.company_categories for insert
  to authenticated with check (public.is_org_owner_or_admin(organization_id));

drop policy if exists "company_categories_update" on public.company_categories;
create policy "company_categories_update"
  on public.company_categories for update
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

drop policy if exists "company_categories_delete" on public.company_categories;
create policy "company_categories_delete"
  on public.company_categories for delete
  to authenticated using (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Companies: optional single category assignment (additive)
-- ---------------------------------------------------------------------------

alter table public.companies
  add column if not exists company_category_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'companies_company_category_id_fkey'
  ) then
    alter table public.companies
      add constraint companies_company_category_id_fkey
      foreign key (company_category_id)
      references public.company_categories (id)
      on delete set null;
  end if;
end $$;

create index if not exists companies_org_category_idx
  on public.companies (organization_id, company_category_id);

comment on table public.company_categories is
  'Phase 23A org-scoped company categories. Foundation for CRM, search, scraping, email, funnels and AI.';
comment on column public.companies.company_category_id is
  'Optional FK to company_categories. Existing industry text field is preserved.';
