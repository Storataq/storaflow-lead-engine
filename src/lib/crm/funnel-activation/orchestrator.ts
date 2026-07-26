/**
 * Funnel Activation Orchestrator — idempotent company/lead → CRM pipeline path.
 * Does not send email.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { ensureDefaultCrmSetup } from "@/lib/crm/bootstrap";
import { logCrmActivity } from "@/lib/crm/activity";
import { buildLeadDraftFromCompany } from "@/lib/crm/from-company";
import { calculateCampaignReadiness } from "@/lib/crm/funnel-activation/campaign-readiness";
import {
  evaluateCompanyEligibility,
  evaluateContactEligibility,
} from "@/lib/crm/funnel-activation/eligibility";
import {
  resolveStageId,
  selectPipelineStage,
} from "@/lib/crm/funnel-activation/pipeline-mapping";
import { getFunnelActivationPolicy } from "@/lib/crm/funnel-activation/policy";
import { buildActivationTasks } from "@/lib/crm/funnel-activation/tasks";
import type {
  FunnelActivationRequest,
  FunnelActivationResult,
  FunnelActivationStatistics,
  FunnelActivationStatus,
} from "@/lib/crm/funnel-activation/types";
import { FUNNEL_COMPLIANCE_NOTICE } from "@/lib/crm/funnel-activation/types";
import { buildOpportunityRecord } from "@/lib/crm/opportunity-insights";
import { qualifyLead } from "@/lib/crm/qualification";
import type { CrmLeadWithRelations } from "@/lib/crm/queries";
import type { Database, Json } from "@/types/supabase";

type Client = SupabaseClient<Database>;

function asJson(value: Record<string, unknown>): Json {
  return value as Json;
}

function emptyStats(): FunnelActivationStatistics {
  return {
    leadCreated: false,
    leadReused: false,
    tasksCreated: 0,
    tasksReused: 0,
    dealRecommended: false,
    dealCreated: false,
    duplicatesPrevented: 0,
    warnings: [],
  };
}

function buildIdempotencyKey(companyId: string | null, leadId: string | null): string {
  return `funnel-v1:${companyId ?? "none"}:${leadId ?? "none"}`;
}

async function loadExclusions(
  supabase: Client,
  organizationId: string,
): Promise<{
  emails: Set<string>;
  domains: Set<string>;
  companies: Set<string>;
}> {
  const { data } = await supabase
    .from("exclusion_list")
    .select("exclusion_type, normalized_value")
    .eq("organization_id", organizationId)
    .limit(2000);

  const emails = new Set<string>();
  const domains = new Set<string>();
  const companies = new Set<string>();
  for (const row of data ?? []) {
    const value = row.normalized_value.toLowerCase();
    if (row.exclusion_type === "email") emails.add(value);
    if (row.exclusion_type === "domain") domains.add(value);
    if (row.exclusion_type === "company") companies.add(value);
  }
  return { emails, domains, companies };
}

async function updateRun(
  supabase: Client,
  organizationId: string,
  runId: string,
  patch: Database["public"]["Tables"]["funnel_activation_runs"]["Update"],
) {
  await supabase
    .from("funnel_activation_runs")
    .update(patch)
    .eq("organization_id", organizationId)
    .eq("id", runId);
}

function leadAsRelations(
  lead: Database["public"]["Tables"]["crm_leads"]["Row"] & {
    pipeline?: CrmLeadWithRelations["pipeline"];
    stage?: CrmLeadWithRelations["stage"];
  },
): CrmLeadWithRelations {
  return {
    ...lead,
    pipeline: lead.pipeline ?? null,
    stage: lead.stage ?? null,
  };
}

export async function runFunnelActivation(
  supabase: Client,
  request: FunnelActivationRequest,
): Promise<FunnelActivationResult> {
  const stats = emptyStats();
  const started = new Date().toISOString();
  await ensureDefaultCrmSetup(supabase, request.organizationId);

  const policy = await getFunnelActivationPolicy(
    supabase,
    request.organizationId,
  );

  if (
    policy.mode === "assisted" &&
    !request.confirmed &&
    request.triggerSource !== "retry" &&
    request.triggerSource !== "lead_detail"
  ) {
    // Assisted mode still allows explicit UI confirmation via confirmed=true
  }

  let companyId = request.companyId ?? null;
  let leadId = request.leadId ?? null;

  if (leadId && !companyId) {
    const { data: leadRow } = await supabase
      .from("crm_leads")
      .select("company_id")
      .eq("organization_id", request.organizationId)
      .eq("id", leadId)
      .maybeSingle();
    companyId = leadRow?.company_id ?? null;
  }

  if (!companyId && !leadId) {
    return {
      success: false,
      status: "failed",
      runId: null,
      companyId: null,
      leadId: null,
      pipelineId: null,
      stageId: null,
      stageSlug: null,
      stageReason: null,
      qualificationScore: 0,
      opportunityScore: 0,
      salesPriority: "not_ready",
      campaignReadinessStatus: "not_eligible",
      approvalStatus: "pending_review",
      preferredEmail: null,
      nextBestAction: null,
      statistics: stats,
      errors: [
        {
          step: "eligibility",
          category: "validation",
          message: "Company or lead is required",
        },
      ],
      message: "Company or lead is required.",
    };
  }

  const idempotencyKey = buildIdempotencyKey(companyId, leadId);

  // Reuse in-flight / recent completed run unless force
  if (!request.force) {
    const cutoff = new Date(
      Date.now() - policy.skipRecentActivationHours * 3600 * 1000,
    ).toISOString();
    const { data: recent } = await supabase
      .from("funnel_activation_runs")
      .select("*")
      .eq("organization_id", request.organizationId)
      .eq("idempotency_key", idempotencyKey)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (
      recent &&
      ["completed", "completed_with_warnings", "needs_review"].includes(
        recent.status,
      )
    ) {
      stats.duplicatesPrevented += 1;
      stats.warnings.push("Recent activation reused (idempotent)");
      const summary =
        recent.result_summary &&
        typeof recent.result_summary === "object" &&
        !Array.isArray(recent.result_summary)
          ? (recent.result_summary as Record<string, unknown>)
          : {};
      return {
        success: true,
        status: recent.status as FunnelActivationStatus,
        runId: recent.id,
        companyId: recent.company_id,
        leadId: recent.lead_id,
        pipelineId:
          typeof summary.pipelineId === "string" ? summary.pipelineId : null,
        stageId: typeof summary.stageId === "string" ? summary.stageId : null,
        stageSlug:
          typeof summary.stageSlug === "string" ? summary.stageSlug : null,
        stageReason:
          typeof summary.stageReason === "string" ? summary.stageReason : null,
        qualificationScore: Number(summary.qualificationScore ?? 0),
        opportunityScore: Number(summary.opportunityScore ?? 0),
        salesPriority:
          (summary.salesPriority as FunnelActivationResult["salesPriority"]) ??
          "not_ready",
        campaignReadinessStatus:
          (summary.campaignReadinessStatus as FunnelActivationResult["campaignReadinessStatus"]) ??
          "unknown",
        approvalStatus:
          (summary.approvalStatus as FunnelActivationResult["approvalStatus"]) ??
          "pending_review",
        preferredEmail:
          typeof summary.preferredEmail === "string"
            ? summary.preferredEmail
            : null,
        nextBestAction:
          typeof summary.nextBestAction === "string"
            ? summary.nextBestAction
            : null,
        statistics: stats,
        errors: [],
        message: "Recent funnel activation reused (idempotent).",
      };
    }
  }

  const { data: run, error: runError } = await supabase
    .from("funnel_activation_runs")
    .upsert(
      {
        organization_id: request.organizationId,
        company_id: companyId,
        lead_id: leadId,
        trigger_source: request.triggerSource,
        status: "evaluating",
        current_step: "eligibility",
        completed_steps: [],
        idempotency_key: idempotencyKey,
        started_at: started,
        created_by: request.userId ?? null,
        retry_count: request.triggerSource === "retry" ? 1 : 0,
        result_summary: {},
      },
      { onConflict: "organization_id,idempotency_key" },
    )
    .select("*")
    .single();

  if (runError || !run) {
    return {
      success: false,
      status: "failed",
      runId: null,
      companyId,
      leadId,
      pipelineId: null,
      stageId: null,
      stageSlug: null,
      stageReason: null,
      qualificationScore: 0,
      opportunityScore: 0,
      salesPriority: "not_ready",
      campaignReadinessStatus: "unknown",
      approvalStatus: "pending_review",
      preferredEmail: null,
      nextBestAction: null,
      statistics: stats,
      errors: [
        {
          step: "unknown",
          category: "unknown",
          message:
            runError?.message ??
            "Could not create activation run (migration may be pending)",
        },
      ],
      message:
        "Could not start funnel activation. Ensure migration 20260726000010_funnel_activation.sql is applied.",
    };
  }

  const runId = run.id;

  try {
    await logCrmActivity(supabase, {
      organizationId: request.organizationId,
      userId: request.userId,
      eventType: "funnel.activation_started",
      entityType: companyId ? "company" : "crm_lead",
      entityId: companyId ?? leadId!,
      description: "Funnel activation started",
      metadata: { runId, trigger: request.triggerSource },
    });

    const exclusions = await loadExclusions(supabase, request.organizationId);

    let company = null as Database["public"]["Tables"]["companies"]["Row"] | null;
    if (companyId) {
      const { data } = await supabase
        .from("companies")
        .select("*")
        .eq("organization_id", request.organizationId)
        .eq("id", companyId)
        .maybeSingle();
      company = data;
    }

    if (!company && !leadId) {
      throw Object.assign(new Error("Company not found"), {
        step: "eligibility",
        category: "validation",
      });
    }

    // Open lead for company
    let lead:
      | (Database["public"]["Tables"]["crm_leads"]["Row"] & {
          pipeline: CrmLeadWithRelations["pipeline"];
          stage: CrmLeadWithRelations["stage"];
        })
      | null = null;

    if (leadId) {
      const { data } = await supabase
        .from("crm_leads")
        .select("*")
        .eq("organization_id", request.organizationId)
        .eq("id", leadId)
        .maybeSingle();
      if (data) {
        lead = { ...data, pipeline: null, stage: null };
        if (!companyId) companyId = data.company_id;
      }
    } else if (companyId) {
      const { data: existingLeads } = await supabase
        .from("crm_leads")
        .select("*")
        .eq("organization_id", request.organizationId)
        .eq("company_id", companyId)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1);
      if (existingLeads?.[0]) {
        lead = { ...existingLeads[0], pipeline: null, stage: null };
        leadId = existingLeads[0].id;
        stats.leadReused = true;
        stats.duplicatesPrevented += 1;
      }
    }

    const companySuppressed =
      Boolean(
        company &&
          (exclusions.companies.has(company.company_name.toLowerCase()) ||
            (company.normalized_domain &&
              exclusions.domains.has(company.normalized_domain.toLowerCase()))),
      );

    const companyEligibility = company
      ? evaluateCompanyEligibility({
          company,
          openLeadExists: Boolean(lead),
          recentlyActivated: false,
          suppressed: companySuppressed,
          policy,
          force: request.force,
        })
      : {
          status: "eligible" as const,
          reasons: ["Lead-only activation"],
          blocked: false,
        };

    if (companyEligibility.blocked && companyEligibility.status === "suppressed") {
      await logCrmActivity(supabase, {
        organizationId: request.organizationId,
        userId: request.userId,
        eventType: "funnel.company_rejected",
        entityType: "company",
        entityId: companyId!,
        description: "Company rejected — suppressed",
        metadata: { reasons: companyEligibility.reasons },
      });
      throw Object.assign(new Error(companyEligibility.reasons.join("; ")), {
        step: "eligibility",
        category: "suppression",
      });
    }

    if (companyEligibility.status === "not_eligible") {
      await logCrmActivity(supabase, {
        organizationId: request.organizationId,
        userId: request.userId,
        eventType: "funnel.company_rejected",
        entityType: "company",
        entityId: companyId!,
        description: "Company not eligible",
        metadata: { reasons: companyEligibility.reasons },
      });
      throw Object.assign(new Error(companyEligibility.reasons.join("; ")), {
        step: "eligibility",
        category: "validation",
      });
    }

    await logCrmActivity(supabase, {
      organizationId: request.organizationId,
      userId: request.userId,
      eventType: "funnel.company_eligible",
      entityType: companyId ? "company" : "crm_lead",
      entityId: companyId ?? leadId!,
      description: "Company eligible for funnel activation",
      metadata: { reasons: companyEligibility.reasons },
    });

    // Contacts from company contacts table
    const { data: companyContacts } = companyId
      ? await supabase
          .from("contacts")
          .select("*")
          .eq("organization_id", request.organizationId)
          .eq("company_id", companyId)
          .limit(100)
      : { data: [] };

    const emailContacts = (companyContacts ?? []).filter(
      (c) => c.contact_type === "email",
    );
    const phoneContacts = (companyContacts ?? []).filter(
      (c) => c.contact_type === "phone",
    );

    const contactEligibility = evaluateContactEligibility(
      {
        emails: emailContacts.map((c) => ({
          value: c.contact_value,
          verification: c.verification_status,
          personName: c.person_name,
        })),
        phones: phoneContacts.map((c) => ({ value: c.contact_value })),
        leadEmail: lead?.email,
        leadPhone: lead?.phone,
        leadContactName: lead?.contact_name,
        suppressedEmails: exclusions.emails,
        suppressedDomains: exclusions.domains,
        suppressedCompanies: exclusions.companies,
      },
      policy,
    );

    await updateRun(supabase, request.organizationId, runId, {
      status: "creating_lead",
      current_step: "lead",
      completed_steps: ["eligibility", "contact_check"],
    });

    // Create lead if needed
    if (!lead && company) {
      const { data: pipelines } = await supabase
        .from("crm_pipelines")
        .select("*")
        .eq("organization_id", request.organizationId)
        .order("sort_order", { ascending: true });

      const pipeline =
        (policy.defaultPipelineId
          ? pipelines?.find((p) => p.id === policy.defaultPipelineId)
          : undefined) ??
        pipelines?.find((p) => p.is_default) ??
        pipelines?.[0];

      if (!pipeline) {
        throw Object.assign(new Error("No pipeline configured"), {
          step: "pipeline",
          category: "configuration",
        });
      }

      const { data: stages } = await supabase
        .from("crm_funnel_stages")
        .select("*")
        .eq("pipeline_id", pipeline.id)
        .order("sort_order", { ascending: true });

      const firstStage = stages?.[0];
      if (!firstStage) {
        throw Object.assign(new Error("Pipeline has no stages"), {
          step: "pipeline",
          category: "configuration",
        });
      }

      const draft = buildLeadDraftFromCompany(company);
      const bestEmail =
        emailContacts.find((c) => c.verification_status !== "invalid")
          ?.contact_value ?? null;
      const bestPhone =
        phoneContacts[0]?.contact_value ?? company.phone ?? null;
      const named =
        emailContacts.find((c) => c.person_name)?.person_name ?? null;

      const { data: created, error: createError } = await supabase
        .from("crm_leads")
        .insert({
          organization_id: request.organizationId,
          pipeline_id: pipeline.id,
          stage_id: firstStage.id,
          ...draft,
          email: bestEmail,
          phone: bestPhone,
          contact_name: named,
          tags: [
            ...(draft.tags ?? []),
            "funnel-activated",
            `activation:${request.triggerSource}`,
          ],
          owner_user_id: request.userId ?? null,
          created_by: request.userId ?? null,
          status: "open",
          lead_score: 10,
          deal_value: 0,
          notes: [
            draft.notes?.trim() || "",
            `Funnel activation ${new Date().toISOString().slice(0, 10)}. ${FUNNEL_COMPLIANCE_NOTICE}`,
          ]
            .filter(Boolean)
            .join("\n")
            .slice(0, 4000),
        })
        .select("*")
        .single();

      if (createError || !created) {
        throw Object.assign(
          new Error(createError?.message ?? "Lead creation failed"),
          { step: "lead", category: "unknown" },
        );
      }

      lead = { ...created, pipeline: null, stage: null };
      leadId = created.id;
      stats.leadCreated = true;

      await logCrmActivity(supabase, {
        organizationId: request.organizationId,
        userId: request.userId,
        eventType: "funnel.lead_created",
        entityType: "crm_lead",
        entityId: created.id,
        description: `Lead created via funnel activation: ${created.company_name}`,
        metadata: { companyId, runId },
      });
    } else if (lead) {
      stats.leadReused = true;
      const tags = new Set(lead.tags ?? []);
      tags.add("funnel-activated");
      const patch: Database["public"]["Tables"]["crm_leads"]["Update"] = {
        tags: [...tags],
        updated_at: new Date().toISOString(),
      };
      if (!lead.email && emailContacts[0]) {
        patch.email = emailContacts[0].contact_value;
      }
      if (!lead.phone && (phoneContacts[0] || company?.phone)) {
        patch.phone = phoneContacts[0]?.contact_value ?? company?.phone ?? null;
      }
      if (!lead.contact_name) {
        const named = emailContacts.find((c) => c.person_name)?.person_name;
        if (named) patch.contact_name = named;
      }
      await supabase
        .from("crm_leads")
        .update(patch)
        .eq("organization_id", request.organizationId)
        .eq("id", lead.id);

      await logCrmActivity(supabase, {
        organizationId: request.organizationId,
        userId: request.userId,
        eventType: "funnel.lead_reused",
        entityType: "crm_lead",
        entityId: lead.id,
        description: "Existing open lead reused for funnel activation",
        metadata: { companyId, runId },
      });

      // refresh lead
      const { data: refreshed } = await supabase
        .from("crm_leads")
        .select("*")
        .eq("id", lead.id)
        .single();
      if (refreshed) {
        lead = { ...refreshed, pipeline: null, stage: null };
      }
    }

    if (!lead || !leadId) {
      throw Object.assign(new Error("Lead unavailable after create/reuse"), {
        step: "lead",
        category: "unknown",
      });
    }

    await updateRun(supabase, request.organizationId, runId, {
      lead_id: leadId,
      company_id: companyId,
      status: "qualifying",
      current_step: "qualification",
      completed_steps: ["eligibility", "contact_check", "lead"],
    });

    const leadRelations = leadAsRelations(lead);
    const qualification = qualifyLead(leadRelations);
    const opportunity = buildOpportunityRecord(leadRelations, qualification);

    // Persist qualification score onto lead (reuse existing column)
    await supabase
      .from("crm_leads")
      .update({
        lead_score: Math.min(100, Math.max(0, qualification.score.total)),
      })
      .eq("organization_id", request.organizationId)
      .eq("id", leadId);

    await logCrmActivity(supabase, {
      organizationId: request.organizationId,
      userId: request.userId,
      eventType: "funnel.qualification_completed",
      entityType: "crm_lead",
      entityId: leadId,
      description: `Qualification ${qualification.classification} (${qualification.score.total})`,
      metadata: {
        score: qualification.score.total,
        classification: qualification.classification,
      },
    });

    await logCrmActivity(supabase, {
      organizationId: request.organizationId,
      userId: request.userId,
      eventType: "funnel.opportunity_refreshed",
      entityType: "crm_lead",
      entityId: leadId,
      description: `Opportunity ${opportunity.classification} (${opportunity.score.total})`,
      metadata: {
        score: opportunity.score.total,
        readiness: opportunity.outreachReadiness.status,
        nba: opportunity.nextBestActions.primary.title,
      },
    });

    await updateRun(supabase, request.organizationId, runId, {
      status: "assigning_pipeline",
      current_step: "pipeline",
      completed_steps: [
        "eligibility",
        "contact_check",
        "lead",
        "qualification",
        "opportunity",
        "priority",
      ],
    });

    const selectableContacts = [
      ...emailContacts.map((c) => ({
        id: c.id,
        email: c.contact_value,
        name: c.person_name,
        phone: null as string | null,
        verification: c.verification_status,
        isNamed: Boolean(c.person_name),
        confidence: c.verification_status === "syntax_valid" ? 70 : 50,
      })),
      ...(lead.email
        ? [
            {
              id: null,
              email: lead.email,
              name: lead.contact_name,
              phone: lead.phone,
              verification: "unknown",
              isNamed: Boolean(lead.contact_name),
              confidence: 60,
            },
          ]
        : []),
    ];

    const readiness = calculateCampaignReadiness({
      policy,
      companyEligible:
        companyEligibility.status === "eligible" ||
        companyEligibility.status === "needs_review" ||
        companyEligibility.status === "already_activated" ||
        !company,
      companyEligibilityReasons: companyEligibility.reasons,
      contactability: contactEligibility.contactability,
      suppressed:
        contactEligibility.suppressed || companySuppressed,
      suppressionReason: contactEligibility.suppressed
        ? "Contact exclusion"
        : companySuppressed
          ? "Company exclusion"
          : null,
      qualificationScore: qualification.score.total,
      opportunityScore: opportunity.score.total,
      qualified: qualification.qualified,
      outreachReady: opportunity.outreachReadiness.status === "ready",
      contacts: selectableContacts,
      companyName: lead.company_name,
      industry: lead.industry,
      city: lead.city,
      country: lead.country,
      website: lead.website,
      description: company?.description,
      contactName: lead.contact_name,
    });

    const stageMap = selectPipelineStage({
      campaignStatus: readiness.status,
      contactability: contactEligibility.contactability,
      qualificationScore: qualification.score.total,
      qualificationThreshold: policy.qualificationThreshold,
      salesPriority: readiness.salesPriority,
    });

    const { data: stages } = await supabase
      .from("crm_funnel_stages")
      .select("id, slug")
      .eq("pipeline_id", lead.pipeline_id)
      .order("sort_order", { ascending: true });

    const stageId = resolveStageId(stages ?? [], stageMap.stageSlug);
    if (stageId && stageId !== lead.stage_id) {
      // Never move into won/lost or first-email automatically
      const target = (stages ?? []).find((s) => s.id === stageId);
      if (
        target &&
        !["eerste-email", "follow-up", "demo-gepland", "onderhandeling", "gewonnen", "verloren"].includes(
          target.slug,
        )
      ) {
        await supabase
          .from("crm_leads")
          .update({ stage_id: stageId })
          .eq("organization_id", request.organizationId)
          .eq("id", leadId);

        await logCrmActivity(supabase, {
          organizationId: request.organizationId,
          userId: request.userId,
          eventType: "funnel.stage_assigned",
          entityType: "crm_lead",
          entityId: leadId,
          description: `Stage assigned: ${stageMap.stageSlug}`,
          metadata: { reason: stageMap.reason, stageId },
        });
      }
    }

    await logCrmActivity(supabase, {
      organizationId: request.organizationId,
      userId: request.userId,
      eventType: "funnel.pipeline_assigned",
      entityType: "crm_lead",
      entityId: leadId,
      description: `Pipeline retained: ${lead.pipeline_id}`,
      metadata: { pipelineId: lead.pipeline_id },
    });

    // Deal recommendation / optional create
    let dealRecommended = false;
    if (
      policy.autoDealMode !== "never" &&
      qualification.score.total >= policy.qualificationThreshold &&
      opportunity.score.total >= policy.opportunityThreshold &&
      readiness.preferredEmail
    ) {
      dealRecommended = true;
      stats.dealRecommended = true;
      await logCrmActivity(supabase, {
        organizationId: request.organizationId,
        userId: request.userId,
        eventType: "funnel.deal_recommended",
        entityType: "crm_lead",
        entityId: leadId,
        description: "Deal recommended (not auto-created by default)",
        metadata: { mode: policy.autoDealMode },
      });

      if (policy.autoDealMode === "automatic") {
        const { data: openDeal } = await supabase
          .from("crm_deals")
          .select("id")
          .eq("organization_id", request.organizationId)
          .eq("lead_id", leadId)
          .eq("status", "open")
          .limit(1)
          .maybeSingle();

        if (openDeal) {
          stats.duplicatesPrevented += 1;
        } else {
          const { data: deal, error: dealError } = await supabase
            .from("crm_deals")
            .insert({
              organization_id: request.organizationId,
              lead_id: leadId,
              pipeline_id: lead.pipeline_id,
              stage_id: stageId ?? lead.stage_id,
              title: `Deal — ${lead.company_name}`,
              value: 0,
              currency: lead.currency || "EUR",
              status: "open",
              owner_user_id: lead.owner_user_id,
              created_by: request.userId ?? null,
            })
            .select("id")
            .single();
          if (!dealError && deal) {
            stats.dealCreated = true;
            await logCrmActivity(supabase, {
              organizationId: request.organizationId,
              userId: request.userId,
              eventType: "funnel.deal_created",
              entityType: "crm_lead",
              entityId: leadId,
              description: "Deal created by funnel policy (value 0 — estimate unset)",
              metadata: { dealId: deal.id },
            });
          }
        }
      }
    }

    await updateRun(supabase, request.organizationId, runId, {
      status: "creating_tasks",
      current_step: "tasks",
    });

    if (policy.autoCreateTasks) {
      const suggested = buildActivationTasks({
        readiness,
        nextBestActionLabel: opportunity.nextBestActions.primary.title,
        salesPriority: readiness.salesPriority,
      });

      const { data: openTasks } = await supabase
        .from("crm_tasks")
        .select("id, title, status")
        .eq("organization_id", request.organizationId)
        .eq("lead_id", leadId)
        .in("status", ["todo", "in_progress"]);

      for (const task of suggested) {
        const existing = (openTasks ?? []).find(
          (t) => t.title === task.title,
        );
        if (existing) {
          stats.tasksReused += 1;
          stats.duplicatesPrevented += 1;
          continue;
        }
        const { data: createdTask, error: taskError } = await supabase
          .from("crm_tasks")
          .insert({
            organization_id: request.organizationId,
            lead_id: leadId,
            title: task.title,
            description: `${task.description}\n\n(System-suggested due date)`,
            due_at: task.dueAt,
            priority: task.priority,
            status: "todo",
            assigned_user_id: lead.owner_user_id,
            created_by: request.userId ?? null,
          })
          .select("id")
          .single();
        if (!taskError && createdTask) {
          stats.tasksCreated += 1;
          await logCrmActivity(supabase, {
            organizationId: request.organizationId,
            userId: request.userId,
            eventType: "funnel.task_created",
            entityType: "crm_lead",
            entityId: leadId,
            description: `Task created: ${task.title}`,
            metadata: { taskId: createdTask.id },
          });
        }
      }
    }

    await updateRun(supabase, request.organizationId, runId, {
      status: "calculating_campaign_readiness",
      current_step: "campaign_readiness",
    });

    // Upsert campaign readiness
    const { error: readinessError } = await supabase
      .from("campaign_readiness")
      .upsert(
        {
          organization_id: request.organizationId,
          lead_id: leadId,
          company_id: companyId,
          contact_id: readiness.contactId,
          status: readiness.status,
          approval_status: readiness.approvalStatus,
          sales_priority: readiness.salesPriority,
          personalization_status: readiness.personalizationStatus,
          preferred_email: readiness.preferredEmail,
          preferred_name: readiness.preferredName,
          preferred_phone: readiness.preferredPhone,
          contactability: readiness.contactability,
          qualification_score: readiness.qualificationScore,
          opportunity_score: readiness.opportunityScore,
          priority_score: readiness.priorityScore,
          reasons: readiness.reasons,
          missing_requirements: readiness.missingRequirements,
          factors_json: readiness.factors as unknown as Json,
          personalization_json: readiness.personalizationFields as unknown as Json,
          suppression_reason: readiness.suppressionReason,
          activation_run_id: runId,
          calculated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,lead_id" },
      );

    if (readinessError) {
      stats.warnings.push(
        `Campaign readiness persist warning: ${readinessError.message}`,
      );
    }

    // Tag lead for campaign-ready views
    const tagSet = new Set(lead.tags ?? []);
    tagSet.add("funnel-activated");
    if (
      readiness.status === "ready" ||
      readiness.status === "ready_with_review" ||
      readiness.status === "needs_approval"
    ) {
      tagSet.add("campaign-ready");
    }
    if (readiness.status === "suppressed") tagSet.add("suppressed");
    await supabase
      .from("crm_leads")
      .update({ tags: [...tagSet] })
      .eq("id", leadId)
      .eq("organization_id", request.organizationId);

    await logCrmActivity(supabase, {
      organizationId: request.organizationId,
      userId: request.userId,
      eventType: "funnel.campaign_readiness_calculated",
      entityType: "crm_lead",
      entityId: leadId,
      description: `Campaign readiness: ${readiness.status}`,
      metadata: {
        status: readiness.status,
        approval: readiness.approvalStatus,
        email: readiness.preferredEmail,
        priority: readiness.salesPriority,
      },
    });

    if (companyEligibility.status === "needs_review") {
      stats.warnings.push("Company marked needs review");
    }
    if (contactEligibility.contactability === "needs_review") {
      stats.warnings.push("Contactability needs review");
    }
    stats.warnings.push(FUNNEL_COMPLIANCE_NOTICE);

    const finalStatus: FunnelActivationStatus =
      stats.warnings.length > 1 || readiness.status === "needs_approval"
        ? readiness.status === "needs_contact" ||
          readiness.status === "not_qualified"
          ? "needs_review"
          : "completed_with_warnings"
        : "completed";

    const summary = {
      pipelineId: lead.pipeline_id,
      stageId: stageId ?? lead.stage_id,
      stageSlug: stageMap.stageSlug,
      stageReason: stageMap.reason,
      qualificationScore: qualification.score.total,
      opportunityScore: opportunity.score.total,
      salesPriority: readiness.salesPriority,
      campaignReadinessStatus: readiness.status,
      approvalStatus: readiness.approvalStatus,
      preferredEmail: readiness.preferredEmail,
      nextBestAction: opportunity.nextBestActions.primary.title,
      dealRecommended,
      statistics: stats,
    };

    await updateRun(supabase, request.organizationId, runId, {
      status: finalStatus,
      current_step: null,
      completed_steps: [
        "eligibility",
        "contact_check",
        "lead",
        "qualification",
        "opportunity",
        "priority",
        "pipeline",
        "deal",
        "tasks",
        "campaign_readiness",
        "timeline",
      ],
      warning_count: stats.warnings.length,
      completed_at: new Date().toISOString(),
      result_summary: asJson(summary),
      lead_id: leadId,
      company_id: companyId,
    });

    await logCrmActivity(supabase, {
      organizationId: request.organizationId,
      userId: request.userId,
      eventType:
        finalStatus === "completed"
          ? "funnel.workflow_completed"
          : "funnel.workflow_completed_with_warnings",
      entityType: "crm_lead",
      entityId: leadId,
      description:
        finalStatus === "completed"
          ? "Funnel activation completed"
          : "Funnel activation completed with warnings",
      metadata: { runId, status: readiness.status },
    });

    return {
      success: true,
      status: finalStatus,
      runId,
      companyId,
      leadId,
      pipelineId: lead.pipeline_id,
      stageId: stageId ?? lead.stage_id,
      stageSlug: stageMap.stageSlug,
      stageReason: stageMap.reason,
      qualificationScore: qualification.score.total,
      opportunityScore: opportunity.score.total,
      salesPriority: readiness.salesPriority,
      campaignReadinessStatus: readiness.status,
      approvalStatus: readiness.approvalStatus,
      preferredEmail: readiness.preferredEmail,
      nextBestAction: opportunity.nextBestActions.primary.title,
      statistics: stats,
      errors: [],
      message: `Funnel activation ${finalStatus.replaceAll("_", " ")}`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 240) : "Activation failed";
    const step =
      error && typeof error === "object" && "step" in error
        ? String((error as { step: string }).step)
        : "unknown";
    const category =
      error && typeof error === "object" && "category" in error
        ? String((error as { category: string }).category)
        : "unknown";

    await updateRun(supabase, request.organizationId, runId, {
      status: "failed",
      failed_step: step,
      error_message: message,
      completed_at: new Date().toISOString(),
    });

    await logCrmActivity(supabase, {
      organizationId: request.organizationId,
      userId: request.userId,
      eventType: "funnel.workflow_failed",
      entityType: companyId ? "company" : "crm_lead",
      entityId: companyId ?? leadId ?? runId,
      description: "Funnel activation failed",
      metadata: { runId, step, category },
    });

    return {
      success: false,
      status: "failed",
      runId,
      companyId,
      leadId,
      pipelineId: null,
      stageId: null,
      stageSlug: null,
      stageReason: null,
      qualificationScore: 0,
      opportunityScore: 0,
      salesPriority: "not_ready",
      campaignReadinessStatus: "unknown",
      approvalStatus: "pending_review",
      preferredEmail: null,
      nextBestAction: null,
      statistics: stats,
      errors: [
        {
          step: step as FunnelActivationResult["errors"][number]["step"],
          category: category as FunnelActivationResult["errors"][number]["category"],
          message,
        },
      ],
      message,
    };
  }
}
