"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  CAMPAIGN_COMPLIANCE_NOTICE,
  DEFAULT_CAMPAIGN_SETTINGS,
  EMAIL_CAMPAIGN_TYPES,
} from "@/lib/email/campaign/constants";
import {
  parseAudienceDefinition,
  parseCampaignSettings,
  previewCampaignAudience,
  buildEligibleAudienceForSnapshot,
  getEmailCampaign,
  listSenderProfiles,
  loadSuppressionLookup,
  lookupSuppressionStatus,
} from "@/lib/email/campaign/queries";
import { evaluateCampaignEligibility } from "@/lib/email/campaign/eligibility";
import { validateCampaign } from "@/lib/email/campaign/validation";
import { lockSequenceForCampaign } from "@/lib/email/sequence/actions";
import {
  getEmailSequence,
  parseStopRules,
} from "@/lib/email/sequence/queries";
import { parseStepsJson } from "@/lib/email/sequence/steps";
import { validateSequence } from "@/lib/email/sequence/validation";
import { createDefaultCampaignReadyAudience } from "@/lib/email/audience";
import { validateTemplateContent } from "@/lib/email/template";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { createClient } from "@/lib/supabase/server";
import { toUserFacingError } from "@/lib/ui/user-facing-error";
import { logCrmActivity } from "@/lib/crm/activity";
import type { Json } from "@/types/supabase";
import type { EmailSuppressionStatus } from "@/lib/email/types";

export type CampaignActionResult = {
  success: boolean;
  message: string;
  id?: string;
  readinessScore?: number;
};

function revalidateCampaigns(id?: string) {
  revalidatePath("/email/campaigns");
  revalidatePath("/email");
  if (id) {
    revalidatePath(`/email/campaigns/${id}`);
    revalidatePath(`/email/campaigns/${id}/edit`);
    revalidatePath(`/email/campaigns/${id}/wizard`);
  }
}

function canApprove(role: string): boolean {
  return role === "owner" || role === "admin";
}

async function logCampaignActivity(input: {
  organizationId: string;
  campaignId: string;
  userId: string | null;
  eventType: string;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  await supabase.from("email_campaign_activities").insert({
    organization_id: input.organizationId,
    campaign_id: input.campaignId,
    event_type: input.eventType,
    description: input.description,
    metadata_json: (input.metadata ?? {}) as Json,
    created_by: input.userId,
  });
  await logCrmActivity(supabase, {
    organizationId: input.organizationId,
    userId: input.userId,
    eventType: `email.${input.eventType}`,
    entityType: "email_campaign",
    entityId: input.campaignId,
    description: input.description,
    metadata: input.metadata,
  });
}

const campaignDetailsSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(4000).optional().nullable(),
  campaign_type: z.enum(EMAIL_CAMPAIGN_TYPES).default("custom"),
  objective: z.string().trim().max(2000).optional().nullable(),
  language: z.string().trim().min(2).max(16).default("en"),
  owner_user_id: z.union([z.string().uuid(), z.literal(""), z.null()]).optional(),
  template_id: z.union([z.string().uuid(), z.literal(""), z.null()]).optional(),
  sequence_id: z.union([z.string().uuid(), z.literal(""), z.null()]).optional(),
  sender_profile_id: z
    .union([z.string().uuid(), z.literal(""), z.null()])
    .optional(),
  notes: z.string().trim().max(4000).optional().nullable(),
  compliance_ack: z.union([z.literal("on"), z.literal("true"), z.null()]).optional(),
  max_recipients: z.coerce.number().int().min(1).max(50000).optional(),
  audience_json: z.string().optional(),
  settings_json: z.string().optional(),
});

function parseAudienceFromForm(raw: string | undefined): Json {
  if (!raw?.trim()) {
    return {
      ...createDefaultCampaignReadyAudience().filter,
      source: "campaign_ready",
    } as Json;
  }
  try {
    return JSON.parse(raw) as Json;
  } catch {
    return {
      ...createDefaultCampaignReadyAudience().filter,
      source: "campaign_ready",
    } as Json;
  }
}

function parseSettingsFromForm(raw: string | undefined): Json {
  const base = { ...DEFAULT_CAMPAIGN_SETTINGS };
  if (!raw?.trim()) return base as unknown as Json;
  try {
    return { ...base, ...(JSON.parse(raw) as object) } as Json;
  } catch {
    return base as unknown as Json;
  }
}

export async function createEmailCampaignAction(
  formData: FormData,
): Promise<CampaignActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const parsed = campaignDetailsSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    campaign_type: formData.get("campaign_type") || "custom",
    objective: formData.get("objective") || null,
    language: formData.get("language") || "en",
    owner_user_id: formData.get("owner_user_id") || "",
    template_id: formData.get("template_id") || "",
    sequence_id: formData.get("sequence_id") || "",
    sender_profile_id: formData.get("sender_profile_id") || "",
    notes: formData.get("notes") || null,
    compliance_ack: formData.get("compliance_ack"),
    max_recipients: formData.get("max_recipients") || DEFAULT_CAMPAIGN_SETTINGS.maxRecipients,
    audience_json: String(formData.get("audience_json") ?? ""),
    settings_json: String(formData.get("settings_json") ?? ""),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid campaign",
    };
  }

  const data = parsed.data;
  const settings = parseSettingsFromForm(data.settings_json);
  if (data.max_recipients) {
    (settings as Record<string, unknown>).maxRecipients = data.max_recipients;
  }

  try {
    const supabase = await createClient();
    const { data: created, error } = await supabase
      .from("email_campaigns")
      .insert({
        organization_id: context.organization.id,
        name: data.name,
        description: data.description ?? null,
        status: "draft",
        campaign_type: data.campaign_type,
        objective: data.objective ?? null,
        language: data.language,
        template_id: data.template_id || null,
        sequence_id: data.sequence_id || null,
        sender_profile_id: data.sender_profile_id || null,
        owner_user_id: data.owner_user_id || context.membership.user_id,
        created_by: context.membership.user_id,
        notes: data.notes ?? null,
        audience_definition_json: parseAudienceFromForm(data.audience_json),
        settings_json: settings,
        compliance_ack: Boolean(data.compliance_ack),
      })
      .select("id")
      .single();

    if (error || !created) {
      return {
        success: false,
        message: toUserFacingError(
          error,
          "Kon campaign niet aanmaken. Voer migratie 000013 uit indien nodig.",
        ),
      };
    }

    await logCampaignActivity({
      organizationId: context.organization.id,
      campaignId: created.id,
      userId: context.membership.user_id,
      eventType: "campaign_created",
      description: `Campaign "${data.name}" created as draft`,
    });

    revalidateCampaigns(created.id);
    return {
      success: true,
      message: "Campaign created as draft",
      id: created.id,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon campaign niet aanmaken."),
    };
  }
}

export async function updateEmailCampaignAction(
  campaignId: string,
  formData: FormData,
): Promise<CampaignActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const existing = await getEmailCampaign(
    context.organization.id,
    campaignId,
  );
  if (!existing) return { success: false, message: "Campaign not found." };

  if (existing.locked || existing.status === "approved") {
    return {
      success: false,
      message:
        "Approved campaigns are locked. Return to Draft to edit (invalidates approval).",
    };
  }
  if (existing.status === "archived") {
    return {
      success: false,
      message: "Archived campaigns cannot be edited. Restore to Draft first.",
    };
  }

  const parsed = campaignDetailsSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    campaign_type: formData.get("campaign_type") || existing.campaign_type,
    objective: formData.get("objective") || null,
    language: formData.get("language") || existing.language,
    owner_user_id: formData.get("owner_user_id") || "",
    template_id: formData.get("template_id") || "",
    sequence_id: formData.get("sequence_id") || "",
    sender_profile_id: formData.get("sender_profile_id") || "",
    notes: formData.get("notes") || null,
    compliance_ack: formData.get("compliance_ack"),
    max_recipients:
      formData.get("max_recipients") ||
      parseCampaignSettings(existing.settings_json).maxRecipients ||
      DEFAULT_CAMPAIGN_SETTINGS.maxRecipients,
    audience_json: String(formData.get("audience_json") ?? ""),
    settings_json: String(formData.get("settings_json") ?? ""),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid campaign",
    };
  }

  const data = parsed.data;
  const settings = parseSettingsFromForm(
    data.settings_json || JSON.stringify(existing.settings_json),
  );
  if (data.max_recipients) {
    (settings as Record<string, unknown>).maxRecipients = data.max_recipients;
  }

  const audienceJson = data.audience_json?.trim()
    ? parseAudienceFromForm(data.audience_json)
    : existing.audience_definition_json;

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("email_campaigns")
      .update({
        name: data.name,
        description: data.description ?? null,
        campaign_type: data.campaign_type,
        objective: data.objective ?? null,
        language: data.language,
        template_id: data.template_id || null,
        sequence_id: data.sequence_id || null,
        sender_profile_id: data.sender_profile_id || null,
        owner_user_id: data.owner_user_id || existing.owner_user_id,
        notes: data.notes ?? null,
        audience_definition_json: audienceJson,
        settings_json: settings,
        compliance_ack: Boolean(data.compliance_ack) || existing.compliance_ack,
        status:
          existing.status === "ready" ||
          existing.status === "needs_review" ||
          (data.sequence_id || null) !== existing.sequence_id
            ? "draft"
            : existing.status,
        sequence_version_id:
          (data.sequence_id || null) !== existing.sequence_id
            ? null
            : existing.sequence_version_id,
        sequence_version:
          (data.sequence_id || null) !== existing.sequence_id
            ? null
            : existing.sequence_version,
        sequence_name_snapshot:
          (data.sequence_id || null) !== existing.sequence_id
            ? null
            : existing.sequence_name_snapshot,
        sequence_steps_snapshot:
          (data.sequence_id || null) !== existing.sequence_id
            ? null
            : existing.sequence_steps_snapshot,
        locked:
          (data.sequence_id || null) !== existing.sequence_id
            ? false
            : existing.locked,
        approved_at:
          (data.sequence_id || null) !== existing.sequence_id
            ? null
            : existing.approved_at,
        approved_by:
          (data.sequence_id || null) !== existing.sequence_id
            ? null
            : existing.approved_by,
      })
      .eq("organization_id", context.organization.id)
      .eq("id", campaignId);

    if (error) {
      return {
        success: false,
        message: toUserFacingError(error, "Kon campaign niet bijwerken."),
      };
    }

    await logCampaignActivity({
      organizationId: context.organization.id,
      campaignId,
      userId: context.membership.user_id,
      eventType: "campaign_updated",
      description: `Campaign "${data.name}" updated`,
    });

    if (
      JSON.stringify(audienceJson) !==
      JSON.stringify(existing.audience_definition_json)
    ) {
      await logCampaignActivity({
        organizationId: context.organization.id,
        campaignId,
        userId: context.membership.user_id,
        eventType: "audience_changed",
        description: "Audience definition changed",
      });
    }

    if ((data.template_id || null) !== existing.template_id) {
      await logCampaignActivity({
        organizationId: context.organization.id,
        campaignId,
        userId: context.membership.user_id,
        eventType: "template_selected",
        description: `Template selected: ${data.template_id || "none"}`,
      });
    }

    if ((data.sequence_id || null) !== existing.sequence_id) {
      await logCampaignActivity({
        organizationId: context.organization.id,
        campaignId,
        userId: context.membership.user_id,
        eventType: "sequence_selected",
        description: `Sequence selected: ${data.sequence_id || "none"}`,
      });
    }

    revalidateCampaigns(campaignId);
    return { success: true, message: "Campaign updated", id: campaignId };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon campaign niet bijwerken."),
    };
  }
}

export async function duplicateEmailCampaignAction(
  campaignId: string,
): Promise<CampaignActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const source = await getEmailCampaign(context.organization.id, campaignId);
  if (!source) return { success: false, message: "Campaign not found." };

  try {
    const supabase = await createClient();
    const { data: created, error } = await supabase
      .from("email_campaigns")
      .insert({
        organization_id: context.organization.id,
        name: `${source.name} (copy)`,
        description: source.description,
        status: "draft",
        campaign_type: source.campaign_type,
        objective: source.objective,
        language: source.language,
        template_id: source.template_id,
        sender_profile_id: source.sender_profile_id,
        owner_user_id: context.membership.user_id,
        created_by: context.membership.user_id,
        notes: source.notes,
        audience_definition_json: source.audience_definition_json,
        settings_json: source.settings_json,
        compliance_ack: false,
        locked: false,
        approved_at: null,
        approved_by: null,
        archived_at: null,
        template_version_id: null,
        template_subject_snapshot: null,
        template_preview_snapshot: null,
        template_html_snapshot: null,
        template_text_snapshot: null,
        template_variables_snapshot: [],
        recipient_count: 0,
        valid_recipient_count: 0,
        excluded_recipient_count: 0,
        readiness_score: 0,
        readiness_classification: "not_ready",
        last_validation_json: {},
        sequence_id: null,
        sequence_version: null,
        sequence_version_id: null,
        sequence_name_snapshot: null,
        sequence_steps_snapshot: null,
      })
      .select("id")
      .single();

    if (error || !created) {
      return {
        success: false,
        message: toUserFacingError(error, "Kon campaign niet dupliceren."),
      };
    }

    await logCampaignActivity({
      organizationId: context.organization.id,
      campaignId: created.id,
      userId: context.membership.user_id,
      eventType: "campaign_duplicated",
      description: `Duplicated from ${campaignId}`,
      metadata: { sourceCampaignId: campaignId },
    });

    revalidateCampaigns(created.id);
    return {
      success: true,
      message: "Campaign duplicated as draft",
      id: created.id,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon campaign niet dupliceren."),
    };
  }
}

export async function archiveEmailCampaignAction(
  campaignId: string,
): Promise<CampaignActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("email_campaigns")
    .update({
      status: "archived",
      archived_at: new Date().toISOString(),
      locked: true,
    })
    .eq("organization_id", context.organization.id)
    .eq("id", campaignId);

  if (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon campaign niet archiveren."),
    };
  }

  await logCampaignActivity({
    organizationId: context.organization.id,
    campaignId,
    userId: context.membership.user_id,
    eventType: "campaign_archived",
    description: "Campaign archived",
  });

  revalidateCampaigns(campaignId);
  return { success: true, message: "Campaign archived", id: campaignId };
}

export async function restoreEmailCampaignAction(
  campaignId: string,
): Promise<CampaignActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("email_campaigns")
    .update({
      status: "draft",
      archived_at: null,
      locked: false,
      approved_at: null,
      approved_by: null,
      template_version_id: null,
      template_subject_snapshot: null,
      template_html_snapshot: null,
      template_text_snapshot: null,
      template_preview_snapshot: null,
      template_variables_snapshot: [],
    })
    .eq("organization_id", context.organization.id)
    .eq("id", campaignId);

  if (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon campaign niet herstellen."),
    };
  }

  await logCampaignActivity({
    organizationId: context.organization.id,
    campaignId,
    userId: context.membership.user_id,
    eventType: "campaign_restored",
    description: "Campaign restored to draft",
  });

  revalidateCampaigns(campaignId);
  return { success: true, message: "Campaign restored to draft", id: campaignId };
}

export async function returnCampaignToDraftAction(
  campaignId: string,
): Promise<CampaignActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const existing = await getEmailCampaign(context.organization.id, campaignId);
  if (!existing) return { success: false, message: "Campaign not found." };

  const supabase = await createClient();
  await supabase
    .from("email_campaign_approvals")
    .update({ status: "invalidated" })
    .eq("organization_id", context.organization.id)
    .eq("campaign_id", campaignId)
    .eq("status", "approved");

  const { error } = await supabase
    .from("email_campaigns")
    .update({
      status: "draft",
      locked: false,
      approved_at: null,
      approved_by: null,
    })
    .eq("organization_id", context.organization.id)
    .eq("id", campaignId);

  if (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon goedkeuring niet intrekken."),
    };
  }

  await logCampaignActivity({
    organizationId: context.organization.id,
    campaignId,
    userId: context.membership.user_id,
    eventType: "approval_invalidated",
    description:
      "Approval invalidated — campaign returned to draft for edits",
  });

  revalidateCampaigns(campaignId);
  return {
    success: true,
    message: "Returned to draft — approval invalidated",
    id: campaignId,
  };
}

async function lockTemplateSnapshot(
  organizationId: string,
  campaignId: string,
  templateId: string,
  userId: string | null,
) {
  const supabase = await createClient();
  const { data: template } = await supabase
    .from("email_templates")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", templateId)
    .maybeSingle();
  if (!template) throw new Error("Template not found");

  let versionId: string | null = null;
  const { data: version } = await supabase
    .from("email_template_versions")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("template_id", templateId)
    .eq("is_current", true)
    .maybeSingle();
  versionId = version?.id ?? null;

  if (!versionId) {
    const { data: inserted } = await supabase
      .from("email_template_versions")
      .insert({
        organization_id: organizationId,
        template_id: templateId,
        version_number: template.version,
        name: template.name,
        subject: template.subject,
        preview_text: template.preview_text,
        html_body: template.html_body,
        text_body: template.text_body,
        variables: template.variables,
        change_notes: "Locked for campaign approval",
        is_current: true,
        created_by: userId,
      })
      .select("id")
      .single();
    versionId = inserted?.id ?? null;
  }

  await supabase
    .from("email_campaigns")
    .update({
      template_version_id: versionId,
      template_subject_snapshot: template.subject,
      template_preview_snapshot: template.preview_text,
      template_html_snapshot: template.html_body,
      template_text_snapshot: template.text_body,
      template_variables_snapshot: template.variables,
    })
    .eq("organization_id", organizationId)
    .eq("id", campaignId);

  await logCampaignActivity({
    organizationId,
    campaignId,
    userId,
    eventType: "template_version_locked",
    description: `Template version locked (${template.name} v${template.version})`,
    metadata: { templateId, versionId },
  });

  return { template, versionId };
}

export async function createRecipientSnapshotAction(
  campaignId: string,
): Promise<CampaignActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const campaign = await getEmailCampaign(context.organization.id, campaignId);
  if (!campaign) return { success: false, message: "Campaign not found." };
  if (campaign.locked && campaign.status === "approved") {
    return {
      success: false,
      message: "Cannot rebuild snapshot on an approved locked campaign.",
    };
  }

  try {
    const definition = parseAudienceDefinition(campaign.audience_definition_json);
    const { kept, matched, deduped } = await buildEligibleAudienceForSnapshot({
      organizationId: context.organization.id,
      definition,
      campaignLanguage: campaign.language,
    });
    const lookup = await loadSuppressionLookup(context.organization.id);
    const supabase = await createClient();

    // Clear previous non-execution recipients for this campaign
    await supabase
      .from("email_recipients")
      .delete()
      .eq("organization_id", context.organization.id)
      .eq("campaign_id", campaignId);

    const now = new Date().toISOString();
    const rows = [];
    let valid = 0;
    let excluded = 0;

    for (const item of kept) {
      const email = item.candidate.preferredEmail;
      const suppressionStatus = lookupSuppressionStatus(
        lookup,
        email,
      ) as EmailSuppressionStatus;
      const eligibility = evaluateCampaignEligibility({
        candidate: item.candidate,
        suppressionStatus:
          suppressionStatus === "active" ? "active" : suppressionStatus,
        campaignLanguage: campaign.language,
        isDuplicate: false,
      });

      if (!eligibility.preferredEmail) {
        excluded += 1;
        continue;
      }

      if (eligibility.eligible) valid += 1;
      else excluded += 1;

      rows.push({
        organization_id: context.organization.id,
        campaign_id: campaignId,
        company_id: item.candidate.companyId,
        lead_id: item.candidate.leadId,
        contact_id: item.candidate.contactId,
        preferred_email: eligibility.preferredEmail,
        preferred_name: item.candidate.preferredName,
        language: item.candidate.language ?? campaign.language,
        campaign_status: eligibility.eligible ? "pending" : "suppressed",
        sequence_status: "not_started",
        suppression_status:
          suppressionStatus === "active" ? "active" : suppressionStatus,
        validation_status: eligibility.eligible
          ? "syntax_valid"
          : "not_checked",
        personalization_json: item.candidate.personalization as Json,
        is_snapshot: true,
        eligibility_status: eligibility.status,
        exclusion_reason: eligibility.eligible
          ? null
          : eligibility.reasons.join("; "),
        company_name: item.candidate.companyName,
        owner_user_id: item.candidate.ownerUserId,
        qualification_score: item.candidate.qualificationScore,
        opportunity_score: item.candidate.opportunityScore,
        priority: item.candidate.salesPriority,
        source: item.candidate.source,
        snapshot_at: now,
        personalization_status: item.candidate.personalizationStatus,
      });
    }

    for (const item of deduped.filter((d) => !d.kept)) {
      if (!item.candidate.preferredEmail) continue;
      excluded += 1;
      rows.push({
        organization_id: context.organization.id,
        campaign_id: campaignId,
        company_id: item.candidate.companyId,
        lead_id: item.candidate.leadId,
        contact_id: item.candidate.contactId,
        preferred_email: item.candidate.preferredEmail,
        preferred_name: item.candidate.preferredName,
        language: item.candidate.language ?? campaign.language,
        campaign_status: "suppressed",
        sequence_status: "not_started",
        suppression_status: "active",
        validation_status: "not_checked",
        personalization_json: item.candidate.personalization as Json,
        is_snapshot: true,
        eligibility_status: "duplicate",
        exclusion_reason: `Duplicate of lead ${item.duplicateOfLeadId}`,
        company_name: item.candidate.companyName,
        owner_user_id: item.candidate.ownerUserId,
        qualification_score: item.candidate.qualificationScore,
        opportunity_score: item.candidate.opportunityScore,
        priority: item.candidate.salesPriority,
        source: item.candidate.source,
        snapshot_at: now,
        personalization_status: item.candidate.personalizationStatus,
      });
    }

    // Batch insert
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const chunk = rows.slice(i, i + batchSize);
      const { error } = await supabase.from("email_recipients").insert(chunk);
      if (error) throw new Error(error.message);
    }

    await supabase
      .from("email_campaigns")
      .update({
        recipient_count: matched.length,
        valid_recipient_count: valid,
        excluded_recipient_count: excluded,
      })
      .eq("organization_id", context.organization.id)
      .eq("id", campaignId);

    await logCampaignActivity({
      organizationId: context.organization.id,
      campaignId,
      userId: context.membership.user_id,
      eventType: "recipient_snapshot_created",
      description: `Recipient snapshot created (${valid} valid / ${matched.length} matched)`,
      metadata: { valid, matched: matched.length, excluded },
    });

    revalidateCampaigns(campaignId);
    return {
      success: true,
      message: `Snapshot created: ${valid} valid recipients`,
      id: campaignId,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon recipient snapshot niet maken."),
    };
  }
}

export async function validateEmailCampaignAction(
  campaignId: string,
): Promise<CampaignActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const campaign = await getEmailCampaign(context.organization.id, campaignId);
  if (!campaign) return { success: false, message: "Campaign not found." };

  try {
    const supabase = await createClient();
    const definition = parseAudienceDefinition(campaign.audience_definition_json);
    const preview = await previewCampaignAudience({
      organizationId: context.organization.id,
      definition,
      page: 1,
      pageSize: 25,
    });

    await logCampaignActivity({
      organizationId: context.organization.id,
      campaignId,
      userId: context.membership.user_id,
      eventType: "audience_preview_generated",
      description: `Audience preview: ${preview.statistics.totalMatching} matching`,
      metadata: { statistics: preview.statistics },
    });

    let templateStatus: string | null = null;
    let templateLanguage: string | null = null;
    let brokenVariableCount = 0;
    if (campaign.template_id) {
      const { data: template } = await supabase
        .from("email_templates")
        .select("*")
        .eq("organization_id", context.organization.id)
        .eq("id", campaign.template_id)
        .maybeSingle();
      templateStatus = template?.status ?? null;
      templateLanguage = template?.language ?? null;
      if (template) {
        const validation = validateTemplateContent({
          subject: template.subject,
          previewText: template.preview_text,
          htmlBody: template.html_body,
          textBody: template.text_body,
        });
        brokenVariableCount = validation.variableIssues.filter(
          (i) => i.severity === "error",
        ).length;
      }
    }

    const senders = await listSenderProfiles(context.organization.id);
    const sender = senders.find((s) => s.id === campaign.sender_profile_id);
    const settings = parseCampaignSettings(campaign.settings_json);

    let sequenceStatus: string | null = null;
    let sequenceReadinessScore = 0;
    let sequenceBlockingCount = 0;
    let sequenceLanguage: string | null = null;
    if (campaign.sequence_id) {
      const sequence = await getEmailSequence(
        context.organization.id,
        campaign.sequence_id,
      );
      if (sequence) {
        sequenceStatus = sequence.status;
        sequenceReadinessScore = sequence.readiness_score ?? 0;
        sequenceLanguage = sequence.default_language;
        const seqValidation = validateSequence({
          name: sequence.name,
          status: sequence.status,
          steps: parseStepsJson(sequence.steps_json),
          stopRules: parseStopRules(sequence.stop_rules_json),
          isActive: sequence.status === "active",
        });
        sequenceBlockingCount = seqValidation.summary.blockingCount;
        if (sequenceReadinessScore === 0) {
          sequenceReadinessScore = seqValidation.readinessScore;
        }
      }
    }

    const result = validateCampaign({
      name: campaign.name,
      status: campaign.status,
      campaignType: campaign.campaign_type,
      objective: campaign.objective,
      language: campaign.language,
      templateId: campaign.template_id,
      templateStatus,
      templateLanguage,
      sequenceId: campaign.sequence_id,
      sequenceStatus,
      sequenceReadinessScore,
      sequenceBlockingCount,
      sequenceLanguage,
      senderProfileId: campaign.sender_profile_id,
      senderStatus: sender?.status,
      audienceStats: preview.statistics,
      maxRecipients:
        typeof settings.maxRecipients === "number"
          ? settings.maxRecipients
          : DEFAULT_CAMPAIGN_SETTINGS.maxRecipients,
      complianceAck: campaign.compliance_ack,
      unsubscribeRequired:
        settings.unsubscribeRequired !== false,
      brokenVariableCount,
      approved: campaign.status === "approved",
    });

    await supabase.from("email_campaign_validations").insert({
      organization_id: context.organization.id,
      campaign_id: campaignId,
      readiness_score: result.readinessScore,
      classification: result.classification,
      blocking_count: result.summary.blockingCount,
      warning_count: result.summary.warningCount,
      info_count: result.summary.infoCount,
      issues_json: result.issues as unknown as Json,
      summary_json: {
        ...result.summary,
        recommendations: result.recommendations,
        complianceNotice: CAMPAIGN_COMPLIANCE_NOTICE,
      } as unknown as Json,
      created_by: context.membership.user_id,
    });

    const nextStatus =
      result.ok && result.readinessScore >= 70
        ? campaign.status === "approved"
          ? "approved"
          : "ready"
        : result.summary.blockingCount > 0
          ? "needs_review"
          : campaign.status === "draft"
            ? "draft"
            : "needs_review";

    await supabase
      .from("email_campaigns")
      .update({
        readiness_score: result.readinessScore,
        readiness_classification: result.classification,
        last_validation_json: result as unknown as Json,
        recipient_count: preview.statistics.totalMatching,
        valid_recipient_count: preview.statistics.validRecipients,
        excluded_recipient_count:
          preview.statistics.totalMatching -
          preview.statistics.validRecipients,
        status:
          campaign.status === "approved" || campaign.status === "archived"
            ? campaign.status
            : nextStatus,
      })
      .eq("organization_id", context.organization.id)
      .eq("id", campaignId);

    await logCampaignActivity({
      organizationId: context.organization.id,
      campaignId,
      userId: context.membership.user_id,
      eventType: result.ok ? "validation_completed" : "validation_failed",
      description: `Validation ${result.ok ? "passed" : "failed"} — score ${result.readinessScore}`,
      metadata: {
        score: result.readinessScore,
        classification: result.classification,
      },
    });

    revalidateCampaigns(campaignId);
    return {
      success: true,
      message: result.ok
        ? `Validation passed (score ${result.readinessScore})`
        : `Validation has blocking issues (score ${result.readinessScore})`,
      id: campaignId,
      readinessScore: result.readinessScore,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Validatie mislukt."),
    };
  }
}

export async function submitCampaignForReviewAction(
  campaignId: string,
): Promise<CampaignActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const validation = await validateEmailCampaignAction(campaignId);
  if (!validation.success) return validation;

  const campaign = await getEmailCampaign(context.organization.id, campaignId);
  if (!campaign) return { success: false, message: "Campaign not found." };
  if (!campaign.compliance_ack) {
    return {
      success: false,
      message: "Acknowledge compliance responsibility before review.",
    };
  }

  const snapshot = await createRecipientSnapshotAction(campaignId);
  if (!snapshot.success) return snapshot;

  const supabase = await createClient();
  await supabase
    .from("email_campaigns")
    .update({ status: "needs_review" })
    .eq("organization_id", context.organization.id)
    .eq("id", campaignId);

  await supabase.from("email_campaign_approvals").insert({
    organization_id: context.organization.id,
    campaign_id: campaignId,
    status: "pending_review",
    created_by: context.membership.user_id,
    recipient_count_snapshot: campaign.valid_recipient_count,
    validation_snapshot: campaign.last_validation_json,
  });

  await logCampaignActivity({
    organizationId: context.organization.id,
    campaignId,
    userId: context.membership.user_id,
    eventType: "campaign_submitted_for_review",
    description: "Campaign submitted for review",
  });

  revalidateCampaigns(campaignId);
  return {
    success: true,
    message: "Submitted for review",
    id: campaignId,
  };
}

export async function approveEmailCampaignAction(
  campaignId: string,
  formData: FormData,
): Promise<CampaignActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  if (!canApprove(context.membership.role)) {
    return {
      success: false,
      message: "Only organization owners or admins may approve campaigns.",
    };
  }

  const notes = String(formData.get("notes") ?? "").trim();
  const campaign = await getEmailCampaign(context.organization.id, campaignId);
  if (!campaign) return { success: false, message: "Campaign not found." };

  const validation = await validateEmailCampaignAction(campaignId);
  if (!validation.success) return validation;

  const refreshed = await getEmailCampaign(context.organization.id, campaignId);
  if (!refreshed) return { success: false, message: "Campaign not found." };
  if ((refreshed.readiness_score ?? 0) < 70 || !refreshed.compliance_ack) {
    return {
      success: false,
      message: "Campaign is not ready for approval (score/compliance).",
    };
  }

  const lastValidation = refreshed.last_validation_json as {
    ok?: boolean;
    summary?: { hasBlocking?: boolean };
  };
  if (lastValidation?.summary?.hasBlocking || lastValidation?.ok === false) {
    return {
      success: false,
      message: "Resolve blocking validation issues before approval.",
    };
  }

  if (!refreshed.template_id && !refreshed.sequence_id) {
    return {
      success: false,
      message: "Template or sequence required for approval.",
    };
  }

  try {
    await createRecipientSnapshotAction(campaignId);
    let templateVersionId: string | null = null;
    if (refreshed.template_id) {
      const lockedTemplate = await lockTemplateSnapshot(
        context.organization.id,
        campaignId,
        refreshed.template_id,
        context.membership.user_id,
      );
      templateVersionId = lockedTemplate.versionId;
    }
    if (refreshed.sequence_id) {
      await lockSequenceForCampaign({
        organizationId: context.organization.id,
        campaignId,
        sequenceId: refreshed.sequence_id,
        userId: context.membership.user_id,
      });
    }

    const supabase = await createClient();
    const now = new Date().toISOString();
    await supabase
      .from("email_campaigns")
      .update({
        status: "approved",
        locked: true,
        approved_at: now,
        approved_by: context.membership.user_id,
        readiness_classification: "approved",
      })
      .eq("organization_id", context.organization.id)
      .eq("id", campaignId);

    await supabase.from("email_campaign_approvals").insert({
      organization_id: context.organization.id,
      campaign_id: campaignId,
      status: "approved",
      reviewer_user_id: context.membership.user_id,
      reviewed_at: now,
      decision: "approved",
      notes: notes || null,
      validation_snapshot: refreshed.last_validation_json,
      recipient_count_snapshot: refreshed.valid_recipient_count,
      template_version_id: templateVersionId,
      created_by: context.membership.user_id,
    });

    await logCampaignActivity({
      organizationId: context.organization.id,
      campaignId,
      userId: context.membership.user_id,
      eventType: "campaign_approved",
      description:
        "Campaign approved — locked for future sequence/scheduling (no send)",
    });

    revalidateCampaigns(campaignId);
    return {
      success: true,
      message: "Campaign approved and locked (not sent)",
      id: campaignId,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Goedkeuring mislukt."),
    };
  }
}

export async function rejectEmailCampaignAction(
  campaignId: string,
  formData: FormData,
): Promise<CampaignActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  if (!canApprove(context.membership.role)) {
    return {
      success: false,
      message: "Only organization owners or admins may reject campaigns.",
    };
  }

  const reason = String(formData.get("reason") ?? "").trim();
  const decision =
    String(formData.get("decision") ?? "rejected") === "changes_required"
      ? "changes_required"
      : "rejected";

  const supabase = await createClient();
  await supabase
    .from("email_campaigns")
    .update({
      status: "needs_review",
      locked: false,
    })
    .eq("organization_id", context.organization.id)
    .eq("id", campaignId);

  await supabase.from("email_campaign_approvals").insert({
    organization_id: context.organization.id,
    campaign_id: campaignId,
    status: decision,
    reviewer_user_id: context.membership.user_id,
    reviewed_at: new Date().toISOString(),
    decision,
    reason: reason || null,
    created_by: context.membership.user_id,
  });

  await logCampaignActivity({
    organizationId: context.organization.id,
    campaignId,
    userId: context.membership.user_id,
    eventType: "campaign_rejected",
    description: `Campaign ${decision}${reason ? `: ${reason}` : ""}`,
  });

  revalidateCampaigns(campaignId);
  return { success: true, message: `Campaign marked ${decision}`, id: campaignId };
}

export async function createSenderProfileAction(
  formData: FormData,
): Promise<CampaignActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const name = String(formData.get("name") ?? "").trim();
  const senderName = String(formData.get("sender_name") ?? "").trim();
  const senderEmail = String(formData.get("sender_email") ?? "").trim();
  if (!name || !senderName || !senderEmail) {
    return { success: false, message: "Name, sender name and email are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_sender_profiles")
    .insert({
      organization_id: context.organization.id,
      name,
      sender_name: senderName,
      sender_email: senderEmail,
      reply_to_name: String(formData.get("reply_to_name") ?? "").trim() || null,
      reply_to_email:
        String(formData.get("reply_to_email") ?? "").trim() || null,
      status: "draft",
      domain_verification_status: "unverified",
      is_default: formData.get("is_default") === "on",
      created_by: context.membership.user_id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon sender profile niet opslaan."),
    };
  }

  revalidatePath("/email/settings");
  revalidatePath("/email/campaigns");
  return { success: true, message: "Sender profile created (unverified)", id: data.id };
}
