"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { BUILDER_MODES } from "@/lib/email/campaign-builder/constants";
import { emptyWorkflowGraph, parseWorkflowGraph } from "@/lib/email/campaign-builder/graph";
import {
  scoreSubjectLine,
  suggestSubjectLines,
} from "@/lib/email/campaign-builder/scores";
import { getEmailCampaign } from "@/lib/email/campaign/queries";
import { EMAIL_CAMPAIGN_TYPES } from "@/lib/email/campaign/constants";
import { createDefaultCampaignReadyAudience } from "@/lib/email/audience";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { createClient } from "@/lib/supabase/server";
import { toUserFacingError } from "@/lib/ui/user-facing-error";
import type { Database, Json } from "@/types/supabase";

export type BuilderActionResult = {
  success: boolean;
  message: string;
  id?: string;
  scores?: Array<{
    subject: string;
    openRate: number;
    spamRisk: number;
    professionalTone: number;
    urgency: number;
    personalization: number;
    overall: number;
    rationale: string[];
    scoreId?: string;
  }>;
};

function revalidateBuilder(campaignId?: string) {
  revalidatePath("/email/campaigns");
  revalidatePath("/email/campaigns/builder");
  revalidatePath("/email/campaigns/calendar");
  revalidatePath("/email");
  if (campaignId) {
    revalidatePath(`/email/campaigns/${campaignId}`);
    revalidatePath(`/email/campaigns/${campaignId}/builder`);
  }
}

function canManage(role: string) {
  return role === "owner" || role === "admin";
}

const workflowSchema = z.object({
  campaignId: z.string().uuid(),
  graphJson: z.string().min(2).max(200_000),
});

export async function saveCampaignWorkflowAction(
  formData: FormData,
): Promise<BuilderActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Not authenticated." };
  if (!canManage(context.membership.role)) {
    return { success: false, message: "Only owners/admins can edit workflows." };
  }

  const parsed = workflowSchema.safeParse({
    campaignId: formData.get("campaignId"),
    graphJson: formData.get("graphJson"),
  });
  if (!parsed.success) {
    return { success: false, message: "Invalid workflow payload." };
  }

  let graphJson: Json;
  try {
    const raw = JSON.parse(parsed.data.graphJson) as unknown;
    graphJson = parseWorkflowGraph(raw) as unknown as Json;
  } catch {
    return { success: false, message: "Workflow JSON is invalid." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("email_campaigns")
    .update({
      workflow_graph_json: graphJson,
      builder_mode: "ai_builder",
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", context.organization.id)
    .eq("id", parsed.data.campaignId);

  if (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not save workflow."),
    };
  }

  revalidateBuilder(parsed.data.campaignId);
  return { success: true, message: "Workflow saved.", id: parsed.data.campaignId };
}

const briefSchema = z.object({
  campaignId: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  campaignType: z.enum(EMAIL_CAMPAIGN_TYPES).default("cold_outreach"),
  purpose: z.string().max(2000).optional(),
  audience: z.string().max(2000).optional(),
  offer: z.string().max(2000).optional(),
  cta: z.string().max(500).optional(),
  tone: z.string().max(64).optional(),
  language: z.string().max(16).default("en"),
  timezone: z.string().max(64).optional(),
  scheduledFor: z.string().optional(),
  tags: z.string().max(500).optional(),
});

export async function createAiBuilderCampaignAction(
  formData: FormData,
): Promise<BuilderActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Not authenticated." };
  if (!canManage(context.membership.role)) {
    return { success: false, message: "Only owners/admins can create campaigns." };
  }

  const parsed = briefSchema.safeParse({
    campaignId: formData.get("campaignId") || undefined,
    name: formData.get("name") || "AI Campaign",
    campaignType: formData.get("campaignType") || "cold_outreach",
    purpose: formData.get("purpose") || undefined,
    audience: formData.get("audience") || undefined,
    offer: formData.get("offer") || undefined,
    cta: formData.get("cta") || undefined,
    tone: formData.get("tone") || undefined,
    language: formData.get("language") || "en",
    timezone: formData.get("timezone") || undefined,
    scheduledFor: formData.get("scheduledFor") || undefined,
    tags: formData.get("tags") || undefined,
  });
  if (!parsed.success) {
    return { success: false, message: "Invalid campaign brief." };
  }

  const brief = {
    purpose: parsed.data.purpose,
    audience: parsed.data.audience,
    offer: parsed.data.offer,
    cta: parsed.data.cta,
    tone: parsed.data.tone,
    language: parsed.data.language,
    campaignType: parsed.data.campaignType,
  };

  const tags = (parsed.data.tags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);

  const graph = emptyWorkflowGraph();
  graph.nodes.push(
    {
      id: "send-1",
      type: "send_email",
      label: "Send Email",
      x: 300,
      y: 160,
      config: { cta: parsed.data.cta },
    },
    {
      id: "wait-1",
      type: "wait",
      label: "Wait 2 days",
      x: 520,
      y: 160,
      config: { unit: "days", amount: 2 },
    },
    {
      id: "condition-1",
      type: "condition",
      label: "If Opened",
      x: 740,
      y: 160,
      config: { trigger: "email_opened" },
    },
    {
      id: "end-1",
      type: "end",
      label: "End",
      x: 960,
      y: 160,
    },
  );
  graph.edges = [
    { id: "e1", source: "start", target: "send-1" },
    { id: "e2", source: "send-1", target: "wait-1" },
    { id: "e3", source: "wait-1", target: "condition-1" },
    { id: "e4", source: "condition-1", target: "end-1", label: "Default" },
  ];

  const supabase = await createClient();
  const payload = {
    organization_id: context.organization.id,
    name: parsed.data.name,
    description: parsed.data.purpose ?? null,
    campaign_type: parsed.data.campaignType,
    objective: parsed.data.purpose ?? null,
    language: parsed.data.language,
    status: "draft",
    builder_mode: "ai_builder" as const,
    workflow_graph_json: graph as unknown as Json,
    ai_brief_json: brief as unknown as Json,
    calendar_metadata_json: {
      timezone: parsed.data.timezone ?? "UTC",
      proposedStart: parsed.data.scheduledFor,
    } as unknown as Json,
    timezone: parsed.data.timezone ?? "UTC",
    scheduled_for: parsed.data.scheduledFor || null,
    tags,
    audience_definition_json: {
      ...createDefaultCampaignReadyAudience().filter,
      source: "campaign_ready",
    } as unknown as Json,
    owner_user_id: context.membership.user_id,
    created_by: context.membership.user_id,
  };

  if (parsed.data.campaignId) {
    const existing = await getEmailCampaign(
      context.organization.id,
      parsed.data.campaignId,
    );
    if (!existing) return { success: false, message: "Campaign not found." };
    const { error } = await supabase
      .from("email_campaigns")
      .update({
        name: payload.name,
        description: payload.description,
        campaign_type: payload.campaign_type,
        objective: payload.objective,
        language: payload.language,
        builder_mode: payload.builder_mode,
        workflow_graph_json: payload.workflow_graph_json,
        ai_brief_json: payload.ai_brief_json,
        calendar_metadata_json: payload.calendar_metadata_json,
        timezone: payload.timezone,
        scheduled_for: payload.scheduled_for,
        tags: payload.tags,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.campaignId)
      .eq("organization_id", context.organization.id);
    if (error) {
      return {
        success: false,
        message: toUserFacingError(error, "Could not update campaign."),
      };
    }
    revalidateBuilder(parsed.data.campaignId);
    return {
      success: true,
      message: "AI builder campaign updated.",
      id: parsed.data.campaignId,
    };
  }

  const { data, error } = await supabase
    .from("email_campaigns")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not create AI campaign."),
    };
  }

  await supabase.from("email_campaign_channel_plans").upsert(
    {
      organization_id: context.organization.id,
      campaign_id: data.id,
      channel: "email",
      enabled: true,
      settings_json: {} as Json,
    },
    { onConflict: "campaign_id,channel" },
  );

  revalidateBuilder(data.id);
  return { success: true, message: "AI builder campaign created.", id: data.id };
}

const subjectOptSchema = z.object({
  campaignId: z.string().uuid().optional(),
  purpose: z.string().max(500).optional(),
  offer: z.string().max(500).optional(),
  company: z.string().max(200).optional(),
  subjects: z.string().max(4000).optional(),
});

export async function optimizeSubjectsAction(
  formData: FormData,
): Promise<BuilderActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Not authenticated." };

  const parsed = subjectOptSchema.safeParse({
    campaignId: formData.get("campaignId") || undefined,
    purpose: formData.get("purpose") || undefined,
    offer: formData.get("offer") || undefined,
    company: formData.get("company") || undefined,
    subjects: formData.get("subjects") || undefined,
  });
  if (!parsed.success) {
    return { success: false, message: "Invalid subject optimizer input." };
  }

  const custom = (parsed.data.subjects ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const suggestions =
    custom.length > 0
      ? custom.slice(0, 8)
      : suggestSubjectLines({
          company: parsed.data.company,
          purpose: parsed.data.purpose,
          offer: parsed.data.offer,
        });

  const supabase = await createClient();
  const scores = [];

  for (const subject of suggestions) {
    const breakdown = scoreSubjectLine(subject);
    let scoreId: string | undefined;
    if (canManage(context.membership.role)) {
      const { data } = await supabase
        .from("email_ai_subject_scores")
        .insert({
          organization_id: context.organization.id,
          subject,
          campaign_id: parsed.data.campaignId ?? null,
          open_rate_score: breakdown.openRate,
          spam_risk_score: breakdown.spamRisk,
          professional_tone_score: breakdown.professionalTone,
          urgency_score: breakdown.urgency,
          personalization_score: breakdown.personalization,
          overall_score: breakdown.overall,
          rationale_json: { items: breakdown.rationale } as Json,
          provider: "deterministic",
          model: "subject-scorer-v1",
          created_by: context.membership.user_id,
        })
        .select("id")
        .single();
      scoreId = data?.id;
    }
    scores.push({
      subject,
      ...breakdown,
      scoreId,
    });
  }

  scores.sort((a, b) => b.overall - a.overall);
  if (parsed.data.campaignId) revalidateBuilder(parsed.data.campaignId);

  return {
    success: true,
    message: `Scored ${scores.length} subject lines.`,
    scores,
  };
}

const abSchema = z.object({
  campaignId: z.string().uuid(),
  name: z.string().min(1).max(200),
  dimension: z.enum([
    "subject",
    "content",
    "cta",
    "sender_name",
    "send_time",
  ]),
  variantA: z.string().min(1).max(5000),
  variantB: z.string().min(1).max(5000),
});

export async function createAbTestAction(
  formData: FormData,
): Promise<BuilderActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Not authenticated." };
  if (!canManage(context.membership.role)) {
    return { success: false, message: "Only owners/admins can create A/B tests." };
  }

  const parsed = abSchema.safeParse({
    campaignId: formData.get("campaignId"),
    name: formData.get("name") || "Subject A/B",
    dimension: formData.get("dimension") || "subject",
    variantA: formData.get("variantA"),
    variantB: formData.get("variantB"),
  });
  if (!parsed.success) {
    return { success: false, message: "Invalid A/B test payload." };
  }

  const campaign = await getEmailCampaign(
    context.organization.id,
    parsed.data.campaignId,
  );
  if (!campaign) return { success: false, message: "Campaign not found." };

  const supabase = await createClient();
  const { data: test, error } = await supabase
    .from("email_campaign_ab_tests")
    .insert({
      organization_id: context.organization.id,
      campaign_id: parsed.data.campaignId,
      name: parsed.data.name,
      test_dimension: parsed.data.dimension,
      status: "draft",
      created_by: context.membership.user_id,
    })
    .select("id")
    .single();

  if (error || !test) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not create A/B test."),
    };
  }

  const variantRows: Database["public"]["Tables"]["email_campaign_ab_variants"]["Insert"][] =
    [
      {
        organization_id: context.organization.id,
        ab_test_id: test.id,
        label: "A",
        weight: 50,
        is_control: true,
        subject:
          parsed.data.dimension === "subject" ? parsed.data.variantA : null,
        cta_label:
          parsed.data.dimension === "cta" ? parsed.data.variantA : null,
        sender_name_override:
          parsed.data.dimension === "sender_name"
            ? parsed.data.variantA
            : null,
        html_body:
          parsed.data.dimension === "content" ||
          parsed.data.dimension === "send_time"
            ? parsed.data.variantA
            : null,
      },
      {
        organization_id: context.organization.id,
        ab_test_id: test.id,
        label: "B",
        weight: 50,
        is_control: false,
        subject:
          parsed.data.dimension === "subject" ? parsed.data.variantB : null,
        cta_label:
          parsed.data.dimension === "cta" ? parsed.data.variantB : null,
        sender_name_override:
          parsed.data.dimension === "sender_name"
            ? parsed.data.variantB
            : null,
        html_body:
          parsed.data.dimension === "content" ||
          parsed.data.dimension === "send_time"
            ? parsed.data.variantB
            : null,
      },
    ];

  const { error: vErr } = await supabase
    .from("email_campaign_ab_variants")
    .insert(variantRows);
  if (vErr) {
    return {
      success: false,
      message: toUserFacingError(vErr, "A/B test created but variants failed."),
      id: test.id,
    };
  }

  revalidateBuilder(parsed.data.campaignId);
  return { success: true, message: "A/B test drafted.", id: test.id };
}

const modeSchema = z.object({
  campaignId: z.string().uuid(),
  builderMode: z.enum(BUILDER_MODES),
});

export async function setCampaignBuilderModeAction(
  formData: FormData,
): Promise<BuilderActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Not authenticated." };
  if (!canManage(context.membership.role)) {
    return { success: false, message: "Only owners/admins can change builder mode." };
  }

  const parsed = modeSchema.safeParse({
    campaignId: formData.get("campaignId"),
    builderMode: formData.get("builderMode"),
  });
  if (!parsed.success) {
    return { success: false, message: "Invalid builder mode." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("email_campaigns")
    .update({
      builder_mode: parsed.data.builderMode,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.campaignId)
    .eq("organization_id", context.organization.id);

  if (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not update builder mode."),
    };
  }

  revalidateBuilder(parsed.data.campaignId);
  return { success: true, message: "Builder mode updated.", id: parsed.data.campaignId };
}
