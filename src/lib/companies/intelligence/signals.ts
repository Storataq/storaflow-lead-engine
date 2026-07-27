/**
 * Gather signals for company intelligence (CRM + enrichment + contacts).
 */

import { getLatestCompanyEnrichmentSnapshot } from "@/lib/enrichment/queries";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

export type IntelligenceSignals = {
  companyId: string;
  organizationId: string;
  companyName: string;
  websiteUrl: string | null;
  description: string | null;
  industry: string | null;
  notes: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  categoryConfidence: number | null;
  contactCount: number;
  emailContactCount: number;
  phoneContactCount: number;
  namedContactCount: number;
  decisionMakerHints: number;
  enrichment: {
    available: boolean;
    availability: string | null;
    emails: number;
    phones: number;
    socials: number;
    people: number;
    pages: number;
    warnings: string[];
    contactPage: string | null;
    aboutPage: string | null;
    teamPage: string | null;
    socialPreview: Array<Record<string, unknown>>;
    discoveredAt: string | null;
  } | null;
  websiteTitle: string | null;
  metaDescription: string | null;
  aboutText: string | null;
  homepageText: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function isDecisionMaker(personName: string | null, jobTitle: string | null): boolean {
  const hay = [personName, jobTitle]
    .filter((v): v is string => Boolean(v))
    .join(" ")
    .toLowerCase();
  return /\b(ceo|cfo|cto|coo|founder|owner|director|manager|hoofd|eigenaar|beslisser)\b/.test(
    hay,
  );
}

export async function buildIntelligenceSignals(
  organizationId: string,
  companyId: string,
  supabase?: Client,
): Promise<IntelligenceSignals> {
  const client = supabase ?? (await createClient());

  const { data: company, error } = await client
    .from("companies")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", companyId)
    .maybeSingle();

  if (error || !company) {
    throw new Error(error?.message ?? "Company not found.");
  }

  let categoryName: string | null = null;
  let categorySlug: string | null = null;
  if (company.company_category_id) {
    const { data: cat } = await client
      .from("company_categories")
      .select("name, slug")
      .eq("organization_id", organizationId)
      .eq("id", company.company_category_id)
      .maybeSingle();
    categoryName = cat?.name ?? null;
    categorySlug = cat?.slug ?? null;
  }

  const { data: contacts } = await client
    .from("contacts")
    .select("contact_type, contact_value, person_name, job_title")
    .eq("organization_id", organizationId)
    .eq("company_id", companyId)
    .limit(200);

  const contactRows = contacts ?? [];
  let emailContactCount = 0;
  let phoneContactCount = 0;
  let namedContactCount = 0;
  let decisionMakerHints = 0;
  for (const c of contactRows) {
    if (c.contact_type === "email" && c.contact_value?.trim()) {
      emailContactCount += 1;
    }
    if (c.contact_type === "phone" && c.contact_value?.trim()) {
      phoneContactCount += 1;
    }
    if (c.person_name?.trim()) namedContactCount += 1;
    if (isDecisionMaker(c.person_name, c.job_title)) decisionMakerHints += 1;
  }

  const enrichmentSnapshot = await getLatestCompanyEnrichmentSnapshot(
    organizationId,
    companyId,
  ).catch(() => null);

  const { data: sources } = await client
    .from("company_sources")
    .select("metadata_json, discovered_at")
    .eq("organization_id", organizationId)
    .eq("company_id", companyId)
    .order("discovered_at", { ascending: false })
    .limit(10);

  let websiteTitle: string | null = null;
  let metaDescription: string | null = null;
  let aboutText: string | null = null;
  let homepageText: string | null = null;

  for (const source of sources ?? []) {
    const row = asRecord(source.metadata_json);
    if (typeof row.title === "string") websiteTitle = websiteTitle ?? row.title;
    if (typeof row.metaDescription === "string") {
      metaDescription = metaDescription ?? row.metaDescription;
    }
    if (typeof row.aboutText === "string") aboutText = aboutText ?? row.aboutText;
    if (typeof row.homepageText === "string") {
      homepageText = homepageText ?? row.homepageText;
    }
  }

  return {
    companyId,
    organizationId,
    companyName: company.company_name,
    websiteUrl: company.website_url,
    description: company.description,
    industry: company.industry,
    notes: company.notes,
    city: company.city,
    region: company.region,
    country: company.country,
    phone: company.phone,
    linkedinUrl: company.linkedin_url,
    facebookUrl: company.facebook_url,
    instagramUrl: company.instagram_url,
    categoryName,
    categorySlug,
    categoryConfidence:
      company.category_confidence != null
        ? Number(company.category_confidence)
        : null,
    contactCount: contactRows.length,
    emailContactCount,
    phoneContactCount,
    namedContactCount,
    decisionMakerHints,
    enrichment: enrichmentSnapshot
      ? {
          available: true,
          availability: enrichmentSnapshot.availability,
          emails: enrichmentSnapshot.emails,
          phones: enrichmentSnapshot.phones,
          socials: enrichmentSnapshot.socials,
          people: enrichmentSnapshot.people,
          pages: enrichmentSnapshot.pages,
          warnings: enrichmentSnapshot.warnings,
          contactPage: enrichmentSnapshot.contactPage,
          aboutPage: enrichmentSnapshot.aboutPage,
          teamPage: enrichmentSnapshot.teamPage,
          socialPreview: enrichmentSnapshot.socialPreview,
          discoveredAt: enrichmentSnapshot.discoveredAt,
        }
      : null,
    websiteTitle,
    metaDescription,
    aboutText,
    homepageText,
  };
}
