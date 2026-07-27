import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import type {
  ActiveOrganizationContext,
  Organization,
  OrganizationMember,
  Profile,
} from "@/types/database";

export const ACTIVE_ORGANIZATION_COOKIE = "storaflow_active_organization_id";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Niet ingelogd");
  }

  return { supabase, user };
}

/**
 * Bepaalt organization_id server-side via lidmaatschap van de ingelogde gebruiker.
 * Nooit organization_id uit client-input overnemen.
 * Prefer cookie when the user belongs to that org; otherwise first membership.
 */
export async function getActiveOrganization(): Promise<ActiveOrganizationContext | null> {
  const { supabase, user } = await requireUser();
  const cookieStore = await cookies();
  const preferredOrgId = cookieStore.get(ACTIVE_ORGANIZATION_COOKIE)?.value;

  const { data: memberships, error: membershipError } = await supabase
    .from("organization_members")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (membershipError) {
    throw new Error(`Kon organisatielidmaatschap niet laden: ${membershipError.message}`);
  }

  if (!memberships?.length) {
    return null;
  }

  const typedMemberships = memberships as OrganizationMember[];
  const membership =
    (preferredOrgId
      ? typedMemberships.find((row) => row.organization_id === preferredOrgId)
      : null) ?? typedMemberships[0];

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", membership.organization_id)
    .single();

  if (organizationError || !organization) {
    throw new Error(
      `Kon organisatie niet laden: ${organizationError?.message ?? "onbekend"}`,
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    organization: organization as Organization,
    membership,
    profile: (profile as Profile | null) ?? null,
  };
}

export async function listUserOrganizations(): Promise<
  Array<{ organization: Organization; membership: OrganizationMember }>
> {
  const { supabase, user } = await requireUser();

  const { data: memberships, error } = await supabase
    .from("organization_members")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Kon organisaties niet laden: ${error.message}`);
  }

  if (!memberships?.length) return [];

  const typedMemberships = memberships as OrganizationMember[];
  const orgIds = typedMemberships.map((row) => row.organization_id);
  const { data: organizations, error: orgError } = await supabase
    .from("organizations")
    .select("*")
    .in("id", orgIds);

  if (orgError) {
    throw new Error(`Kon organisaties niet laden: ${orgError.message}`);
  }

  const orgById = new Map(
    ((organizations ?? []) as Organization[]).map((org) => [org.id, org]),
  );

  return typedMemberships
    .map((membership) => {
      const organization = orgById.get(membership.organization_id);
      if (!organization) return null;
      return { organization, membership };
    })
    .filter((row): row is { organization: Organization; membership: OrganizationMember } =>
      Boolean(row),
    );
}

export function slugifyOrganizationName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
