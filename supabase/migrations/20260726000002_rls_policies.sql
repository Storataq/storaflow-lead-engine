-- Lead Engine — Row Level Security policies
-- Voer uit NA 20260726000001_initial_schema.sql

-- ---------------------------------------------------------------------------
-- Table/function privileges for Supabase roles
-- (zonder deze GRANTs krijg je "permission denied for table ...")
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;

grant usage, select on all sequences in schema public
  to anon, authenticated, service_role;

grant execute on all functions in schema public
  to anon, authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables
  to anon, authenticated, service_role;

alter default privileges in schema public
  grant usage, select on sequences
  to anon, authenticated, service_role;

alter default privileges in schema public
  grant execute on functions
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_settings enable row level security;
alter table public.search_queries enable row level security;
alter table public.scrape_jobs enable row level security;
alter table public.scrape_sources enable row level security;
alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.company_sources enable row level security;
alter table public.exclusion_list enable row level security;
alter table public.scrape_errors enable row level security;
alter table public.activity_events enable row level security;
alter table public.export_runs enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (user_id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------

create policy "organizations_select_member"
  on public.organizations for select
  to authenticated
  using (public.is_org_member(id));

create policy "organizations_insert_authenticated"
  on public.organizations for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "organizations_update_admin"
  on public.organizations for update
  to authenticated
  using (public.is_org_owner_or_admin(id))
  with check (public.is_org_owner_or_admin(id));

-- ---------------------------------------------------------------------------
-- organization_members
-- ---------------------------------------------------------------------------

create policy "organization_members_select_member"
  on public.organization_members for select
  to authenticated
  using (public.is_org_member(organization_id));

create policy "organization_members_insert_admin_or_self_owner"
  on public.organization_members for insert
  to authenticated
  with check (
    -- Creating the first owner membership for an org you just created
    (
      user_id = auth.uid()
      and role = 'owner'
      and exists (
        select 1
        from public.organizations o
        where o.id = organization_id
          and o.created_by = auth.uid()
      )
    )
    or public.is_org_owner_or_admin(organization_id)
  );

create policy "organization_members_update_admin"
  on public.organization_members for update
  to authenticated
  using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

create policy "organization_members_delete_admin"
  on public.organization_members for delete
  to authenticated
  using (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- organization_settings
-- ---------------------------------------------------------------------------

create policy "organization_settings_select_member"
  on public.organization_settings for select
  to authenticated
  using (public.is_org_member(organization_id));

create policy "organization_settings_insert_admin"
  on public.organization_settings for insert
  to authenticated
  with check (public.is_org_owner_or_admin(organization_id));

create policy "organization_settings_update_admin"
  on public.organization_settings for update
  to authenticated
  using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Generic org-scoped CRUD helper pattern for remaining tables
-- ---------------------------------------------------------------------------

-- search_queries
create policy "search_queries_select" on public.search_queries for select to authenticated
  using (public.is_org_member(organization_id));
create policy "search_queries_insert" on public.search_queries for insert to authenticated
  with check (public.is_org_member(organization_id) and created_by = auth.uid());
create policy "search_queries_update" on public.search_queries for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "search_queries_delete" on public.search_queries for delete to authenticated
  using (public.is_org_owner_or_admin(organization_id));

-- scrape_jobs
create policy "scrape_jobs_select" on public.scrape_jobs for select to authenticated
  using (public.is_org_member(organization_id));
create policy "scrape_jobs_insert" on public.scrape_jobs for insert to authenticated
  with check (public.is_org_member(organization_id));
create policy "scrape_jobs_update" on public.scrape_jobs for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- scrape_sources
create policy "scrape_sources_select" on public.scrape_sources for select to authenticated
  using (public.is_org_member(organization_id));
create policy "scrape_sources_insert" on public.scrape_sources for insert to authenticated
  with check (public.is_org_owner_or_admin(organization_id));
create policy "scrape_sources_update" on public.scrape_sources for update to authenticated
  using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));
create policy "scrape_sources_delete" on public.scrape_sources for delete to authenticated
  using (public.is_org_owner_or_admin(organization_id));

-- companies
create policy "companies_select" on public.companies for select to authenticated
  using (public.is_org_member(organization_id));
create policy "companies_insert" on public.companies for insert to authenticated
  with check (public.is_org_member(organization_id));
create policy "companies_update" on public.companies for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "companies_delete" on public.companies for delete to authenticated
  using (public.is_org_owner_or_admin(organization_id));

-- contacts
create policy "contacts_select" on public.contacts for select to authenticated
  using (public.is_org_member(organization_id));
create policy "contacts_insert" on public.contacts for insert to authenticated
  with check (public.is_org_member(organization_id));
create policy "contacts_update" on public.contacts for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "contacts_delete" on public.contacts for delete to authenticated
  using (public.is_org_owner_or_admin(organization_id));

-- company_sources
create policy "company_sources_select" on public.company_sources for select to authenticated
  using (public.is_org_member(organization_id));
create policy "company_sources_insert" on public.company_sources for insert to authenticated
  with check (public.is_org_member(organization_id));

-- exclusion_list
create policy "exclusion_list_select" on public.exclusion_list for select to authenticated
  using (public.is_org_member(organization_id));
create policy "exclusion_list_insert" on public.exclusion_list for insert to authenticated
  with check (public.is_org_member(organization_id));
create policy "exclusion_list_update" on public.exclusion_list for update to authenticated
  using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));
create policy "exclusion_list_delete" on public.exclusion_list for delete to authenticated
  using (public.is_org_owner_or_admin(organization_id));

-- scrape_errors
create policy "scrape_errors_select" on public.scrape_errors for select to authenticated
  using (public.is_org_member(organization_id));
create policy "scrape_errors_insert" on public.scrape_errors for insert to authenticated
  with check (public.is_org_member(organization_id));

-- activity_events
create policy "activity_events_select" on public.activity_events for select to authenticated
  using (public.is_org_member(organization_id));
create policy "activity_events_insert" on public.activity_events for insert to authenticated
  with check (public.is_org_member(organization_id));

-- export_runs
create policy "export_runs_select" on public.export_runs for select to authenticated
  using (public.is_org_member(organization_id));
create policy "export_runs_insert" on public.export_runs for insert to authenticated
  with check (public.is_org_member(organization_id) and created_by = auth.uid());
