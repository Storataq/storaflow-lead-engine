/**
 * Persists NormalizedBusinessResult rows into companies / company_sources /
 * scrape_results with org-scoped deduplication.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  normalizeCompanyName,
  normalizeDomain,
} from "@/lib/scraping/connectors/pipeline/normalizer";
import type { NormalizedBusinessResult } from "@/lib/scraping/connectors/types";
import type { Database, Json } from "@/types/supabase";

type Client = SupabaseClient<Database>;

export type PersistPipelineResultsInput = {
  organizationId: string;
  jobId: string;
  sourceCode: string;
  results: NormalizedBusinessResult[];
};

export type PersistPipelineResultsOutcome = {
  companiesCreated: number;
  companiesReused: number;
  resultsInserted: number;
  contactsFound: number;
  skippedDuplicates: number;
};

function asJson(value: Record<string, unknown>): Json {
  return value as Json;
}

async function findCompanyByDomain(
  supabase: Client,
  organizationId: string,
  domain: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("companies")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("normalized_domain", domain)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

async function findCompanyByNameCityCountry(
  supabase: Client,
  organizationId: string,
  normalizedName: string,
  city: string | null,
  country: string | null,
): Promise<string | null> {
  const query = supabase
    .from("companies")
    .select("id, city, country")
    .eq("organization_id", organizationId)
    .eq("normalized_company_name", normalizedName)
    .limit(25);

  const { data } = await query;
  if (!data?.length) return null;

  const cityNorm = (city ?? "").trim().toLowerCase();
  const countryNorm = (country ?? "").trim().toUpperCase();

  const match = data.find((row) => {
    const rowCity = (row.city ?? "").trim().toLowerCase();
    const rowCountry = (row.country ?? "").trim().toUpperCase();
    return rowCity === cityNorm && rowCountry === countryNorm;
  });

  return match?.id ?? null;
}

async function findExistingResultForSourceId(
  supabase: Client,
  organizationId: string,
  jobId: string,
  sourceCode: string,
  sourceId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("scrape_results")
    .select("id, raw_payload")
    .eq("organization_id", organizationId)
    .eq("scrape_job_id", jobId)
    .eq("source_code", sourceCode)
    .limit(200);

  if (!data?.length) return false;

  return data.some((row) => {
    const payload = row.raw_payload;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return false;
    }
    return (payload as Record<string, unknown>).sourceId === sourceId;
  });
}

/**
 * Upserts companies and scrape_results for one mock pipeline run.
 * Dedup keys:
 * 1. organization + source + sourceId (within job)
 * 2. normalized domain
 * 3. normalized name + city + country
 */
export async function persistPipelineResults(
  supabase: Client,
  input: PersistPipelineResultsInput,
): Promise<PersistPipelineResultsOutcome> {
  let companiesCreated = 0;
  let companiesReused = 0;
  let resultsInserted = 0;
  let contactsFound = 0;
  let skippedDuplicates = 0;

  for (const item of input.results) {
    const already = await findExistingResultForSourceId(
      supabase,
      input.organizationId,
      input.jobId,
      input.sourceCode,
      item.sourceId,
    );
    if (already) {
      skippedDuplicates += 1;
      continue;
    }

    const domain = normalizeDomain(item.website);
    const normalizedName = normalizeCompanyName(item.name);
    let companyId: string | null = null;

    if (domain) {
      companyId = await findCompanyByDomain(
        supabase,
        input.organizationId,
        domain,
      );
    }

    if (!companyId && normalizedName) {
      companyId = await findCompanyByNameCityCountry(
        supabase,
        input.organizationId,
        normalizedName,
        item.city,
        item.countryCode,
      );
    }

    if (companyId) {
      companiesReused += 1;
    } else {
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert({
          organization_id: input.organizationId,
          company_name: item.name,
          normalized_company_name: normalizedName || item.name.toLowerCase(),
          website_url: item.website,
          normalized_domain: domain,
          description: item.description,
          industry: item.industry,
          city: item.city,
          region: item.region,
          country: item.countryCode,
          source_url:
            typeof item.rawData.sourceUrl === "string"
              ? item.rawData.sourceUrl
              : `https://mock.lead-engine.local/${input.sourceCode}/${item.sourceId}`,
          source_type: "search_result",
          last_checked_at: new Date().toISOString(),
          status: "new",
          notes: `Mock pipeline result (${input.sourceCode}/${item.sourceId})`,
        })
        .select("id")
        .single();

      if (companyError || !company) {
        throw new Error(
          companyError?.message ?? "Kon bedrijf niet opslaan.",
        );
      }

      companyId = company.id;
      companiesCreated += 1;
    }

    await supabase.from("company_sources").insert({
      organization_id: input.organizationId,
      company_id: companyId,
      scrape_job_id: input.jobId,
      source_url:
        typeof item.rawData.sourceUrl === "string"
          ? item.rawData.sourceUrl
          : `https://mock.lead-engine.local/${input.sourceCode}/${item.sourceId}`,
      source_type: "search_result",
      metadata_json: asJson({
        mock: true,
        source: item.source,
        sourceId: item.sourceId,
        confidence: item.confidence,
        emails: item.emails,
        phones: item.phones,
      }),
    });

    await supabase.from("scrape_results").insert({
      organization_id: input.organizationId,
      scrape_job_id: input.jobId,
      source_code: input.sourceCode,
      company_name: item.name,
      website_url: item.website,
      city: item.city,
      region: item.region,
      country: item.countryCode,
      industry: item.industry,
      company_id: companyId,
      status: "deduplicated",
      raw_payload: asJson({
        mock: true,
        sourceId: item.sourceId,
        source: item.source,
        emails: item.emails,
        phones: item.phones,
        street: item.street,
        postalCode: item.postalCode,
        categories: item.categories,
        confidence: item.confidence,
        latitude: item.latitude,
        longitude: item.longitude,
        description: item.description,
      }),
    });

    resultsInserted += 1;
    contactsFound += item.emails.length + item.phones.length;
  }

  return {
    companiesCreated,
    companiesReused,
    resultsInserted,
    contactsFound,
    skippedDuplicates,
  };
}
