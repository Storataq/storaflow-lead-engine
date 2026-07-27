/**
 * Prospect research pipeline: fetch → analyze → opportunities → score → persist.
 */

import { emitAiEvent } from "@/ai/events/bus";
import { routeComplete } from "@/ai/providers/router";
import { recordCost } from "@/ai/costs/ledger";
import {
  analyzeWebsiteContent,
  estimateDigitalMaturity,
  websiteLooksOutdated,
} from "@/lib/prospecting/analyze";
import { ensureProspectingAgent } from "@/lib/prospecting/agent";
import {
  findProspectDuplicates,
  normalizeDomainFromUrl,
  normalizeProspectName,
} from "@/lib/prospecting/duplicates";
import { logProspectingEvent } from "@/lib/prospecting/history";
import {
  detectOpportunities,
  suggestDecisionMakers,
} from "@/lib/prospecting/opportunities";
import { computeProspectScore } from "@/lib/prospecting/score";
import type {
  ProspectingOrgSettingsRow,
  ProspectingProspectRow,
} from "@/lib/prospecting/types";
import { fetchHtmlPage } from "@/lib/enrichment/website-crawler/fetch-page";
import { stripHtmlToText } from "@/lib/enrichment/website-crawler/html-extract";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

export async function ensureProspectingSettings(
  organizationId: string,
): Promise<ProspectingOrgSettingsRow> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("prospecting_org_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (existing) return existing as ProspectingOrgSettingsRow;

  const { data, error } = await supabase
    .from("prospecting_org_settings")
    .insert({ organization_id: organizationId })
    .select("*")
    .single();
  if (error || !data) {
    return {
      organization_id: organizationId,
      enabled: true,
      min_lead_score: 40,
      min_ai_confidence: 0.4,
      auto_enrich: true,
      auto_crm_suggest: true,
      approval_mode: "semi_autonomous",
      provider: "openai",
      model: "gpt-4.1-mini",
      rate_limit_per_minute: 30,
      metadata_json: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
  return data as ProspectingOrgSettingsRow;
}

async function optionalAiPolish(params: {
  settings: ProspectingOrgSettingsRow;
  companyName: string;
  summary: string;
  textSample: string;
}): Promise<{
  summary: string;
  provider?: string;
  model?: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
}> {
  try {
    const result = await routeComplete(
      {
        system:
          "You are a B2B prospecting analyst for Storaflow. Rewrite a concise Dutch/English company research summary (max 120 words). Use only provided facts. No invented contacts or metrics. Return plain text.",
        user: `Company: ${params.companyName}\nFacts:\n${params.summary}\n\nWebsite excerpt:\n${params.textSample.slice(0, 4000)}`,
        model: params.settings.model,
        temperature: 0.2,
        maxTokens: 400,
        timeoutMs: 45_000,
      },
      {
        preferredProvider: params.settings.provider as "openai",
        failoverProviders: ["openai", "anthropic", "gemini"],
      },
    );
    return {
      summary: result.content.trim() || params.summary,
      provider: result.provider,
      model: result.model,
      tokensIn: result.usage.inputTokens,
      tokensOut: result.usage.outputTokens,
      costUsd: result.usage.estimatedCostUsd,
    };
  } catch {
    return {
      summary: params.summary,
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0,
    };
  }
}

export type ResearchPipelineResult = {
  success: boolean;
  message: string;
  prospect?: ProspectingProspectRow;
  researchRunId?: string;
};

export async function runProspectResearch(params: {
  organizationId: string;
  prospectId: string;
  userId?: string | null;
  useAiPolish?: boolean;
}): Promise<ResearchPipelineResult> {
  const supabase = await createClient();
  const settings = await ensureProspectingSettings(params.organizationId);
  if (!settings.enabled) {
    return { success: false, message: "Prospecting agent is disabled." };
  }

  const agent = await ensureProspectingAgent(
    params.organizationId,
    params.userId,
  );

  const { data: prospect } = await supabase
    .from("prospecting_prospects")
    .select("*")
    .eq("organization_id", params.organizationId)
    .eq("id", params.prospectId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!prospect) {
    return { success: false, message: "Prospect not found." };
  }

  const started = Date.now();
  const { data: run } = await supabase
    .from("prospecting_research_runs")
    .insert({
      organization_id: params.organizationId,
      prospect_id: prospect.id,
      agent_id: agent?.id ?? null,
      status: "running",
      stage: "fetch",
      started_at: new Date().toISOString(),
      created_by: params.userId ?? null,
      input_json: {
        website_url: prospect.website_url,
        company_name: prospect.company_name,
      } as Json,
    })
    .select("*")
    .single();

  await supabase
    .from("prospecting_prospects")
    .update({ status: "researching" })
    .eq("id", prospect.id);

  try {
    let html = "";
    let text = "";
    if (prospect.website_url) {
      const fetched = await fetchHtmlPage(prospect.website_url);
      if (fetched.ok) {
        html = fetched.body;
        text = stripHtmlToText(html).slice(0, 50_000);
      }
    }

    await supabase
      .from("prospecting_research_runs")
      .update({ stage: "analyze" })
      .eq("id", run?.id ?? "");

    const analysis = analyzeWebsiteContent({
      companyName: prospect.company_name,
      websiteUrl: prospect.website_url,
      html,
      text:
        text ||
        [prospect.description, prospect.industry, prospect.company_name]
          .filter(Boolean)
          .join("\n"),
    });

    const opportunities = detectOpportunities({
      htmlText: `${html}\n${text}`,
      hasWebshopHints: /shopify|woocommerce|add to cart|webshop|winkelwagen/i.test(
        `${html}\n${text}`,
      ),
      hasBookingHints: /book now|reserveer|afspraak|calendly|reserveren/i.test(
        `${html}\n${text}`,
      ),
      hasCrmHints: /hubspot|salesforce|pipedrive|dynamics crm/i.test(
        `${html}\n${text}`,
      ),
      hasInventoryHints: /inventory|voorraadbeheer|wms|erp/i.test(
        `${html}\n${text}`,
      ),
      websiteLooksOutdated: websiteLooksOutdated(html, text),
      hasMultipleLocations: /vestigingen|locaties|filialen|branches/i.test(text),
      internationalHints: /international|worldwide|europa|europe|export/i.test(
        text,
      ),
      growthHints: /groei|growth|hiring|vacature|uitbreiding/i.test(text),
      hasEmail: Boolean(analysis.contactHints.emails[0] || prospect.email),
      hasPhone: Boolean(analysis.contactHints.phones[0] || prospect.phone),
      businessClass: analysis.businessClass,
    });

    const digitalMaturity = estimateDigitalMaturity({
      hasWebsite: Boolean(prospect.website_url),
      technologies: analysis.technologies,
      hasEmail: Boolean(analysis.contactHints.emails[0] || prospect.email),
      hasPhone: Boolean(analysis.contactHints.phones[0] || prospect.phone),
      hasSocial: Object.keys(analysis.socialHints).length > 0,
      htmlLength: html.length,
    });

    const storaflowFit = opportunities.some((o) => o.code === "storaflow_fit")
      ? 75
      : 40;

    const duplicates = await findProspectDuplicates({
      organizationId: params.organizationId,
      companyName: prospect.company_name,
      websiteUrl: prospect.website_url,
      email: analysis.contactHints.emails[0] ?? prospect.email,
      excludeProspectId: prospect.id,
    });

    const scored = computeProspectScore({
      hasWebsite: Boolean(prospect.website_url),
      hasEmail: Boolean(analysis.contactHints.emails[0] || prospect.email),
      hasPhone: Boolean(analysis.contactHints.phones[0] || prospect.phone),
      hasAddress: Boolean(prospect.address),
      hasSocial: Object.keys(analysis.socialHints).length > 0,
      employeeBand: prospect.employee_band,
      revenueBand: prospect.revenue_band,
      businessClass: analysis.businessClass,
      analysisConfidence: analysis.confidence,
      digitalMaturity,
      storaflowFit,
      opportunities,
      isDuplicate: duplicates.length > 0,
    });

    let researchSummary = analysis.summary;
    let provider = settings.provider;
    let model = settings.model;
    let tokensIn = 0;
    let tokensOut = 0;
    let costUsd = 0;

    if (params.useAiPolish !== false && prospect.website_url) {
      await supabase
        .from("prospecting_research_runs")
        .update({ stage: "recommend" })
        .eq("id", run?.id ?? "");
      const polished = await optionalAiPolish({
        settings,
        companyName: prospect.company_name,
        summary: analysis.summary,
        textSample: text,
      });
      researchSummary = polished.summary;
      provider = polished.provider ?? provider;
      model = polished.model ?? model;
      tokensIn = polished.tokensIn;
      tokensOut = polished.tokensOut;
      costUsd = polished.costUsd;
    }

    const decisionMakers = suggestDecisionMakers(analysis.businessClass);
    const email = analysis.contactHints.emails[0] ?? prospect.email;
    const phone = analysis.contactHints.phones[0] ?? prospect.phone;

    const enrichment = {
      description: analysis.whatTheyDo,
      technologies: analysis.technologies,
      social: analysis.socialHints,
      products: analysis.products,
      services: analysis.services,
      audience: analysis.audience,
      usps: analysis.usps,
      digitalMaturity,
      duplicates,
    };

    const companyId = prospect.company_id;
    if (settings.auto_enrich) {
      await supabase
        .from("prospecting_research_runs")
        .update({ stage: "enrich" })
        .eq("id", run?.id ?? "");

      if (companyId) {
        await supabase
          .from("companies")
          .update({
            description: analysis.whatTheyDo.slice(0, 2000),
            industry: analysis.industry,
            ...(prospect.website_url
              ? { website_url: prospect.website_url }
              : {}),
            ...(phone ? { phone } : {}),
            ...(prospect.city ? { city: prospect.city } : {}),
            ...(prospect.region ? { region: prospect.region } : {}),
            ...(prospect.country ? { country: prospect.country } : {}),
            ...(analysis.socialHints.linkedin
              ? { linkedin_url: analysis.socialHints.linkedin }
              : {}),
            ...(analysis.socialHints.facebook
              ? { facebook_url: analysis.socialHints.facebook }
              : {}),
            ...(analysis.socialHints.instagram
              ? { instagram_url: analysis.socialHints.instagram }
              : {}),
          })
          .eq("id", companyId)
          .eq("organization_id", params.organizationId);
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from("prospecting_prospects")
      .update({
        industry: analysis.industry,
        business_class: analysis.businessClass,
        email: email ?? null,
        phone: phone ?? null,
        description: analysis.whatTheyDo.slice(0, 4000),
        social_json: analysis.socialHints as Json,
        technologies_json: analysis.technologies as Json,
        analysis_json: analysis as unknown as Json,
        enrichment_json: enrichment as unknown as Json,
        opportunities_json: opportunities as unknown as Json,
        decision_makers_json: decisionMakers as unknown as Json,
        research_summary: researchSummary,
        lead_score: scored.score,
        lead_quality: scored.quality,
        ai_confidence: scored.confidence,
        recommendation: scored.recommendation,
        status: settings.auto_enrich ? "enriched" : "scored",
        is_duplicate: duplicates.length > 0,
        duplicate_of_prospect_id:
          duplicates.find((d) => d.kind === "prospect")?.id ?? null,
        company_id:
          companyId ??
          duplicates.find((d) => d.kind === "company")?.id ??
          null,
        last_researched_at: new Date().toISOString(),
        last_scored_at: new Date().toISOString(),
        provider,
        model,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        cost_usd: costUsd,
        normalized_domain:
          normalizeDomainFromUrl(prospect.website_url) ??
          prospect.normalized_domain,
        normalized_name: normalizeProspectName(prospect.company_name),
      })
      .eq("id", prospect.id)
      .select("*")
      .single();

    if (updateError || !updated) {
      throw new Error(updateError?.message ?? "Failed to update prospect");
    }

    const latencyMs = Date.now() - started;
    if (run?.id) {
      await supabase
        .from("prospecting_research_runs")
        .update({
          status: "completed",
          stage: "done",
          output_json: {
            score: scored,
            opportunities,
            decisionMakers,
            duplicates,
          } as Json,
          provider,
          model,
          tokens_in: tokensIn,
          tokens_out: tokensOut,
          cost_usd: costUsd,
          latency_ms: latencyMs,
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id);
    }

    if (costUsd > 0) {
      await recordCost({
        organizationId: params.organizationId,
        userId: params.userId,
        agentId: agent?.id,
        provider: provider ?? "openai",
        model: model ?? "gpt-4.1-mini",
        tokensIn,
        tokensOut,
        costUsd,
        metadata: { prospectId: prospect.id, kind: "prospect_research" },
      });
    }

    await logProspectingEvent({
      organizationId: params.organizationId,
      eventType: "research.completed",
      summary: `Researched ${prospect.company_name} → score ${scored.score}`,
      actorUserId: params.userId,
      prospectId: prospect.id,
      researchRunId: run?.id,
      provider,
      model,
      costUsd,
      payload: { score: scored.score, quality: scored.quality },
    });

    await emitAiEvent({
      organizationId: params.organizationId,
      eventType: "workflow.finished",
      agentId: agent?.id,
      payload: {
        kind: "prospecting_research",
        prospectId: prospect.id,
        score: scored.score,
      },
    });

    return {
      success: true,
      message: "Research completed.",
      prospect: updated as ProspectingProspectRow,
      researchRunId: run?.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Research failed";
    if (run?.id) {
      await supabase
        .from("prospecting_research_runs")
        .update({
          status: "failed",
          error_message: message,
          completed_at: new Date().toISOString(),
          latency_ms: Date.now() - started,
        })
        .eq("id", run.id);
    }
    await supabase
      .from("prospecting_prospects")
      .update({ status: "failed" })
      .eq("id", prospect.id);

    await logProspectingEvent({
      organizationId: params.organizationId,
      eventType: "research.failed",
      summary: `Research failed for ${prospect.company_name}: ${message}`,
      actorUserId: params.userId,
      prospectId: prospect.id,
      researchRunId: run?.id,
    });

    return { success: false, message };
  }
}
