/**
 * Architecture for converting scraped companies into CRM leads.
 * No automatic scraper → lead conversion in this phase.
 */

import type { CompanyRow } from "@/lib/companies/queries";
import type { Database } from "@/types/supabase";

export type LeadDraftFromCompany = Pick<
  Database["public"]["Tables"]["crm_leads"]["Insert"],
  | "company_id"
  | "company_name"
  | "email"
  | "phone"
  | "website"
  | "country"
  | "city"
  | "industry"
  | "source"
  | "notes"
  | "tags"
>;

/**
 * Maps a persisted company (from mock scrape) to a CRM lead draft.
 * Callers must still choose pipeline/stage and persist via createLeadAction /
 * createLeadFromCompanyAction.
 */
export function buildLeadDraftFromCompany(
  company: CompanyRow,
): LeadDraftFromCompany {
  return {
    company_id: company.id,
    company_name: company.company_name,
    email: null,
    phone: company.phone,
    website: company.website_url,
    country: company.country,
    city: company.city,
    industry: company.industry,
    source: company.source_type ?? "scrape",
    notes: company.notes,
    tags: ["from-scrape"],
  };
}
