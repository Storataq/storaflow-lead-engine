"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  DEFAULT_SEQUENCE_SAFETY_LIMITS,
  EMAIL_SEQUENCE_CATEGORIES,
  MANDATORY_STOP_RULES,
} from "@/lib/email/sequence/constants";
import {
  getEmailSequence,
  parseStopRules,
} from "@/lib/email/sequence/queries";
import {
  parseStepsJson,
  renumberSteps,
  stepsToJson,
} from "@/lib/email/sequence/steps";
import { validateSequence } from "@/lib/email/sequence/validation";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { createClient } from "@/lib/supabase/server";
import { toUserFacingError } from "@/lib/ui/user-facing-error";
import { logCrmActivity } from "@/lib/crm/activity";
import type { Json } from "@/types/supabase";

export type SequenceActionResult = {
  success: boolean;
  message: string;
  id?: string;
  readinessScore?: number;
};

function revalidateSequences(id?: string) {
  revalidatePath("/email/sequences");
  revalidatePath("/email");
  revalidatePath("/email/campaigns");
  if (id) {
    revalidatePath(`/email/sequences/${id}`);
    revalidatePath(`/email/sequences/${id}/edit`);
    revalidatePath(`/email/sequences/${id}/versions`);
  }
}

async function logSequenceActivity(input: {
  organizationId: string;
  sequenceId: string;
  userId: string | null;
  eventType: string;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  await supabase.from("email_sequence_activities").insert({
    organization_id: input.organizationId,
    sequence_id: input.sequenceId,
    event_type: input.eventType,
    description: input.description,
    metadata_json: (input.metadata ?? {}) as Json,
    created_by: input.userId,
  });
  await logCrmActivity(supabase, {
    organizationId: input.organizationId,
    userId: input.userId,
    eventType: `email.${input.eventType}`,
    entityType: "email_sequence",
    entityId: input.sequenceId,
    description: input.description,
    metadata: input.metadata,
  });
}

const sequenceSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional().nullable(),
  category: z.enum(EMAIL_SEQUENCE_CATEGORIES).default("custom"),
  default_language: z.string().trim().min(2).max(16).default("en"),
  steps_json: z.string().min(2),
  stop_rules_json: z.string().optional(),
  change_notes: z.string().trim().optional().nullable(),
});

function parseStepsFromForm(raw: string) {
  const parsed = JSON.parse(raw) as unknown;
  return renumberSteps(parseStepsJson(parsed as Json));
}

function parseStopRulesFromForm(raw: string | undefined): string[] {
  if (!raw?.trim()) return [...MANDATORY_STOP_RULES];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return [...new Set([...MANDATORY_STOP_RULES, ...parsed.map(String)])];
    }
  } catch {
    /* use defaults */
  }
  return [...MANDATORY_STOP_RULES];
}

async function loadTemplateStatuses(
  organizationId: string,
  steps: ReturnType<typeof parseStepsFromForm>,
) {
  const ids = steps
    .map((s) => s.email?.templateId)
    .filter((id): id is string => Boolean(id));
  if (ids.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase
    .from("email_templates")
    .select("id, status")
    .eq("organization_id", organizationId)
    .in("id", ids);
  const map: Record<string, string> = {};
  for (const row of data ?? []) map[row.id] = row.status;
  return map;
}

export async function createEmailSequenceAction(
  formData: FormData,
): Promise<SequenceActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const parsed = sequenceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    category: formData.get("category") || "custom",
    default_language: formData.get("default_language") || "en",
    steps_json: String(formData.get("steps_json") ?? "[]"),
    stop_rules_json: String(formData.get("stop_rules_json") ?? ""),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid sequence",
    };
  }

  try {
    const steps = parseStepsFromForm(parsed.data.steps_json);
    const stopRules = parseStopRulesFromForm(parsed.data.stop_rules_json);
    const supabase = await createClient();

    const { data: created, error } = await supabase
      .from("email_sequences")
      .insert({
        organization_id: context.organization.id,
        name: parsed.data.name,
        description: parsed.data.description,
        category: parsed.data.category,
        default_language: parsed.data.default_language,
        status: "draft",
        version: 1,
        steps_json: stepsToJson(steps),
        stop_rules_json: stopRules as unknown as Json,
        safety_limits_json: DEFAULT_SEQUENCE_SAFETY_LIMITS as unknown as Json,
        created_by: context.membership.user_id,
        updated_by: context.membership.user_id,
      })
      .select("id")
      .single();

    if (error || !created) {
      return {
        success: false,
        message: toUserFacingError(
          error,
          "Kon sequence niet aanmaken. Voer migratie 000014 uit indien nodig.",
        ),
      };
    }

    await logSequenceActivity({
      organizationId: context.organization.id,
      sequenceId: created.id,
      userId: context.membership.user_id,
      eventType: "sequence_created",
      description: `Sequence "${parsed.data.name}" created as draft`,
    });

    revalidateSequences(created.id);
    return { success: true, message: "Sequence created", id: created.id };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon sequence niet aanmaken."),
    };
  }
}

export async function updateEmailSequenceAction(
  sequenceId: string,
  formData: FormData,
): Promise<SequenceActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const existing = await getEmailSequence(context.organization.id, sequenceId);
  if (!existing) return { success: false, message: "Sequence not found." };
  if (existing.status === "archived") {
    return { success: false, message: "Archived sequences cannot be edited." };
  }
  if (existing.status === "active") {
    return {
      success: false,
      message:
        "Active sequences are locked. Duplicate or deactivate before editing.",
    };
  }

  const parsed = sequenceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    category: formData.get("category") || existing.category,
    default_language: formData.get("default_language") || existing.default_language,
    steps_json: String(formData.get("steps_json") ?? "[]"),
    stop_rules_json: String(formData.get("stop_rules_json") ?? ""),
    change_notes: formData.get("change_notes") || null,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid sequence",
    };
  }

  try {
    const steps = parseStepsFromForm(parsed.data.steps_json);
    const stopRules = parseStopRulesFromForm(parsed.data.stop_rules_json);
    const supabase = await createClient();

    const { error } = await supabase
      .from("email_sequences")
      .update({
        name: parsed.data.name,
        description: parsed.data.description,
        category: parsed.data.category,
        default_language: parsed.data.default_language,
        steps_json: stepsToJson(steps),
        stop_rules_json: stopRules as unknown as Json,
        updated_by: context.membership.user_id,
        status: "draft",
      })
      .eq("organization_id", context.organization.id)
      .eq("id", sequenceId);

    if (error) {
      return {
        success: false,
        message: toUserFacingError(error, "Kon sequence niet bijwerken."),
      };
    }

    await logSequenceActivity({
      organizationId: context.organization.id,
      sequenceId,
      userId: context.membership.user_id,
      eventType: "sequence_updated",
      description: `Sequence "${parsed.data.name}" updated`,
    });

    revalidateSequences(sequenceId);
    return { success: true, message: "Sequence updated", id: sequenceId };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon sequence niet bijwerken."),
    };
  }
}

export async function validateEmailSequenceAction(
  sequenceId: string,
): Promise<SequenceActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const sequence = await getEmailSequence(context.organization.id, sequenceId);
  if (!sequence) return { success: false, message: "Sequence not found." };

  try {
    const steps = parseStepsJson(sequence.steps_json);
    const templateStatuses = await loadTemplateStatuses(
      context.organization.id,
      steps,
    );
    const result = validateSequence({
      name: sequence.name,
      status: sequence.status,
      steps,
      stopRules: parseStopRules(sequence.stop_rules_json),
      isActive: sequence.status === "active",
      templateStatuses,
    });

    const supabase = await createClient();
    await supabase.from("email_sequence_validations").insert({
      organization_id: context.organization.id,
      sequence_id: sequenceId,
      version_number: sequence.version,
      readiness_score: result.readinessScore,
      classification: result.classification,
      blocking_count: result.summary.blockingCount,
      warning_count: result.summary.warningCount,
      info_count: result.summary.infoCount,
      issues_json: result.issues as unknown as Json,
      summary_json: result.summary as unknown as Json,
      created_by: context.membership.user_id,
    });

    await supabase
      .from("email_sequences")
      .update({
        readiness_score: result.readinessScore,
        readiness_classification: result.classification,
        last_validation_json: result as unknown as Json,
      })
      .eq("organization_id", context.organization.id)
      .eq("id", sequenceId);

    await logSequenceActivity({
      organizationId: context.organization.id,
      sequenceId,
      userId: context.membership.user_id,
      eventType: result.ok ? "validation_completed" : "validation_failed",
      description: `Validation ${result.ok ? "passed" : "failed"} — score ${result.readinessScore}`,
    });

    revalidateSequences(sequenceId);
    return {
      success: true,
      message: result.ok
        ? `Validation passed (score ${result.readinessScore})`
        : `Validation has blocking issues (score ${result.readinessScore})`,
      id: sequenceId,
      readinessScore: result.readinessScore,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Validatie mislukt."),
    };
  }
}

async function lockEmailStepTemplates(
  organizationId: string,
  steps: ReturnType<typeof parseStepsJson>,
) {
  const supabase = await createClient();
  const out = steps.map((step) => ({ ...step }));

  for (const step of out) {
    if (step.type !== "email" || !step.email?.templateId) continue;
    const { data: template } = await supabase
      .from("email_templates")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", step.email.templateId)
      .maybeSingle();
    if (!template) continue;

    let versionId = step.email.templateVersionId ?? null;
    const { data: version } = await supabase
      .from("email_template_versions")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("template_id", template.id)
      .eq("is_current", true)
      .maybeSingle();
    versionId = version?.id ?? versionId;

    step.email = {
      ...step.email,
      templateVersionId: versionId,
      subjectSnapshot: template.subject,
      previewSnapshot: template.preview_text,
      htmlSnapshot: template.html_body,
      textSnapshot: template.text_body,
      language: template.language,
    };
  }

  return out;
}

export async function publishEmailSequenceAction(
  sequenceId: string,
  formData: FormData,
): Promise<SequenceActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const validation = await validateEmailSequenceAction(sequenceId);
  if (!validation.success || (validation.readinessScore ?? 0) < 70) {
    return {
      success: false,
      message: "Resolve blocking validation issues before publishing.",
    };
  }

  const sequence = await getEmailSequence(context.organization.id, sequenceId);
  if (!sequence) return { success: false, message: "Sequence not found." };

  const changeNotes = String(formData.get("change_notes") ?? "").trim() || null;

  try {
    const supabase = await createClient();
    let steps = parseStepsJson(sequence.steps_json);
    steps = await lockEmailStepTemplates(context.organization.id, steps);

    const versionNumber =
      sequence.status === "draft" && sequence.version === 1
        ? sequence.version
        : sequence.version + 1;

    await supabase
      .from("email_sequence_versions")
      .update({ is_current: false })
      .eq("organization_id", context.organization.id)
      .eq("sequence_id", sequenceId)
      .eq("is_current", true);

    const { data: versionRow, error: versionError } = await supabase
      .from("email_sequence_versions")
      .insert({
        organization_id: context.organization.id,
        sequence_id: sequenceId,
        version_number: versionNumber,
        status: "active",
        name: sequence.name,
        description: sequence.description,
        category: sequence.category,
        default_language: sequence.default_language,
        steps_json: stepsToJson(steps),
        stop_rules_json: sequence.stop_rules_json,
        safety_limits_json: sequence.safety_limits_json,
        change_notes: changeNotes ?? `Published v${versionNumber}`,
        is_current: true,
        published_at: new Date().toISOString(),
        created_by: context.membership.user_id,
      })
      .select("id")
      .single();

    if (versionError || !versionRow) {
      if (versionError?.code === "23505") {
        return {
          success: false,
          message: "Version already exists — cannot overwrite published version.",
        };
      }
      throw new Error(versionError?.message ?? "Version insert failed");
    }

    await supabase
      .from("email_sequences")
      .update({
        status: "active",
        version: versionNumber,
        steps_json: stepsToJson(steps),
        current_version_id: versionRow.id,
        readiness_classification: "active",
        updated_by: context.membership.user_id,
      })
      .eq("organization_id", context.organization.id)
      .eq("id", sequenceId);

    await logSequenceActivity({
      organizationId: context.organization.id,
      sequenceId,
      userId: context.membership.user_id,
      eventType: "sequence_published",
      description: `Published sequence v${versionNumber}`,
      metadata: { versionId: versionRow.id, versionNumber },
    });

    revalidateSequences(sequenceId);
    return {
      success: true,
      message: `Sequence published as v${versionNumber} (not executed)`,
      id: sequenceId,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Publiceren mislukt."),
    };
  }
}

export async function duplicateEmailSequenceAction(
  sequenceId: string,
): Promise<SequenceActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const source = await getEmailSequence(context.organization.id, sequenceId);
  if (!source) return { success: false, message: "Sequence not found." };

  try {
    const supabase = await createClient();
    const { data: created, error } = await supabase
      .from("email_sequences")
      .insert({
        organization_id: context.organization.id,
        name: `${source.name} (copy)`,
        description: source.description,
        category: source.category,
        default_language: source.default_language,
        status: "draft",
        version: 1,
        steps_json: source.steps_json,
        stop_rules_json: source.stop_rules_json,
        safety_limits_json: source.safety_limits_json,
        created_by: context.membership.user_id,
        updated_by: context.membership.user_id,
        readiness_score: 0,
        readiness_classification: "not_ready",
      })
      .select("id")
      .single();

    if (error || !created) {
      return {
        success: false,
        message: toUserFacingError(error, "Kon sequence niet dupliceren."),
      };
    }

    await logSequenceActivity({
      organizationId: context.organization.id,
      sequenceId: created.id,
      userId: context.membership.user_id,
      eventType: "sequence_duplicated",
      description: `Duplicated from ${sequenceId}`,
    });

    revalidateSequences(created.id);
    return {
      success: true,
      message: "Sequence duplicated as draft",
      id: created.id,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon sequence niet dupliceren."),
    };
  }
}

export async function archiveEmailSequenceAction(
  sequenceId: string,
): Promise<SequenceActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("email_sequences")
    .update({
      status: "archived",
      archived_at: new Date().toISOString(),
    })
    .eq("organization_id", context.organization.id)
    .eq("id", sequenceId);

  if (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon sequence niet archiveren."),
    };
  }

  await logSequenceActivity({
    organizationId: context.organization.id,
    sequenceId,
    userId: context.membership.user_id,
    eventType: "sequence_archived",
    description: "Sequence archived",
  });

  revalidateSequences(sequenceId);
  return { success: true, message: "Sequence archived", id: sequenceId };
}

export async function restoreEmailSequenceAction(
  sequenceId: string,
): Promise<SequenceActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("email_sequences")
    .update({
      status: "draft",
      archived_at: null,
    })
    .eq("organization_id", context.organization.id)
    .eq("id", sequenceId);

  if (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon sequence niet herstellen."),
    };
  }

  await logSequenceActivity({
    organizationId: context.organization.id,
    sequenceId,
    userId: context.membership.user_id,
    eventType: "sequence_restored",
    description: "Sequence restored to draft",
  });

  revalidateSequences(sequenceId);
  return { success: true, message: "Sequence restored to draft", id: sequenceId };
}

/** Used by campaign approval — locks sequence version on campaign. */
export async function lockSequenceForCampaign(input: {
  organizationId: string;
  campaignId: string;
  sequenceId: string;
  userId: string | null;
}) {
  const supabase = await createClient();
  const { data: sequence } = await supabase
    .from("email_sequences")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("id", input.sequenceId)
    .maybeSingle();

  if (!sequence) throw new Error("Sequence not found");
  if (sequence.status !== "active") {
    throw new Error("Only active sequences can be linked to approved campaigns");
  }

  let versionId = sequence.current_version_id;
  let stepsJson = sequence.steps_json;

  if (!versionId) {
    const { data: version } = await supabase
      .from("email_sequence_versions")
      .select("*")
      .eq("organization_id", input.organizationId)
      .eq("sequence_id", input.sequenceId)
      .eq("is_current", true)
      .maybeSingle();
    versionId = version?.id ?? null;
    stepsJson = version?.steps_json ?? stepsJson;
  } else {
    const { data: version } = await supabase
      .from("email_sequence_versions")
      .select("steps_json")
      .eq("id", versionId)
      .maybeSingle();
    if (version) stepsJson = version.steps_json;
  }

  await supabase
    .from("email_campaigns")
    .update({
      sequence_version_id: versionId,
      sequence_version: sequence.version,
      sequence_name_snapshot: sequence.name,
      sequence_steps_snapshot: stepsJson,
    })
    .eq("organization_id", input.organizationId)
    .eq("id", input.campaignId);

  await logSequenceActivity({
    organizationId: input.organizationId,
    sequenceId: input.sequenceId,
    userId: input.userId,
    eventType: "campaign_linked",
    description: `Linked to campaign ${input.campaignId}`,
    metadata: { campaignId: input.campaignId, versionId },
  });
}
