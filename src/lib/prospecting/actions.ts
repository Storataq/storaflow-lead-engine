"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  ensureProspectingAgent,
  setProspectingAgentEnabled,
} from "@/lib/prospecting/agent";
import {
  findProspectDuplicates,
  normalizeDomainFromUrl,
  normalizeProspectName,
} from "@/lib/prospecting/duplicates";
import {
  prospectsToCsv,
  prospectsToExcelCsv,
  prospectsToJson,
  prospectsToPdfText,
} from "@/lib/prospecting/export";
import { logProspectingEvent } from "@/lib/prospecting/history";
import { runProspectResearch } from "@/lib/prospecting/pipeline";
import { listProspects } from "@/lib/prospecting/queries";
import { createLeadFromCompanyAction } from "@/lib/crm/actions";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { createClient } from "@/lib/supabase/server";
import { toUserFacingError } from "@/lib/ui/user-facing-error";
import type { Json } from "@/types/supabase";

export type ProspectingActionResult = {
  success: boolean;
  message: string;
  id?: string;
  ids?: string[];
  payload?: string;
  mimeType?: string;
  filename?: string;
};

function revalidateProspecting() {
  for (const path of [
    "/prospecting",
    "/prospecting/prospects",
    "/prospecting/companies",
    "/prospecting/research",
    "/prospecting/lead-score",
    "/prospecting/enrichment",
    "/prospecting/opportunities",
    "/prospecting/history",
    "/prospecting/settings",
  ]) {
    revalidatePath(path);
  }
}

const createSchema = z.object({
  companyName: z.string().min(2).max(200),
  websiteUrl: z.string().max(500).optional().nullable(),
  industry: z.string().max(120).optional().nullable(),
  country: z.string().max(120).optional().nullable(),
  region: z.string().max(120).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  employeeBand: z.string().max(40).optional().nullable(),
  revenueBand: z.string().max(40).optional().nullable(),
  technology: z.string().max(120).optional().nullable(),
  tags: z.array(z.string()).optional(),
  keyword: z.string().max(200).optional().nullable(),
  searchId: z.string().uuid().optional().nullable(),
  runResearch: z.boolean().optional(),
});

export async function createProspectAction(
  input: z.infer<typeof createSchema>,
): Promise<ProspectingActionResult> {
  try {
    const parsed = createSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Invalid input." };
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };

    await ensureProspectingAgent(
      context.organization.id,
      context.membership.user_id,
    );

    const duplicates = await findProspectDuplicates({
      organizationId: context.organization.id,
      companyName: parsed.data.companyName,
      websiteUrl: parsed.data.websiteUrl,
    });

    const supabase = await createClient();
    const tags = [
      ...(parsed.data.tags ?? []),
      ...(parsed.data.technology ? [parsed.data.technology] : []),
      ...(parsed.data.keyword ? [parsed.data.keyword] : []),
    ];

    const { data, error } = await supabase
      .from("prospecting_prospects")
      .insert({
        organization_id: context.organization.id,
        search_id: parsed.data.searchId ?? null,
        company_name: parsed.data.companyName,
        normalized_name: normalizeProspectName(parsed.data.companyName),
        website_url: parsed.data.websiteUrl ?? null,
        normalized_domain: normalizeDomainFromUrl(parsed.data.websiteUrl),
        industry: parsed.data.industry ?? null,
        country: parsed.data.country ?? null,
        region: parsed.data.region ?? null,
        city: parsed.data.city ?? null,
        employee_band: parsed.data.employeeBand ?? null,
        revenue_band: parsed.data.revenueBand ?? null,
        tags_json: tags as Json,
        is_duplicate: duplicates.length > 0,
        duplicate_of_prospect_id:
          duplicates.find((d) => d.kind === "prospect")?.id ?? null,
        company_id: duplicates.find((d) => d.kind === "company")?.id ?? null,
        source: "manual",
        created_by: context.membership.user_id,
        metadata_json: { duplicates } as Json,
      })
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, message: error?.message ?? "Create failed." };
    }

    await logProspectingEvent({
      organizationId: context.organization.id,
      eventType: "prospect.created",
      summary: `Created prospect ${parsed.data.companyName}`,
      actorUserId: context.membership.user_id,
      prospectId: data.id,
      payload: { duplicates: duplicates.length },
    });

    if (parsed.data.runResearch) {
      await runProspectResearch({
        organizationId: context.organization.id,
        prospectId: data.id,
        userId: context.membership.user_id,
      });
    }

    revalidateProspecting();
    return {
      success: true,
      message:
        duplicates.length > 0
          ? "Prospect created (possible duplicate flagged)."
          : "Prospect created.",
      id: data.id,
    };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

const searchSchema = z.object({
  name: z.string().min(2).max(120),
  industry: z.string().max(120).optional().nullable(),
  country: z.string().max(120).optional().nullable(),
  region: z.string().max(120).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  companySize: z.string().max(40).optional().nullable(),
  employeeBand: z.string().max(40).optional().nullable(),
  revenueBand: z.string().max(40).optional().nullable(),
  technology: z.string().max(120).optional().nullable(),
  keyword: z.string().max(200).optional().nullable(),
  tags: z.array(z.string()).optional(),
  importMatchingCompanies: z.boolean().optional(),
  limit: z.number().int().min(1).max(200).optional(),
});

export async function createProspectSearchAction(
  input: z.infer<typeof searchSchema>,
): Promise<ProspectingActionResult> {
  try {
    const parsed = searchSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Invalid search." };
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };

    const supabase = await createClient();
    const { data: search, error } = await supabase
      .from("prospecting_searches")
      .insert({
        organization_id: context.organization.id,
        name: parsed.data.name,
        industry: parsed.data.industry ?? null,
        country: parsed.data.country ?? null,
        region: parsed.data.region ?? null,
        city: parsed.data.city ?? null,
        company_size: parsed.data.companySize ?? null,
        employee_band: parsed.data.employeeBand ?? null,
        revenue_band: parsed.data.revenueBand ?? null,
        technology: parsed.data.technology ?? null,
        keyword: parsed.data.keyword ?? null,
        tags_json: (parsed.data.tags ?? []) as Json,
        keywords_json: parsed.data.keyword
          ? ([parsed.data.keyword] as Json)
          : ([] as Json),
        industries_json: parsed.data.industry
          ? ([parsed.data.industry] as Json)
          : ([] as Json),
        created_by: context.membership.user_id,
      })
      .select("id")
      .single();

    if (error || !search) {
      return { success: false, message: error?.message ?? "Search failed." };
    }

    const ids: string[] = [];
    if (parsed.data.importMatchingCompanies !== false) {
      let q = supabase
        .from("companies")
        .select(
          "id, company_name, website_url, city, region, country, industry, phone, description",
        )
        .eq("organization_id", context.organization.id)
        .limit(parsed.data.limit ?? 50);

      if (parsed.data.country) q = q.ilike("country", parsed.data.country);
      if (parsed.data.region) q = q.ilike("region", `%${parsed.data.region}%`);
      if (parsed.data.city) q = q.ilike("city", `%${parsed.data.city}%`);
      if (parsed.data.industry) {
        q = q.ilike("industry", `%${parsed.data.industry}%`);
      }
      if (parsed.data.keyword) {
        q = q.or(
          `company_name.ilike.%${parsed.data.keyword}%,description.ilike.%${parsed.data.keyword}%`,
        );
      }

      const { data: companies } = await q;
      for (const company of companies ?? []) {
        const { data: prospect } = await supabase
          .from("prospecting_prospects")
          .insert({
            organization_id: context.organization.id,
            search_id: search.id,
            company_id: company.id,
            company_name: company.company_name,
            normalized_name: normalizeProspectName(company.company_name),
            website_url: company.website_url,
            normalized_domain: normalizeDomainFromUrl(company.website_url),
            industry: company.industry ?? parsed.data.industry ?? null,
            country: company.country ?? parsed.data.country ?? null,
            region: company.region ?? parsed.data.region ?? null,
            city: company.city ?? parsed.data.city ?? null,
            employee_band: parsed.data.employeeBand ?? null,
            revenue_band: parsed.data.revenueBand ?? null,
            phone: company.phone,
            description: company.description,
            tags_json: (parsed.data.tags ?? []) as Json,
            source: "company_import",
            created_by: context.membership.user_id,
          })
          .select("id")
          .maybeSingle();
        if (prospect?.id) ids.push(prospect.id);
      }
    }

    await logProspectingEvent({
      organizationId: context.organization.id,
      eventType: "search.created",
      summary: `Search "${parsed.data.name}" → ${ids.length} prospects`,
      actorUserId: context.membership.user_id,
      searchId: search.id,
      payload: { imported: ids.length },
    });

    revalidateProspecting();
    return {
      success: true,
      message: `Search saved. Imported ${ids.length} matching companies.`,
      id: search.id,
      ids,
    };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

export async function researchProspectAction(
  prospectId: string,
): Promise<ProspectingActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const result = await runProspectResearch({
      organizationId: context.organization.id,
      prospectId,
      userId: context.membership.user_id,
    });
    revalidateProspecting();
    return {
      success: result.success,
      message: result.message,
      id: result.prospect?.id,
    };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

export async function bulkResearchProspectsAction(
  prospectIds: string[],
): Promise<ProspectingActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const ids = prospectIds.slice(0, 25);
    const supabase = await createClient();
    const { data: job } = await supabase
      .from("prospecting_bulk_jobs")
      .insert({
        organization_id: context.organization.id,
        job_type: "analyze",
        status: "running",
        total_count: ids.length,
        input_json: { prospectIds: ids } as Json,
        created_by: context.membership.user_id,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    let successCount = 0;
    let failureCount = 0;
    for (const id of ids) {
      const result = await runProspectResearch({
        organizationId: context.organization.id,
        prospectId: id,
        userId: context.membership.user_id,
      });
      if (result.success) successCount += 1;
      else failureCount += 1;
    }

    if (job?.id) {
      await supabase
        .from("prospecting_bulk_jobs")
        .update({
          status: "completed",
          success_count: successCount,
          failure_count: failureCount,
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    }

    revalidateProspecting();
    return {
      success: true,
      message: `Bulk research done: ${successCount} ok, ${failureCount} failed.`,
      id: job?.id,
    };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

export async function pushProspectToCrmAction(params: {
  prospectId: string;
  createLead?: boolean;
  createTask?: boolean;
  createNote?: boolean;
}): Promise<ProspectingActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const supabase = await createClient();
    const { data: prospect } = await supabase
      .from("prospecting_prospects")
      .select("*")
      .eq("organization_id", context.organization.id)
      .eq("id", params.prospectId)
      .maybeSingle();
    if (!prospect) return { success: false, message: "Prospect not found." };

    let companyId = prospect.company_id as string | null;
    if (!companyId) {
      const domain = normalizeDomainFromUrl(prospect.website_url);
      const { data: created, error } = await supabase
        .from("companies")
        .insert({
          organization_id: context.organization.id,
          company_name: prospect.company_name,
          normalized_company_name: normalizeProspectName(prospect.company_name),
          website_url: prospect.website_url,
          normalized_domain: domain,
          city: prospect.city,
          region: prospect.region,
          country: prospect.country,
          phone: prospect.phone,
          description: prospect.description,
          industry: prospect.industry,
          source_type: "manual_url_list",
          status: "new",
        })
        .select("id")
        .single();
      if (error || !created) {
        return {
          success: false,
          message: error?.message ?? "Could not create company.",
        };
      }
      companyId = created.id;
    }

    if (prospect.email) {
      const { data: existingContact } = await supabase
        .from("contacts")
        .select("id")
        .eq("organization_id", context.organization.id)
        .eq("company_id", companyId)
        .ilike("normalized_value", prospect.email.toLowerCase())
        .maybeSingle();
      if (!existingContact) {
        await supabase.from("contacts").insert({
          organization_id: context.organization.id,
          company_id: companyId,
          contact_type: "email",
          contact_value: prospect.email,
          normalized_value: prospect.email.toLowerCase(),
          person_name:
            (Array.isArray(prospect.decision_makers_json) &&
            prospect.decision_makers_json[0] &&
            typeof prospect.decision_makers_json[0] === "object" &&
            "role" in (prospect.decision_makers_json[0] as object)
              ? String(
                  (prospect.decision_makers_json[0] as { role?: string }).role,
                )
              : null) ?? null,
          label: "prospecting",
          verification_status: "unknown",
        });
      }
    }

    let leadId = prospect.crm_lead_id as string | null;
    if (params.createLead !== false) {
      const leadResult = await createLeadFromCompanyAction(companyId);
      if (leadResult.success && leadResult.id) {
        leadId = leadResult.id;
      }
    }

    if (params.createTask !== false && leadId) {
      await supabase.from("crm_tasks").insert({
        organization_id: context.organization.id,
        lead_id: leadId,
        title: `Follow up prospect: ${prospect.company_name}`,
        description: prospect.research_summary ?? prospect.recommendation,
        priority: prospect.lead_score >= 70 ? "high" : "normal",
        status: "todo",
        task_type: "follow_up",
        assigned_user_id: context.membership.user_id,
        created_by: context.membership.user_id,
      });
    }

    if (params.createNote !== false && leadId) {
      const noteBody = [
        `AI Prospecting summary`,
        prospect.research_summary ?? "",
        `Score: ${prospect.lead_score} (${prospect.lead_quality})`,
        `Recommendation: ${prospect.recommendation}`,
      ]
        .filter(Boolean)
        .join("\n");
      await supabase.from("crm_notes").insert({
        organization_id: context.organization.id,
        lead_id: leadId,
        body_text: noteBody,
        body_html: `<p>${noteBody.replace(/\n/g, "<br/>")}</p>`,
        created_by: context.membership.user_id,
      });
    }

    await supabase
      .from("prospecting_prospects")
      .update({
        company_id: companyId,
        crm_lead_id: leadId,
        status: "crm_linked",
      })
      .eq("id", prospect.id);

    await logProspectingEvent({
      organizationId: context.organization.id,
      eventType: "crm.linked",
      summary: `Linked ${prospect.company_name} to CRM`,
      actorUserId: context.membership.user_id,
      prospectId: prospect.id,
      payload: { companyId, leadId },
    });

    revalidateProspecting();
    return {
      success: true,
      message: "Prospect pushed to CRM.",
      id: companyId,
    };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

export async function importProspectsJsonAction(
  rawJson: string,
): Promise<ProspectingActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const parsed = JSON.parse(rawJson) as unknown;
    if (!Array.isArray(parsed)) {
      return { success: false, message: "JSON must be an array." };
    }

    const supabase = await createClient();
    const { data: job } = await supabase
      .from("prospecting_bulk_jobs")
      .insert({
        organization_id: context.organization.id,
        job_type: "import",
        status: "running",
        total_count: parsed.length,
        created_by: context.membership.user_id,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    let successCount = 0;
    let failureCount = 0;
    const ids: string[] = [];

    for (const item of parsed.slice(0, 200)) {
      if (!item || typeof item !== "object") {
        failureCount += 1;
        continue;
      }
      const row = item as Record<string, unknown>;
      const name = String(row.companyName ?? row.company_name ?? "").trim();
      if (!name) {
        failureCount += 1;
        continue;
      }
      const website = row.websiteUrl ?? row.website_url;
      const { data } = await supabase
        .from("prospecting_prospects")
        .insert({
          organization_id: context.organization.id,
          company_name: name,
          normalized_name: normalizeProspectName(name),
          website_url: website ? String(website) : null,
          normalized_domain: normalizeDomainFromUrl(
            website ? String(website) : null,
          ),
          industry: row.industry ? String(row.industry) : null,
          country: row.country ? String(row.country) : null,
          region: row.region ? String(row.region) : null,
          city: row.city ? String(row.city) : null,
          employee_band: row.employeeBand
            ? String(row.employeeBand)
            : row.employee_band
              ? String(row.employee_band)
              : null,
          source: "import",
          created_by: context.membership.user_id,
        })
        .select("id")
        .maybeSingle();
      if (data?.id) {
        successCount += 1;
        ids.push(data.id);
      } else failureCount += 1;
    }

    if (job?.id) {
      await supabase
        .from("prospecting_bulk_jobs")
        .update({
          status: "completed",
          success_count: successCount,
          failure_count: failureCount,
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    }

    revalidateProspecting();
    return {
      success: true,
      message: `Imported ${successCount} prospects (${failureCount} failed).`,
      ids,
    };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

export async function exportProspectsAction(params: {
  format: "csv" | "excel" | "json" | "pdf";
  minScore?: number;
}): Promise<ProspectingActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const rows = await listProspects(context.organization.id, {
      minScore: params.minScore,
    }, 2000);

    if (params.format === "json") {
      return {
        success: true,
        message: "Export ready.",
        payload: prospectsToJson(rows),
        mimeType: "application/json",
        filename: "prospects.json",
      };
    }
    if (params.format === "pdf") {
      return {
        success: true,
        message: "Export ready.",
        payload: prospectsToPdfText(rows),
        mimeType: "text/plain",
        filename: "prospects.txt",
      };
    }
    if (params.format === "excel") {
      return {
        success: true,
        message: "Export ready.",
        payload: prospectsToExcelCsv(rows),
        mimeType: "text/csv",
        filename: "prospects.xlsx.csv",
      };
    }
    return {
      success: true,
      message: "Export ready.",
      payload: prospectsToCsv(rows),
      mimeType: "text/csv",
      filename: "prospects.csv",
    };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

const settingsSchema = z.object({
  enabled: z.boolean(),
  min_lead_score: z.number().int().min(0).max(100),
  min_ai_confidence: z.number().min(0).max(1),
  auto_enrich: z.boolean(),
  auto_crm_suggest: z.boolean(),
  approval_mode: z.string(),
  provider: z.string(),
  model: z.string().min(1).max(120),
  rate_limit_per_minute: z.number().int().min(1).max(500),
});

export async function updateProspectingSettingsAction(
  input: z.infer<typeof settingsSchema>,
): Promise<ProspectingActionResult> {
  try {
    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Invalid settings." };
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (
      context.membership.role !== "owner" &&
      context.membership.role !== "admin"
    ) {
      return { success: false, message: "Only admins can update settings." };
    }

    const supabase = await createClient();
    await supabase.from("prospecting_org_settings").upsert({
      organization_id: context.organization.id,
      ...parsed.data,
    });

    await setProspectingAgentEnabled(
      context.organization.id,
      parsed.data.enabled,
    );

    revalidateProspecting();
    return { success: true, message: "Settings updated." };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}
