-- Lead Engine — CRM lead contacts (additive)
-- Voer uit NA 20260726000008_crm_funnel_foundation.sql
-- Geen destructieve wijzigingen; bestaande tabellen blijven intact.

create table public.crm_lead_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  lead_id uuid not null references public.crm_leads (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  job_title text,
  email text,
  phone text,
  linkedin_url text,
  is_primary boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index crm_lead_contacts_lead_id_idx
  on public.crm_lead_contacts (lead_id, created_at desc);

create index crm_lead_contacts_organization_id_idx
  on public.crm_lead_contacts (organization_id);

create trigger crm_lead_contacts_set_updated_at
before update on public.crm_lead_contacts
for each row execute function public.set_updated_at();

alter table public.crm_lead_contacts enable row level security;

create policy "crm_lead_contacts_select" on public.crm_lead_contacts for select to authenticated
  using (public.is_org_member(organization_id));
create policy "crm_lead_contacts_insert" on public.crm_lead_contacts for insert to authenticated
  with check (public.is_org_member(organization_id));
create policy "crm_lead_contacts_update" on public.crm_lead_contacts for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "crm_lead_contacts_delete" on public.crm_lead_contacts for delete to authenticated
  using (public.is_org_member(organization_id));
