-- Fix: bootstrap eerste organisatie
-- Oorzaak: INSERT .select() vereist ook SELECT-policy.
-- De oude SELECT stond alleen is_org_member(id) toe, maar lidmaatschap
-- bestaat pas NA de insert → RLS-fout "new row violates row-level security policy".
-- Zelfde SELECT is nodig zodat organization_members-policy de org kan zien
-- via EXISTS (created_by = auth.uid()).

drop policy if exists "organizations_select_member" on public.organizations;
drop policy if exists "organizations_insert_authenticated" on public.organizations;

-- SELECT: lid OF maker (nodig voor insert-returning + member-bootstrap)
create policy "organizations_select_member_or_creator"
  on public.organizations for select
  to authenticated
  using (
    public.is_org_member(id)
    or created_by = auth.uid()
  );

-- INSERT: alleen eerste org voor gebruiker zonder membership
create policy "organizations_insert_first_org"
  on public.organizations for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and not exists (
      select 1
      from public.organization_members m
      where m.user_id = auth.uid()
    )
  );
