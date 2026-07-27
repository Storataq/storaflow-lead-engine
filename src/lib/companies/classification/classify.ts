import { ensureDefaultCompanyCategories } from "@/lib/companies/categories/bootstrap";
import { classifyWithOptionalAI } from "@/lib/companies/classification/ai";
import { classifyDeterministic } from "@/lib/companies/classification/deterministic";
import type {
  ClassificationResult,
  ClassificationSignals,
} from "@/lib/companies/classification/types";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

export async function buildSignalsForCompany(
  organizationId: string,
  companyId: string,
  supabase?: Client,
): Promise<ClassificationSignals> {
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

  const { data: sources } = await client
    .from("company_sources")
    .select("metadata_json, source_type, discovered_at")
    .eq("organization_id", organizationId)
    .eq("company_id", companyId)
    .order("discovered_at", { ascending: false })
    .limit(10);

  let websiteTitle: string | null = null;
  let metaDescription: string | null = null;
  let aboutText: string | null = null;
  let homepageText: string | null = null;
  const googleCategories: string[] = [];
  const keywords: string[] = [];

  for (const source of sources ?? []) {
    const meta = source.metadata_json;
    if (!meta || typeof meta !== "object" || Array.isArray(meta)) continue;
    const row = meta as Record<string, unknown>;

    if (Array.isArray(row.categories)) {
      for (const c of row.categories) {
        if (typeof c === "string") googleCategories.push(c);
      }
    }
    if (typeof row.title === "string") websiteTitle = websiteTitle ?? row.title;
    if (typeof row.metaDescription === "string") {
      metaDescription = metaDescription ?? row.metaDescription;
    }
    if (typeof row.aboutText === "string") aboutText = aboutText ?? row.aboutText;
    if (typeof row.homepageText === "string") {
      homepageText = homepageText ?? row.homepageText;
    }
    if (row.enrichment === true) {
      if (typeof row.contactPage === "string") keywords.push("contact page");
      if (typeof row.aboutPage === "string") keywords.push("about page");
    }
  }

  return {
    companyName: company.company_name,
    websiteUrl: company.website_url,
    industry: company.industry,
    description: company.description,
    notes: company.notes,
    city: company.city,
    country: company.country,
    websiteTitle,
    metaDescription,
    aboutText,
    homepageText,
    googleCategories: googleCategories.length ? googleCategories : null,
    keywords: keywords.length ? keywords : null,
  };
}

export async function classifyCompanyCategory(input: {
  organizationId: string;
  companyId?: string;
  signals?: ClassificationSignals;
  supabase?: Client;
  useAi?: boolean;
}): Promise<ClassificationResult> {
  const client = input.supabase ?? (await createClient());
  await ensureDefaultCompanyCategories(client, input.organizationId);

  const { data: categories, error } = await client
    .from("company_categories")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);

  const signals =
    input.signals ??
    (input.companyId
      ? await buildSignalsForCompany(
          input.organizationId,
          input.companyId,
          client,
        )
      : null);

  if (!signals) {
    throw new Error("Classification signals are required.");
  }

  const deterministic = classifyDeterministic({
    signals,
    categories: categories ?? [],
  });

  if (input.useAi === false) return deterministic;

  return classifyWithOptionalAI({
    signals,
    categories: categories ?? [],
    deterministic,
  });
}
