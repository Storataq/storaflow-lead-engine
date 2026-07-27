/**
 * Duplicate detection for prospects / companies / contacts.
 */

import { createClient } from "@/lib/supabase/server";

export function normalizeProspectName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeDomainFromUrl(url?: string | null): string | null {
  if (!url?.trim()) return null;
  try {
    const withProto = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const host = new URL(withProto).hostname.toLowerCase().replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

export type DuplicateMatch = {
  kind: "prospect" | "company" | "contact";
  id: string;
  label: string;
  reason: string;
};

export async function findProspectDuplicates(params: {
  organizationId: string;
  companyName: string;
  websiteUrl?: string | null;
  email?: string | null;
  excludeProspectId?: string | null;
}): Promise<DuplicateMatch[]> {
  const supabase = await createClient();
  const matches: DuplicateMatch[] = [];
  const domain = normalizeDomainFromUrl(params.websiteUrl);
  const normalizedName = normalizeProspectName(params.companyName);

  if (domain) {
    const { data: prospects } = await supabase
      .from("prospecting_prospects")
      .select("id, company_name")
      .eq("organization_id", params.organizationId)
      .eq("normalized_domain", domain)
      .is("deleted_at", null)
      .limit(5);
    for (const row of prospects ?? []) {
      if (params.excludeProspectId && row.id === params.excludeProspectId) continue;
      matches.push({
        kind: "prospect",
        id: row.id,
        label: row.company_name,
        reason: `Zelfde domein (${domain})`,
      });
    }

    const { data: companies } = await supabase
      .from("companies")
      .select("id, company_name")
      .eq("organization_id", params.organizationId)
      .eq("normalized_domain", domain)
      .limit(5);
    for (const row of companies ?? []) {
      matches.push({
        kind: "company",
        id: row.id,
        label: row.company_name,
        reason: `Bedrijf met zelfde domein (${domain})`,
      });
    }
  }

  if (normalizedName) {
    const { data: byName } = await supabase
      .from("prospecting_prospects")
      .select("id, company_name, normalized_name")
      .eq("organization_id", params.organizationId)
      .eq("normalized_name", normalizedName)
      .is("deleted_at", null)
      .limit(5);
    for (const row of byName ?? []) {
      if (params.excludeProspectId && row.id === params.excludeProspectId) continue;
      if (matches.some((m) => m.id === row.id)) continue;
      matches.push({
        kind: "prospect",
        id: row.id,
        label: row.company_name,
        reason: "Zelfde genormaliseerde bedrijfsnaam",
      });
    }
  }

  if (params.email?.trim()) {
    const email = params.email.trim().toLowerCase();
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, contact_value, person_name, company_id")
      .eq("organization_id", params.organizationId)
      .ilike("normalized_value", email)
      .limit(5);
    for (const row of contacts ?? []) {
      matches.push({
        kind: "contact",
        id: row.id,
        label: row.person_name || row.contact_value,
        reason: `Contact e-mail bestaat al (${email})`,
      });
    }
  }

  return matches;
}
