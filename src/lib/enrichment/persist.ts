/**
 * Persist enrichment results into companies, contacts, company_sources.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { EnrichmentResult } from "@/lib/enrichment/types";
import type { ContactType, ContactVerificationStatus } from "@/types/database";
import type { Database, Json } from "@/types/supabase";

type Client = SupabaseClient<Database>;

function asJson(value: Record<string, unknown>): Json {
  return value as Json;
}

function mapVerification(
  status: EnrichmentResult["emails"][number]["syntaxStatus"],
): ContactVerificationStatus {
  switch (status) {
    case "valid_syntax":
    case "role_address":
      return "syntax_valid";
    case "suspicious":
      return "risky";
    case "invalid_syntax":
    case "placeholder":
      return "invalid";
    default:
      return "unknown";
  }
}

async function upsertContact(
  supabase: Client,
  input: {
    organizationId: string;
    companyId: string;
    type: ContactType;
    value: string;
    normalized: string;
    label: string;
    verification: ContactVerificationStatus;
    sourceUrl: string;
  },
): Promise<"created" | "reused"> {
  const { data: existing } = await supabase
    .from("contacts")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("contact_type", input.type)
    .eq("normalized_value", input.normalized)
    .limit(1)
    .maybeSingle();

  if (existing) return "reused";

  const { error } = await supabase.from("contacts").insert({
    organization_id: input.organizationId,
    company_id: input.companyId,
    contact_type: input.type,
    contact_value: input.value,
    normalized_value: input.normalized,
    label: input.label,
    is_public_business_contact: true,
    verification_status: input.verification,
    source_url: input.sourceUrl,
    last_checked_at: new Date().toISOString(),
  });

  if (error) throw new Error(error.message);
  return "created";
}

export type PersistEnrichmentOutcome = {
  contactsCreated: number;
  contactsReused: number;
  companyUpdated: boolean;
};

export async function persistEnrichmentResult(
  supabase: Client,
  input: {
    organizationId: string;
    jobId: string;
    result: EnrichmentResult;
  },
): Promise<PersistEnrichmentOutcome> {
  const { result } = input;
  let contactsCreated = 0;
  let contactsReused = 0;

  for (const email of result.emails) {
    if (email.reviewStatus === "rejected") continue;
    if (email.confidenceClass === "invalid") continue;
    // Do not invent named persons from role inboxes
    const label =
      email.category === "personal"
        ? "Business contact email"
        : `Company ${email.category} email`;
    const status = await upsertContact(supabase, {
      organizationId: input.organizationId,
      companyId: result.companyId,
      type: "email",
      value: email.email,
      normalized: email.normalized,
      label,
      verification: mapVerification(email.syntaxStatus),
      sourceUrl: email.sourceUrl,
    });
    if (status === "created") contactsCreated += 1;
    else contactsReused += 1;
  }

  for (const phone of result.phones) {
    if (phone.confidence < 40) continue;
    const status = await upsertContact(supabase, {
      organizationId: input.organizationId,
      companyId: result.companyId,
      type: "phone",
      value: phone.original,
      normalized: phone.normalized,
      label: `Company ${phone.category} phone`,
      verification: "unknown",
      sourceUrl: phone.sourceUrl,
    });
    if (status === "created") contactsCreated += 1;
    else contactsReused += 1;
  }

  const linkedin = result.socials.find((s) => s.platform === "linkedin")?.url;
  const facebook = result.socials.find((s) => s.platform === "facebook")?.url;
  const instagram = result.socials.find((s) => s.platform === "instagram")?.url;
  const mainPhone = result.phones.sort((a, b) => b.confidence - a.confidence)[0];

  const { data: company } = await supabase
    .from("companies")
    .select("phone, linkedin_url, facebook_url, instagram_url, website_url, notes")
    .eq("organization_id", input.organizationId)
    .eq("id", result.companyId)
    .maybeSingle();

  const patch: Database["public"]["Tables"]["companies"]["Update"] = {
    last_checked_at: new Date().toISOString(),
    website_url:
      result.website.finalUrl ??
      result.website.normalized ??
      company?.website_url ??
      null,
    notes: [
      company?.notes?.trim() || "",
      `Website enrichment ${new Date().toISOString().slice(0, 10)}: ${result.statistics.emailsFound} emails, ${result.statistics.phonesFound} phones, ${result.statistics.pagesProcessed} pages.`,
    ]
      .filter(Boolean)
      .join("\n")
      .slice(0, 4000),
  };

  if (!company?.phone && mainPhone) patch.phone = mainPhone.original;
  if (!company?.linkedin_url && linkedin) patch.linkedin_url = linkedin;
  if (!company?.facebook_url && facebook) patch.facebook_url = facebook;
  if (!company?.instagram_url && instagram) patch.instagram_url = instagram;

  await supabase
    .from("companies")
    .update(patch)
    .eq("organization_id", input.organizationId)
    .eq("id", result.companyId);

  await supabase.from("company_sources").insert({
    organization_id: input.organizationId,
    company_id: result.companyId,
    scrape_job_id: input.jobId,
    source_url:
      result.website.finalUrl ??
      result.website.normalized ??
      "https://invalid.local",
    source_type: "company_website",
    metadata_json: asJson({
      enrichment: true,
      live: true,
      emails: result.emails.length,
      phones: result.phones.length,
      socials: result.socials.length,
      people: result.people.length,
      pages: result.statistics.pagesProcessed,
      warnings: result.statistics.warnings.slice(0, 20),
      contactPage: result.pages.find((p) => p.pageType === "contact")?.finalUrl ?? null,
      aboutPage: result.pages.find((p) => p.pageType === "about")?.finalUrl ?? null,
      teamPage: result.pages.find((p) => p.pageType === "team")?.finalUrl ?? null,
      availability: result.availability.status,
      robots: result.robots.message,
      durationMs: result.statistics.durationMs,
      duplicatesPrevented: result.statistics.duplicatesPrevented,
      emailPreview: result.emails.slice(0, 25).map((e) => ({
        email: e.email,
        category: e.category,
        syntaxStatus: e.syntaxStatus,
        domainStatus: e.domainStatus,
        mailboxStatus: e.mailboxStatus,
        confidence: e.confidence,
        confidenceClass: e.confidenceClass,
        sourceUrl: e.sourceUrl,
        pageType: e.pageType,
        reviewStatus: e.reviewStatus,
      })),
      phonePreview: result.phones.slice(0, 25).map((p) => ({
        original: p.original,
        normalized: p.normalized,
        category: p.category,
        confidence: p.confidence,
        sourceUrl: p.sourceUrl,
        reviewStatus: p.reviewStatus,
      })),
      socialPreview: result.socials.slice(0, 20).map((s) => ({
        platform: s.platform,
        url: s.url,
        sourceUrl: s.sourceUrl,
        confidence: s.confidence,
      })),
      peoplePreview: result.people.slice(0, 20).map((p) => ({
        fullName: p.fullName,
        jobTitle: p.jobTitle,
        email: p.email,
        phone: p.phone,
        confidence: p.confidence,
        sourceUrl: p.sourceUrl,
        reviewStatus: p.reviewStatus,
      })),
      pagePreview: result.pages.map((p) => ({
        url: p.finalUrl,
        title: p.title,
        pageType: p.pageType,
        confidence: p.pageTypeConfidence,
      })),
    }),
  });

  return {
    contactsCreated,
    contactsReused,
    companyUpdated: true,
  };
}
