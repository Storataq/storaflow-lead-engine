"use server";

import { revalidatePath } from "next/cache";

import { recordCategoryActionRun } from "@/lib/companies/category-actions/audit";
import {
  CATEGORY_ACTION_BULK_MAX,
  type CategoryActionType,
} from "@/lib/companies/category-actions/constants";
import { listCompaniesInCategory } from "@/lib/companies/category-actions/queries";
import {
  canRunCategoryAction,
} from "@/lib/companies/category-actions/types";
import { logCrmActivity } from "@/lib/crm/activity";
import { assignLeadsAction, createLeadFromCompanyAction } from "@/lib/crm/actions";
import { runFunnelActivation } from "@/lib/crm/funnel-activation/orchestrator";
import { generateEmailAIAction } from "@/lib/email/ai/actions";
import type { CampaignAudienceDefinition } from "@/lib/email/campaign/audience-builder";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { createClient } from "@/lib/supabase/server";
import { toUserFacingError } from "@/lib/ui/user-facing-error";
import type { Json } from "@/types/supabase";

export type CategoryActionResult = {
  success: boolean;
  message: string;
  id?: string;
  campaignId?: string;
  sequenceId?: string;
  generationId?: string;
  processed?: number;
  failed?: number;
  skipped?: number;
  warnings?: string[];
};

function revalidateCategory(categoryId: string) {
  revalidatePath("/companies");
  revalidatePath("/companies/categories");
  revalidatePath(`/companies/categories/${categoryId}`);
  revalidatePath("/crm");
  revalidatePath("/crm/funnel-activation");
  revalidatePath("/crm/campaign-ready");
  revalidatePath("/crm/tasks");
  revalidatePath("/email/campaigns");
  revalidatePath("/dashboard");
  revalidatePath("/activity");
}

function resolveCompanyIds(
  selectedIds: string[] | undefined,
  allIds: string[],
): string[] {
  if (selectedIds && selectedIds.length > 0) {
    const allowed = new Set(allIds);
    return [...new Set(selectedIds)].filter((id) => allowed.has(id));
  }
  return allIds;
}

async function assertCategoryAccess(
  action: CategoryActionType,
): Promise<
  | {
      ok: true;
      organizationId: string;
      userId: string;
      role: string;
    }
  | { ok: false; result: CategoryActionResult }
> {
  const context = await getActiveOrganization();
  if (!context) {
    return {
      ok: false,
      result: { success: false, message: "Geen actieve organisatie." },
    };
  }
  if (!canRunCategoryAction(context.membership.role, action)) {
    return {
      ok: false,
      result: {
        success: false,
        message: "Je hebt geen rechten voor deze category action.",
      },
    };
  }
  return {
    ok: true,
    organizationId: context.organization.id,
    userId: context.membership.user_id,
    role: context.membership.role,
  };
}

/**
 * Add selected (or all) category companies to the funnel activation pipeline.
 * Requires confirmed: true for safety.
 */
export async function activateCategoryFunnelAction(input: {
  categoryId: string;
  companyIds?: string[];
  confirmed: boolean;
}): Promise<CategoryActionResult> {
  const access = await assertCategoryAccess("add_to_funnel");
  if (!access.ok) return access.result;
  if (!input.confirmed) {
    return {
      success: false,
      message: "Bevestiging vereist voordat bedrijven aan een funnel worden toegevoegd.",
    };
  }

  try {
    const all = await listCompaniesInCategory(
      access.organizationId,
      input.categoryId,
    );
    const ids = resolveCompanyIds(
      input.companyIds,
      all.map((c) => c.id),
    ).slice(0, CATEGORY_ACTION_BULK_MAX);

    if (ids.length === 0) {
      return { success: false, message: "Geen bedrijven geselecteerd." };
    }

    const supabase = await createClient();
    let activated = 0;
    let skipped = 0;
    let failed = 0;

    for (const companyId of ids) {
      const result = await runFunnelActivation(supabase, {
        organizationId: access.organizationId,
        companyId,
        userId: access.userId,
        triggerSource: "category_actions",
        confirmed: true,
        sourceCompanyCategoryId: input.categoryId,
      });
      if (result.success && result.message.toLowerCase().includes("reused")) {
        skipped += 1;
      } else if (result.success) {
        activated += 1;
      } else {
        failed += 1;
      }
    }

    await recordCategoryActionRun(supabase, {
      organizationId: access.organizationId,
      categoryId: input.categoryId,
      actionType: "add_to_funnel",
      companyIds: ids,
      actorUserId: access.userId,
      confirmed: true,
      resultSummary: { activated, skipped, failed },
    });

    await logCrmActivity(supabase, {
      organizationId: access.organizationId,
      userId: access.userId,
      eventType: "category.action.add_to_funnel",
      entityType: "company_category",
      entityId: input.categoryId,
      description: `Category funnel: ${activated} activated, ${skipped} skipped, ${failed} failed`,
      metadata: { activated, skipped, failed, companyIds: ids },
    });

    revalidateCategory(input.categoryId);
    return {
      success: failed === 0,
      message: `Funnel: ${activated} activated, ${skipped} reused/skipped, ${failed} failed.`,
      processed: activated + skipped,
      failed,
      skipped,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Funnel activation failed."),
    };
  }
}

/**
 * Create a draft email campaign scoped to this category (and optional company subset).
 * Does NOT launch — user must review recipients/sender/sequence and confirm later.
 */
export async function createCategoryCampaignDraftAction(input: {
  categoryId: string;
  categoryName: string;
  companyIds?: string[];
  name?: string;
  templateId?: string | null;
  sequenceId?: string | null;
  senderProfileId?: string | null;
  confirmed: boolean;
}): Promise<CategoryActionResult> {
  const access = await assertCategoryAccess("create_email_campaign");
  if (!access.ok) return access.result;
  if (!input.confirmed) {
    return {
      success: false,
      message: "Bevestiging vereist om een campaign draft te maken.",
    };
  }

  try {
    const all = await listCompaniesInCategory(
      access.organizationId,
      input.categoryId,
    );
    const selected = resolveCompanyIds(
      input.companyIds,
      all.map((c) => c.id),
    );

    const audience: CampaignAudienceDefinition = {
      source: "company_category",
      companyCategoryIds: [input.categoryId],
      selectedCompanyIds:
        input.companyIds && input.companyIds.length > 0 ? selected : undefined,
      campaignReadyOnly: true,
      approvalStatus: ["approved"],
      requireEmail: true,
      excludeSuppressed: true,
    };

    const supabase = await createClient();
    const campaignName =
      input.name?.trim() ||
      `${input.categoryName} campaign ${new Date().toISOString().slice(0, 10)}`;

    const { data: created, error } = await supabase
      .from("email_campaigns")
      .insert({
        organization_id: access.organizationId,
        name: campaignName,
        description: `Created from category “${input.categoryName}” (Phase 23C).`,
        status: "draft",
        campaign_type: "custom",
        objective: `Engage ${input.categoryName} companies`,
        language: "en",
        template_id: input.templateId || null,
        sequence_id: input.sequenceId || null,
        sender_profile_id: input.senderProfileId || null,
        owner_user_id: access.userId,
        created_by: access.userId,
        notes: "Draft from Category Actions — review audience before launch.",
        audience_definition_json: audience as unknown as Json,
        settings_json: { maxRecipients: 500 } as Json,
        compliance_ack: false,
      })
      .select("id")
      .single();

    if (error || !created) {
      return {
        success: false,
        message: toUserFacingError(error, "Kon campaign draft niet aanmaken."),
      };
    }

    await recordCategoryActionRun(supabase, {
      organizationId: access.organizationId,
      categoryId: input.categoryId,
      actionType: "create_email_campaign",
      companyIds: selected,
      actorUserId: access.userId,
      confirmed: true,
      resultSummary: {
        campaignId: created.id,
        estimatedCompanies: selected.length,
      },
    });

    revalidateCategory(input.categoryId);
    return {
      success: true,
      message:
        "Campaign draft created. Review recipients, sender, sequence and confirm before launch.",
      campaignId: created.id,
      id: created.id,
      processed: selected.length,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Campaign draft failed."),
    };
  }
}

/**
 * Create a draft email sequence named for the category (reuse sequence engine).
 */
export async function createCategorySequenceDraftAction(input: {
  categoryId: string;
  categoryName: string;
}): Promise<CategoryActionResult> {
  const access = await assertCategoryAccess("create_email_sequence");
  if (!access.ok) return access.result;

  try {
    const formData = new FormData();
    formData.set("name", `${input.categoryName} sequence`);
    formData.set(
      "description",
      `Draft sequence for category “${input.categoryName}”.`,
    );
    formData.set("category", "custom");
    formData.set("default_language", "en");
    formData.set("steps_json", "[]");

    const { createEmailSequenceAction } = await import(
      "@/lib/email/sequence/actions"
    );
    const created = await createEmailSequenceAction(formData);
    if (!created.success || !created.id) {
      return { success: false, message: created.message };
    }

    const supabase = await createClient();
    await recordCategoryActionRun(supabase, {
      organizationId: access.organizationId,
      categoryId: input.categoryId,
      actionType: "create_email_sequence",
      companyIds: [],
      actorUserId: access.userId,
      confirmed: true,
      resultSummary: { sequenceId: created.id },
    });

    revalidateCategory(input.categoryId);
    return {
      success: true,
      message: "Sequence draft created. Open the sequence editor to add steps.",
      sequenceId: created.id,
      id: created.id,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Sequence draft failed."),
    };
  }
}

/**
 * Generate an AI email draft using the category as audience context.
 */
export async function generateCategoryAiEmailAction(input: {
  categoryId: string;
  categoryName: string;
  purpose?: string;
  callToAction?: string;
}): Promise<CategoryActionResult> {
  const access = await assertCategoryAccess("generate_ai_email");
  if (!access.ok) return access.result;

  try {
    const formData = new FormData();
    formData.set("generationType", "sequence_draft");
    formData.set(
      "campaignPurpose",
      input.purpose?.trim() ||
        `Introduction / outreach email for ${input.categoryName} companies`,
    );
    formData.set(
      "audienceSummary",
      `Company category: ${input.categoryName}. Use category-appropriate tone and examples.`,
    );
    formData.set(
      "callToAction",
      input.callToAction?.trim() || "Book a short intro call",
    );
    formData.set("tone", "professional");
    formData.set("variantCount", "2");

    const result = await generateEmailAIAction(formData);
    if (!result.success) {
      return { success: false, message: result.message };
    }

    const supabase = await createClient();
    await recordCategoryActionRun(supabase, {
      organizationId: access.organizationId,
      categoryId: input.categoryId,
      actionType: "generate_ai_email",
      companyIds: [],
      actorUserId: access.userId,
      confirmed: true,
      resultSummary: { generationId: result.generationId },
    });

    revalidateCategory(input.categoryId);
    return {
      success: true,
      message: result.message,
      generationId: result.generationId,
      warnings: result.warnings,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "AI email generation failed."),
    };
  }
}

/**
 * Bulk-create CRM tasks for leads linked to selected category companies.
 * Creates leads from companies when missing (via existing CRM action).
 */
export async function createCategoryTasksAction(input: {
  categoryId: string;
  companyIds: string[];
  title: string;
  description?: string;
  dueAt?: string | null;
  priority?: string;
  assignedUserId?: string | null;
}): Promise<CategoryActionResult> {
  const access = await assertCategoryAccess("create_crm_tasks");
  if (!access.ok) return access.result;

  const title = input.title.trim();
  if (!title) return { success: false, message: "Task title is required." };

  try {
    const all = await listCompaniesInCategory(
      access.organizationId,
      input.categoryId,
    );
    const ids = resolveCompanyIds(
      input.companyIds,
      all.map((c) => c.id),
    ).slice(0, CATEGORY_ACTION_BULK_MAX);

    if (ids.length === 0) {
      return { success: false, message: "Select at least one company." };
    }

    const supabase = await createClient();
    let created = 0;
    let failed = 0;

    for (const companyId of ids) {
      let leadId: string | null = null;
      const { data: existing } = await supabase
        .from("crm_leads")
        .select("id")
        .eq("organization_id", access.organizationId)
        .eq("company_id", companyId)
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        leadId = existing.id;
      } else {
        const leadResult = await createLeadFromCompanyAction(companyId);
        if (!leadResult.success || !leadResult.id) {
          failed += 1;
          continue;
        }
        leadId = leadResult.id;
      }

      const { error } = await supabase.from("crm_tasks").insert({
        organization_id: access.organizationId,
        title,
        description: input.description?.trim() || null,
        lead_id: leadId,
        due_at: input.dueAt ? new Date(input.dueAt).toISOString() : null,
        priority: (input.priority as "low" | "normal" | "high" | "urgent") ||
          "normal",
        assigned_user_id: input.assignedUserId || access.userId,
        created_by: access.userId,
        status: "todo",
      });

      if (error) failed += 1;
      else created += 1;
    }

    await recordCategoryActionRun(supabase, {
      organizationId: access.organizationId,
      categoryId: input.categoryId,
      actionType: "create_crm_tasks",
      companyIds: ids,
      actorUserId: access.userId,
      confirmed: true,
      resultSummary: { created, failed, title },
    });

    revalidateCategory(input.categoryId);
    return {
      success: failed === 0,
      message: `Created ${created} task(s)${failed ? `, ${failed} failed` : ""}.`,
      processed: created,
      failed,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Bulk task creation failed."),
    };
  }
}

/**
 * Bulk-add free-text tags to leads for selected category companies.
 */
export async function addCategoryTagsAction(input: {
  categoryId: string;
  companyIds: string[];
  tags: string[];
}): Promise<CategoryActionResult> {
  const access = await assertCategoryAccess("add_tags");
  if (!access.ok) return access.result;

  const tags = [
    ...new Set(input.tags.map((t) => t.trim()).filter(Boolean)),
  ];
  if (tags.length === 0) {
    return { success: false, message: "Provide at least one tag." };
  }

  try {
    const all = await listCompaniesInCategory(
      access.organizationId,
      input.categoryId,
    );
    const ids = resolveCompanyIds(
      input.companyIds,
      all.map((c) => c.id),
    ).slice(0, CATEGORY_ACTION_BULK_MAX);

    const supabase = await createClient();
    let updated = 0;
    let createdLeads = 0;
    let failed = 0;

    for (const companyId of ids) {
      let leadId: string | null = null;
      const { data: existing } = await supabase
        .from("crm_leads")
        .select("id, tags")
        .eq("organization_id", access.organizationId)
        .eq("company_id", companyId)
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        leadId = existing.id;
        const next = [...new Set([...(existing.tags ?? []), ...tags])];
        const { error } = await supabase
          .from("crm_leads")
          .update({ tags: next })
          .eq("id", leadId)
          .eq("organization_id", access.organizationId);
        if (error) failed += 1;
        else updated += 1;
      } else {
        const leadResult = await createLeadFromCompanyAction(companyId);
        if (!leadResult.success || !leadResult.id) {
          failed += 1;
          continue;
        }
        createdLeads += 1;
        const { error } = await supabase
          .from("crm_leads")
          .update({ tags })
          .eq("id", leadResult.id)
          .eq("organization_id", access.organizationId);
        if (error) failed += 1;
        else updated += 1;
      }
    }

    await recordCategoryActionRun(supabase, {
      organizationId: access.organizationId,
      categoryId: input.categoryId,
      actionType: "add_tags",
      companyIds: ids,
      actorUserId: access.userId,
      confirmed: true,
      resultSummary: { updated, createdLeads, failed, tags },
    });

    revalidateCategory(input.categoryId);
    return {
      success: failed === 0,
      message: `Tagged ${updated} lead(s)${createdLeads ? ` (${createdLeads} leads created)` : ""}.`,
      processed: updated,
      failed,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Bulk tagging failed."),
    };
  }
}

/**
 * Assign CRM owner on leads for selected category companies.
 */
export async function assignCategoryOwnerAction(input: {
  categoryId: string;
  companyIds: string[];
  ownerUserId: string | null;
}): Promise<CategoryActionResult> {
  const access = await assertCategoryAccess("assign_owner");
  if (!access.ok) return access.result;

  try {
    const all = await listCompaniesInCategory(
      access.organizationId,
      input.categoryId,
    );
    const ids = resolveCompanyIds(
      input.companyIds,
      all.map((c) => c.id),
    ).slice(0, CATEGORY_ACTION_BULK_MAX);

    const supabase = await createClient();
    const leadIds: string[] = [];

    for (const companyId of ids) {
      const { data: existing } = await supabase
        .from("crm_leads")
        .select("id")
        .eq("organization_id", access.organizationId)
        .eq("company_id", companyId)
        .limit(1)
        .maybeSingle();
      if (existing?.id) {
        leadIds.push(existing.id);
        continue;
      }
      const created = await createLeadFromCompanyAction(companyId);
      if (created.id) leadIds.push(created.id);
    }

    if (leadIds.length === 0) {
      return { success: false, message: "No leads found to assign." };
    }

    const result = await assignLeadsAction(leadIds, input.ownerUserId);
    await recordCategoryActionRun(supabase, {
      organizationId: access.organizationId,
      categoryId: input.categoryId,
      actionType: "assign_owner",
      companyIds: ids,
      actorUserId: access.userId,
      confirmed: true,
      resultSummary: {
        leadCount: leadIds.length,
        ownerUserId: input.ownerUserId,
      },
    });

    revalidateCategory(input.categoryId);
    return {
      success: result.success,
      message: result.message,
      processed: leadIds.length,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Owner assignment failed."),
    };
  }
}

/**
 * Lightweight follow-up plan: create a task now + a reminder task after N days.
 * Not a full automation engine — composed CRM tasks only.
 */
export async function createCategoryFollowUpPlanAction(input: {
  categoryId: string;
  companyIds: string[];
  firstTaskTitle: string;
  reminderTaskTitle?: string;
  waitDays?: number;
  assignedUserId?: string | null;
}): Promise<CategoryActionResult> {
  const access = await assertCategoryAccess("follow_up_plan");
  if (!access.ok) return access.result;

  const waitDays = Math.max(1, Math.min(90, input.waitDays ?? 5));
  const dueFirst = new Date();
  dueFirst.setDate(dueFirst.getDate() + 1);
  const dueReminder = new Date();
  dueReminder.setDate(dueReminder.getDate() + waitDays);

  const first = await createCategoryTasksAction({
    categoryId: input.categoryId,
    companyIds: input.companyIds,
    title: input.firstTaskTitle.trim() || "Follow-up call",
    description: "Category follow-up plan · step 1",
    dueAt: dueFirst.toISOString(),
    assignedUserId: input.assignedUserId,
    priority: "normal",
  });

  if (!first.success) return first;

  const reminder = await createCategoryTasksAction({
    categoryId: input.categoryId,
    companyIds: input.companyIds,
    title:
      input.reminderTaskTitle?.trim() ||
      `Reminder after ${waitDays} days`,
    description: `Category follow-up plan · reminder (wait ${waitDays} days)`,
    dueAt: dueReminder.toISOString(),
    assignedUserId: input.assignedUserId,
    priority: "normal",
  });

  const supabase = await createClient();
  await recordCategoryActionRun(supabase, {
    organizationId: access.organizationId,
    categoryId: input.categoryId,
    actionType: "follow_up_plan",
    companyIds: input.companyIds,
    actorUserId: access.userId,
    confirmed: true,
    resultSummary: {
      waitDays,
      first,
      reminder,
    },
  });

  return {
    success: reminder.success,
    message: `Follow-up plan created (call + reminder in ${waitDays} days).`,
    processed: (first.processed ?? 0) + (reminder.processed ?? 0),
  };
}
