import { createClient } from "@/lib/supabase/server";
import type {
  ActiveOrganizationContext,
  Organization,
  OrganizationMember,
  Profile,
} from "@/types/database";

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
 */
export async function getActiveOrganization(): Promise<ActiveOrganizationContext | null> {
  const { supabase, user } = await requireUser();

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw new Error(`Kon organisatielidmaatschap niet laden: ${membershipError.message}`);
  }

  if (!membership) {
    return null;
  }

  const typedMembership = membership as OrganizationMember;

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", typedMembership.organization_id)
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
    membership: typedMembership,
    profile: (profile as Profile | null) ?? null,
  };
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
