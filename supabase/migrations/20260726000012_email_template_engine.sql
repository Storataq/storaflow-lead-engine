-- Lead Engine — Email Template & Personalization Engine (Phase 21B)
-- Additive only. Run manually AFTER 20260726000011_email_engine_foundation.sql
-- Do NOT auto-execute from the app.
-- NO email sending in this phase.

-- ---------------------------------------------------------------------------
-- email_template_folders
-- ---------------------------------------------------------------------------

create table if not exists public.email_template_folders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  slug text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, slug)
);

create index if not exists email_template_folders_org_idx
  on public.email_template_folders (organization_id, sort_order);

create trigger email_template_folders_set_updated_at
before update on public.email_template_folders
for each row execute function public.set_updated_at();

alter table public.email_template_folders enable row level security;

create policy "email_template_folders_select" on public.email_template_folders
  for select to authenticated using (public.is_org_member(organization_id));
create policy "email_template_folders_insert" on public.email_template_folders
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "email_template_folders_update" on public.email_template_folders
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "email_template_folders_delete" on public.email_template_folders
  for delete to authenticated using (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Extend email_templates
-- ---------------------------------------------------------------------------

alter table public.email_templates
  add column if not exists description text,
  add column if not exists created_by uuid,
  add column if not exists archived_at timestamptz,
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists folder_id uuid
    references public.email_template_folders (id) on delete set null,
  add column if not exists is_library_placeholder boolean not null default false,
  add column if not exists fallbacks_json jsonb not null default '{}'::jsonb;

-- Expand status constraint to include deprecated
do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.email_templates'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%';

  if cname is not null then
    execute format('alter table public.email_templates drop constraint %I', cname);
  end if;

  alter table public.email_templates
    add constraint email_templates_status_check
    check (status in ('draft', 'active', 'archived', 'deprecated'));
end $$;

create index if not exists email_templates_org_category_idx
  on public.email_templates (organization_id, category);

create index if not exists email_templates_org_folder_idx
  on public.email_templates (organization_id, folder_id);

create index if not exists email_templates_org_language_idx
  on public.email_templates (organization_id, language);

-- ---------------------------------------------------------------------------
-- email_template_versions (immutable snapshots)
-- ---------------------------------------------------------------------------

create table if not exists public.email_template_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  template_id uuid not null references public.email_templates (id) on delete cascade,
  version_number integer not null check (version_number >= 1),
  name text not null,
  subject text not null default '',
  preview_text text,
  html_body text not null default '',
  text_body text,
  variables text[] not null default '{}'::text[],
  change_notes text,
  is_current boolean not null default false,
  previous_version_number integer,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  unique (template_id, version_number)
);

create index if not exists email_template_versions_template_idx
  on public.email_template_versions (template_id, version_number desc);

create index if not exists email_template_versions_org_idx
  on public.email_template_versions (organization_id, created_at desc);

alter table public.email_template_versions enable row level security;

create policy "email_template_versions_select" on public.email_template_versions
  for select to authenticated using (public.is_org_member(organization_id));
create policy "email_template_versions_insert" on public.email_template_versions
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "email_template_versions_update" on public.email_template_versions
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "email_template_versions_delete" on public.email_template_versions
  for delete to authenticated using (public.is_org_member(organization_id));

comment on table public.email_template_versions is
  'Immutable template version snapshots — never overwrite published rows';
comment on column public.email_templates.is_library_placeholder is
  'Reserved for future default library templates (no AI content yet)';
