"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logCrmActivity } from "@/lib/crm/activity";
import { ensureDefaultCrmSetup } from "@/lib/crm/bootstrap";
import { slugifyCrmName } from "@/lib/crm/constants";
import { buildLeadDraftFromCompany } from "@/lib/crm/from-company";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { createClient } from "@/lib/supabase/server";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export type CrmActionResult = {
  success: boolean;
  message: string;
  id?: string;
};

function revalidateCrm(paths: string[] = []) {
  revalidatePath("/crm");
  revalidatePath("/crm/leads");
  revalidatePath("/crm/pipelines");
  revalidatePath("/crm/funnels");
  revalidatePath("/crm/deals");
  revalidatePath("/crm/tasks");
  revalidatePath("/crm/notes");
  revalidatePath("/dashboard");
  revalidatePath("/activity");
  for (const path of paths) {
    revalidatePath(path);
  }
}

const leadSchema = z.object({
  company_name: z.string().trim().min(1, "Bedrijfsnaam is verplicht"),
  contact_name: z.string().trim().optional().nullable(),
  email: z
    .union([z.literal(""), z.string().trim().email("Ongeldig e-mailadres")])
    .optional(),
  phone: z.string().trim().optional().nullable(),
  website: z.string().trim().optional().nullable(),
  country: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  industry: z.string().trim().optional().nullable(),
  pipeline_id: z.string().uuid(),
  stage_id: z.string().uuid(),
  source: z.string().trim().optional().nullable(),
  lead_score: z.coerce.number().int().min(0).max(100).default(0),
  deal_value: z.coerce.number().min(0).default(0),
  tags: z.string().optional(),
  notes: z.string().optional().nullable(),
  owner_user_id: z.string().uuid().optional().nullable().or(z.literal("")),
});

function parseTags(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return [
    ...new Set(
      raw
        .split(/[,;\n]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ];
}

export async function createLeadAction(
  formData: FormData,
): Promise<CrmActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const parsed = leadSchema.safeParse({
    company_name: formData.get("company_name"),
    contact_name: formData.get("contact_name") || null,
    email: formData.get("email") || "",
    phone: formData.get("phone") || null,
    website: formData.get("website") || null,
    country: formData.get("country") || null,
    city: formData.get("city") || null,
    industry: formData.get("industry") || null,
    pipeline_id: formData.get("pipeline_id"),
    stage_id: formData.get("stage_id"),
    source: formData.get("source") || null,
    lead_score: formData.get("lead_score") || 0,
    deal_value: formData.get("deal_value") || 0,
    tags: String(formData.get("tags") ?? ""),
    notes: formData.get("notes") || null,
    owner_user_id: formData.get("owner_user_id") || "",
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Ongeldige invoer",
    };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;
  await ensureDefaultCrmSetup(supabase, orgId);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("crm_leads")
    .insert({
      organization_id: orgId,
      pipeline_id: parsed.data.pipeline_id,
      stage_id: parsed.data.stage_id,
      company_name: parsed.data.company_name,
      contact_name: parsed.data.contact_name || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      website: parsed.data.website || null,
      country: parsed.data.country || null,
      city: parsed.data.city || null,
      industry: parsed.data.industry || null,
      source: parsed.data.source || "manual",
      lead_score: parsed.data.lead_score,
      deal_value: parsed.data.deal_value,
      tags: parseTags(parsed.data.tags),
      notes: parsed.data.notes || null,
      owner_user_id: parsed.data.owner_user_id || user?.id || null,
      created_by: user?.id ?? null,
      status: "open",
    })
    .select("id, company_name")
    .single();

  if (error || !data) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon lead niet opslaan."),
    };
  }

  await logCrmActivity(supabase, {
    organizationId: orgId,
    userId: user?.id,
    eventType: "crm.lead.created",
    entityType: "crm_lead",
    entityId: data.id,
    description: `Lead aangemaakt: ${data.company_name}`,
  });

  revalidateCrm([`/crm/leads/${data.id}`]);
  return { success: true, message: "Lead opgeslagen.", id: data.id };
}

export async function updateLeadAction(
  leadId: string,
  formData: FormData,
): Promise<CrmActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const parsed = leadSchema.safeParse({
    company_name: formData.get("company_name"),
    contact_name: formData.get("contact_name") || null,
    email: formData.get("email") || "",
    phone: formData.get("phone") || null,
    website: formData.get("website") || null,
    country: formData.get("country") || null,
    city: formData.get("city") || null,
    industry: formData.get("industry") || null,
    pipeline_id: formData.get("pipeline_id"),
    stage_id: formData.get("stage_id"),
    source: formData.get("source") || null,
    lead_score: formData.get("lead_score") || 0,
    deal_value: formData.get("deal_value") || 0,
    tags: String(formData.get("tags") ?? ""),
    notes: formData.get("notes") || null,
    owner_user_id: formData.get("owner_user_id") || "",
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Ongeldige invoer",
    };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("crm_leads")
    .update({
      pipeline_id: parsed.data.pipeline_id,
      stage_id: parsed.data.stage_id,
      company_name: parsed.data.company_name,
      contact_name: parsed.data.contact_name || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      website: parsed.data.website || null,
      country: parsed.data.country || null,
      city: parsed.data.city || null,
      industry: parsed.data.industry || null,
      source: parsed.data.source || null,
      lead_score: parsed.data.lead_score,
      deal_value: parsed.data.deal_value,
      tags: parseTags(parsed.data.tags),
      notes: parsed.data.notes || null,
      owner_user_id: parsed.data.owner_user_id || null,
    })
    .eq("organization_id", orgId)
    .eq("id", leadId);

  if (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon lead niet bijwerken."),
    };
  }

  await logCrmActivity(supabase, {
    organizationId: orgId,
    userId: user?.id,
    eventType: "crm.lead.updated",
    entityType: "crm_lead",
    entityId: leadId,
    description: `Lead bijgewerkt: ${parsed.data.company_name}`,
  });

  revalidateCrm([`/crm/leads/${leadId}`]);
  return { success: true, message: "Lead bijgewerkt.", id: leadId };
}

export async function moveLeadStageAction(
  leadId: string,
  stageId: string,
): Promise<CrmActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const supabase = await createClient();
  const orgId = context.organization.id;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: lead } = await supabase
    .from("crm_leads")
    .select("id, company_name, stage_id, pipeline_id")
    .eq("organization_id", orgId)
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return { success: false, message: "Lead niet gevonden." };

  const { data: stage } = await supabase
    .from("crm_funnel_stages")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", stageId)
    .maybeSingle();

  if (!stage) return { success: false, message: "Stage niet gevonden." };
  if (stage.pipeline_id !== lead.pipeline_id) {
    return { success: false, message: "Stage hoort niet bij deze pipeline." };
  }

  let status: "open" | "won" | "lost" = "open";
  if (stage.is_won) status = "won";
  if (stage.is_lost) status = "lost";

  const { error } = await supabase
    .from("crm_leads")
    .update({ stage_id: stageId, status })
    .eq("organization_id", orgId)
    .eq("id", leadId);

  if (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon stage niet wijzigen."),
    };
  }

  const eventType = stage.is_won
    ? "crm.lead.won"
    : stage.is_lost
      ? "crm.lead.lost"
      : "crm.lead.stage_changed";

  const description = stage.is_won
    ? `Lead gewonnen: ${lead.company_name}`
    : stage.is_lost
      ? `Lead verloren: ${lead.company_name}`
      : `Stage gewijzigd naar “${stage.name}” voor ${lead.company_name}`;

  await logCrmActivity(supabase, {
    organizationId: orgId,
    userId: user?.id,
    eventType,
    entityType: "crm_lead",
    entityId: leadId,
    description,
    metadata: { fromStageId: lead.stage_id, toStageId: stageId },
  });

  revalidateCrm([`/crm/leads/${leadId}`]);
  return { success: true, message: "Stage bijgewerkt.", id: leadId };
}

/**
 * Manual bridge: create a CRM lead from an existing scraped company.
 * Not called automatically by the scraper in this phase.
 */
export async function createLeadFromCompanyAction(
  companyId: string,
  pipelineId?: string,
): Promise<CrmActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const supabase = await createClient();
  const orgId = context.organization.id;
  await ensureDefaultCrmSetup(supabase, orgId);

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", companyId)
    .maybeSingle();

  if (companyError || !company) {
    return { success: false, message: "Bedrijf niet gevonden." };
  }

  const { data: pipelines } = await supabase
    .from("crm_pipelines")
    .select("*")
    .eq("organization_id", orgId)
    .order("sort_order", { ascending: true });

  const pipeline =
    (pipelineId
      ? pipelines?.find((item) => item.id === pipelineId)
      : undefined) ??
    pipelines?.find((item) => item.is_default) ??
    pipelines?.[0];

  if (!pipeline) {
    return { success: false, message: "Geen pipeline beschikbaar." };
  }

  const { data: stages } = await supabase
    .from("crm_funnel_stages")
    .select("*")
    .eq("pipeline_id", pipeline.id)
    .order("sort_order", { ascending: true });

  const firstStage = stages?.[0];
  if (!firstStage) {
    return { success: false, message: "Pipeline heeft geen stages." };
  }

  const draft = buildLeadDraftFromCompany(company);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("crm_leads")
    .insert({
      organization_id: orgId,
      pipeline_id: pipeline.id,
      stage_id: firstStage.id,
      ...draft,
      owner_user_id: user?.id ?? null,
      created_by: user?.id ?? null,
      status: "open",
      lead_score: 10,
      deal_value: 0,
    })
    .select("id, company_name")
    .single();

  if (error || !data) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon lead niet aanmaken vanuit bedrijf."),
    };
  }

  await logCrmActivity(supabase, {
    organizationId: orgId,
    userId: user?.id,
    eventType: "crm.lead.created",
    entityType: "crm_lead",
    entityId: data.id,
    description: `Lead aangemaakt vanuit scrape: ${data.company_name}`,
    metadata: { companyId, source: "from-company" },
  });

  revalidateCrm([`/crm/leads/${data.id}`, `/companies/${companyId}`]);
  return {
    success: true,
    message: "Lead aangemaakt vanuit bedrijf.",
    id: data.id,
  };
}

export async function createPipelineAction(
  formData: FormData,
): Promise<CrmActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { success: false, message: "Naam is verplicht." };

  const description = String(formData.get("description") ?? "").trim() || null;
  const color = String(formData.get("color") ?? "#2563eb").trim() || "#2563eb";
  const slug = slugifyCrmName(name) || `pipeline-${Date.now()}`;

  const supabase = await createClient();
  const orgId = context.organization.id;
  await ensureDefaultCrmSetup(supabase, orgId);

  const { count } = await supabase
    .from("crm_pipelines")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId);

  const { data, error } = await supabase
    .from("crm_pipelines")
    .insert({
      organization_id: orgId,
      name,
      slug,
      description,
      color,
      is_default: (count ?? 0) === 0,
      sort_order: count ?? 0,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon pipeline niet opslaan."),
    };
  }

  const { DEFAULT_STAGE_DEFS } = await import("@/lib/crm/constants");
  for (const stage of DEFAULT_STAGE_DEFS) {
    await supabase.from("crm_funnel_stages").insert({
      organization_id: orgId,
      pipeline_id: data.id,
      name: stage.name,
      slug: stage.slug,
      color: stage.color,
      sort_order: stage.sortOrder,
      is_won: "isWon" in stage ? Boolean(stage.isWon) : false,
      is_lost: "isLost" in stage ? Boolean(stage.isLost) : false,
    });
  }

  revalidateCrm();
  return { success: true, message: "Pipeline opgeslagen.", id: data.id };
}

export async function createStageAction(
  formData: FormData,
): Promise<CrmActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const pipelineId = String(formData.get("pipeline_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "#64748b").trim() || "#64748b";
  const isWon = formData.get("is_won") === "on";
  const isLost = formData.get("is_lost") === "on";

  if (!pipelineId || !name) {
    return { success: false, message: "Pipeline en naam zijn verplicht." };
  }
  if (isWon && isLost) {
    return {
      success: false,
      message: "Een stage kan niet tegelijk gewonnen en verloren zijn.",
    };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  const { count } = await supabase
    .from("crm_funnel_stages")
    .select("id", { count: "exact", head: true })
    .eq("pipeline_id", pipelineId);

  const { data, error } = await supabase
    .from("crm_funnel_stages")
    .insert({
      organization_id: orgId,
      pipeline_id: pipelineId,
      name,
      slug: slugifyCrmName(name) || `stage-${Date.now()}`,
      color,
      sort_order: count ?? 0,
      is_won: isWon,
      is_lost: isLost,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon stage niet opslaan."),
    };
  }

  revalidateCrm();
  return { success: true, message: "Stage opgeslagen.", id: data.id };
}

export async function createDealAction(
  formData: FormData,
): Promise<CrmActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const title = String(formData.get("title") ?? "").trim();
  const pipelineId = String(formData.get("pipeline_id") ?? "");
  const stageId = String(formData.get("stage_id") ?? "");
  const leadId = String(formData.get("lead_id") ?? "").trim() || null;
  const value = Number(formData.get("value") ?? 0);

  if (!title || !pipelineId || !stageId) {
    return { success: false, message: "Titel, pipeline en stage zijn verplicht." };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("crm_deals")
    .insert({
      organization_id: orgId,
      title,
      pipeline_id: pipelineId,
      stage_id: stageId,
      lead_id: leadId,
      value: Number.isFinite(value) ? value : 0,
      owner_user_id: user?.id ?? null,
      created_by: user?.id ?? null,
      status: "open",
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon deal niet opslaan."),
    };
  }

  revalidateCrm();
  return { success: true, message: "Deal opgeslagen.", id: data.id };
}

export async function createTaskAction(
  formData: FormData,
): Promise<CrmActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const leadId = String(formData.get("lead_id") ?? "").trim() || null;
  const dueRaw = String(formData.get("due_at") ?? "").trim();
  const priority = String(formData.get("priority") ?? "normal");
  const assigned = String(formData.get("assigned_user_id") ?? "").trim() || null;

  if (!title) return { success: false, message: "Titel is verplicht." };

  const supabase = await createClient();
  const orgId = context.organization.id;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("crm_tasks")
    .insert({
      organization_id: orgId,
      title,
      description,
      lead_id: leadId,
      due_at: dueRaw ? new Date(dueRaw).toISOString() : null,
      priority: priority as "low" | "normal" | "high" | "urgent",
      assigned_user_id: assigned || user?.id || null,
      created_by: user?.id ?? null,
      status: "todo",
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon taak niet opslaan."),
    };
  }

  if (leadId) {
    await logCrmActivity(supabase, {
      organizationId: orgId,
      userId: user?.id,
      eventType: "crm.task.created",
      entityType: "crm_lead",
      entityId: leadId,
      description: `Taak toegevoegd: ${title}`,
      metadata: { taskId: data.id },
    });
  }

  revalidateCrm(leadId ? [`/crm/leads/${leadId}`] : []);
  return { success: true, message: "Taak opgeslagen.", id: data.id };
}

export async function updateTaskStatusAction(
  taskId: string,
  status: "todo" | "in_progress" | "done" | "cancelled",
): Promise<CrmActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_tasks")
    .update({ status })
    .eq("organization_id", context.organization.id)
    .eq("id", taskId);

  if (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon taakstatus niet wijzigen."),
    };
  }

  revalidateCrm();
  return { success: true, message: "Taak bijgewerkt.", id: taskId };
}

export async function createNoteAction(
  formData: FormData,
): Promise<CrmActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const leadId = String(formData.get("lead_id") ?? "").trim() || null;
  const dealId = String(formData.get("deal_id") ?? "").trim() || null;
  const bodyHtml = String(formData.get("body_html") ?? "").trim();
  const bodyText = String(formData.get("body_text") ?? "").trim() ||
    bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  if (!leadId && !dealId) {
    return { success: false, message: "Koppel een lead of deal." };
  }
  if (!bodyHtml && !bodyText) {
    return { success: false, message: "Notitie mag niet leeg zijn." };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("crm_notes")
    .insert({
      organization_id: orgId,
      lead_id: leadId,
      deal_id: dealId,
      body_html: bodyHtml || `<p>${bodyText}</p>`,
      body_text: bodyText,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon notitie niet opslaan."),
    };
  }

  if (leadId) {
    await logCrmActivity(supabase, {
      organizationId: orgId,
      userId: user?.id,
      eventType: "crm.note.created",
      entityType: "crm_lead",
      entityId: leadId,
      description: "Notitie toegevoegd",
      metadata: { noteId: data.id },
    });
  }

  revalidateCrm(leadId ? [`/crm/leads/${leadId}`] : []);
  return { success: true, message: "Notitie opgeslagen.", id: data.id };
}
