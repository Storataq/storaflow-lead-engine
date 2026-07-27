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
  revalidatePath("/crm/pipeline");
  revalidatePath("/crm/pipelines");
  revalidatePath("/crm/funnels");
  revalidatePath("/crm/deals");
  revalidatePath("/crm/tasks");
  revalidatePath("/crm/notes");
  revalidatePath("/crm/analytics");
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
      probability:
        "probability" in stage ? Number(stage.probability ?? 0) : 0,
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
  const probabilityRaw = Number(formData.get("probability") ?? 0);
  const probability = Number.isFinite(probabilityRaw)
    ? Math.max(0, Math.min(100, Math.round(probabilityRaw)))
    : 0;

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
      probability: isWon ? 100 : isLost ? 0 : probability,
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
  const description = String(formData.get("description") ?? "").trim() || null;
  const priority = String(formData.get("priority") ?? "normal") || "normal";
  const expectedClose = String(formData.get("expected_close_date") ?? "").trim();
  const probabilityRaw = formData.get("probability");
  const probability =
    probabilityRaw === null || String(probabilityRaw).trim() === ""
      ? null
      : Math.max(0, Math.min(100, Number(probabilityRaw)));
  const tags = parseTags(String(formData.get("tags") ?? ""));

  if (!title || !pipelineId || !stageId) {
    return { success: false, message: "Titel, pipeline en stage zijn verplicht." };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const expectedRevenue =
    probability != null && Number.isFinite(value)
      ? (value * probability) / 100
      : null;

  const { data, error } = await supabase
    .from("crm_deals")
    .insert({
      organization_id: orgId,
      title,
      pipeline_id: pipelineId,
      stage_id: stageId,
      lead_id: leadId,
      value: Number.isFinite(value) ? value : 0,
      description,
      priority,
      tags,
      probability: probability != null && Number.isFinite(probability) ? probability : null,
      expected_revenue: expectedRevenue,
      expected_close_date: expectedClose || null,
      owner_user_id: user?.id ?? null,
      created_by: user?.id ?? null,
      status: "open",
      last_stage_changed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon deal niet opslaan."),
    };
  }

  if (leadId) {
    await logCrmActivity(supabase, {
      organizationId: orgId,
      userId: user?.id,
      eventType: "crm.deal.created",
      entityType: "crm_lead",
      entityId: leadId,
      description: `Deal aangemaakt: ${title}`,
      metadata: { dealId: data.id },
    });
  }

  revalidateCrm(leadId ? [`/crm/leads/${leadId}`] : []);
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
  const dealId = String(formData.get("deal_id") ?? "").trim() || null;
  const dueRaw = String(formData.get("due_at") ?? "").trim();
  const priority = String(formData.get("priority") ?? "normal");
  const assigned = String(formData.get("assigned_user_id") ?? "").trim() || null;
  const taskType = String(formData.get("task_type") ?? "internal") || "internal";

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
      deal_id: dealId,
      due_at: dueRaw ? new Date(dueRaw).toISOString() : null,
      priority: priority as "low" | "normal" | "high" | "urgent",
      assigned_user_id: assigned || user?.id || null,
      created_by: user?.id ?? null,
      status: "todo",
      task_type: taskType,
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
  const orgId = context.organization.id;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: task } = await supabase
    .from("crm_tasks")
    .select("id, title, lead_id")
    .eq("organization_id", orgId)
    .eq("id", taskId)
    .maybeSingle();

  const { error } = await supabase
    .from("crm_tasks")
    .update({ status })
    .eq("organization_id", orgId)
    .eq("id", taskId);

  if (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon taakstatus niet wijzigen."),
    };
  }

  if (task?.lead_id && status === "done") {
    await logCrmActivity(supabase, {
      organizationId: orgId,
      userId: user?.id,
      eventType: "crm.task.completed",
      entityType: "crm_lead",
      entityId: task.lead_id,
      description: `Taak afgerond: ${task.title}`,
      metadata: { taskId },
    });
  }

  revalidateCrm(task?.lead_id ? [`/crm/leads/${task.lead_id}`] : []);
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

export async function deleteLeadsAction(
  leadIds: string[],
): Promise<CrmActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };
  if (leadIds.length === 0) {
    return { success: false, message: "Selecteer minimaal één lead." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_leads")
    .delete()
    .eq("organization_id", context.organization.id)
    .in("id", leadIds);

  if (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon leads niet verwijderen."),
    };
  }

  revalidateCrm();
  return {
    success: true,
    message: `${leadIds.length} lead(s) verwijderd.`,
  };
}

export async function assignLeadsAction(
  leadIds: string[],
  ownerUserId: string | null,
): Promise<CrmActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };
  if (leadIds.length === 0) {
    return { success: false, message: "Selecteer minimaal één lead." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_leads")
    .update({ owner_user_id: ownerUserId })
    .eq("organization_id", context.organization.id)
    .in("id", leadIds);

  if (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon eigenaar niet toewijzen."),
    };
  }

  revalidateCrm();
  return {
    success: true,
    message: `${leadIds.length} lead(s) toegewezen.`,
  };
}

export async function moveLeadsPipelineAction(
  leadIds: string[],
  pipelineId: string,
  stageId: string,
): Promise<CrmActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };
  if (leadIds.length === 0) {
    return { success: false, message: "Selecteer minimaal één lead." };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  const { data: stage } = await supabase
    .from("crm_funnel_stages")
    .select("id, pipeline_id, is_won, is_lost, name")
    .eq("organization_id", orgId)
    .eq("id", stageId)
    .maybeSingle();

  if (!stage || stage.pipeline_id !== pipelineId) {
    return { success: false, message: "Ongeldige pipeline of stage." };
  }

  let status: "open" | "won" | "lost" = "open";
  if (stage.is_won) status = "won";
  if (stage.is_lost) status = "lost";

  const { error } = await supabase
    .from("crm_leads")
    .update({
      pipeline_id: pipelineId,
      stage_id: stageId,
      status,
    })
    .eq("organization_id", orgId)
    .in("id", leadIds);

  if (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon pipeline niet wijzigen."),
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  for (const leadId of leadIds.slice(0, 20)) {
    await logCrmActivity(supabase, {
      organizationId: orgId,
      userId: user?.id,
      eventType: "crm.lead.stage_changed",
      entityType: "crm_lead",
      entityId: leadId,
      description: `Pipeline gewijzigd naar “${stage.name}”`,
      metadata: { pipelineId, stageId },
    });
  }

  revalidateCrm();
  return {
    success: true,
    message: `${leadIds.length} lead(s) verplaatst.`,
  };
}

export async function updateNoteAction(
  noteId: string,
  formData: FormData,
): Promise<CrmActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const bodyHtml = String(formData.get("body_html") ?? "").trim();
  const bodyText =
    String(formData.get("body_text") ?? "").trim() ||
    bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  if (!bodyHtml && !bodyText) {
    return { success: false, message: "Notitie mag niet leeg zijn." };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  const { data: existing } = await supabase
    .from("crm_notes")
    .select("id, lead_id")
    .eq("organization_id", orgId)
    .eq("id", noteId)
    .maybeSingle();

  if (!existing) return { success: false, message: "Notitie niet gevonden." };

  const { error } = await supabase
    .from("crm_notes")
    .update({
      body_html: bodyHtml || `<p>${bodyText}</p>`,
      body_text: bodyText,
    })
    .eq("organization_id", orgId)
    .eq("id", noteId);

  if (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon notitie niet bijwerken."),
    };
  }

  revalidateCrm(existing.lead_id ? [`/crm/leads/${existing.lead_id}`] : []);
  return { success: true, message: "Notitie bijgewerkt.", id: noteId };
}

export async function deleteNoteAction(noteId: string): Promise<CrmActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const supabase = await createClient();
  const orgId = context.organization.id;

  const { data: existing } = await supabase
    .from("crm_notes")
    .select("id, lead_id")
    .eq("organization_id", orgId)
    .eq("id", noteId)
    .maybeSingle();

  if (!existing) return { success: false, message: "Notitie niet gevonden." };

  const { error } = await supabase
    .from("crm_notes")
    .delete()
    .eq("organization_id", orgId)
    .eq("id", noteId);

  if (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon notitie niet verwijderen."),
    };
  }

  revalidateCrm(existing.lead_id ? [`/crm/leads/${existing.lead_id}`] : []);
  return { success: true, message: "Notitie verwijderd.", id: noteId };
}

export async function updateTaskAction(
  taskId: string,
  formData: FormData,
): Promise<CrmActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const dueRaw = String(formData.get("due_at") ?? "").trim();
  const priority = String(formData.get("priority") ?? "normal");
  const status = String(formData.get("status") ?? "todo");
  const assigned =
    String(formData.get("assigned_user_id") ?? "").trim() || null;

  if (!title) return { success: false, message: "Titel is verplicht." };

  const supabase = await createClient();
  const orgId = context.organization.id;

  const { data: existing } = await supabase
    .from("crm_tasks")
    .select("id, lead_id")
    .eq("organization_id", orgId)
    .eq("id", taskId)
    .maybeSingle();

  if (!existing) return { success: false, message: "Taak niet gevonden." };

  const { error } = await supabase
    .from("crm_tasks")
    .update({
      title,
      description,
      due_at: dueRaw ? new Date(dueRaw).toISOString() : null,
      priority: priority as "low" | "normal" | "high" | "urgent",
      status: status as "todo" | "in_progress" | "done" | "cancelled",
      assigned_user_id: assigned,
    })
    .eq("organization_id", orgId)
    .eq("id", taskId);

  if (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon taak niet bijwerken."),
    };
  }

  revalidateCrm(existing.lead_id ? [`/crm/leads/${existing.lead_id}`] : []);
  return { success: true, message: "Taak bijgewerkt.", id: taskId };
}

export async function deleteTaskAction(taskId: string): Promise<CrmActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const supabase = await createClient();
  const orgId = context.organization.id;

  const { data: existing } = await supabase
    .from("crm_tasks")
    .select("id, lead_id")
    .eq("organization_id", orgId)
    .eq("id", taskId)
    .maybeSingle();

  if (!existing) return { success: false, message: "Taak niet gevonden." };

  const { error } = await supabase
    .from("crm_tasks")
    .delete()
    .eq("organization_id", orgId)
    .eq("id", taskId);

  if (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon taak niet verwijderen."),
    };
  }

  revalidateCrm(existing.lead_id ? [`/crm/leads/${existing.lead_id}`] : []);
  return { success: true, message: "Taak verwijderd.", id: taskId };
}

export async function createLeadContactAction(
  formData: FormData,
): Promise<CrmActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const leadId = String(formData.get("lead_id") ?? "").trim();
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  if (!leadId || (!firstName && !lastName)) {
    return {
      success: false,
      message: "Lead en minimaal een naam zijn verplicht.",
    };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isPrimary = formData.get("is_primary") === "on";

  if (isPrimary) {
    await supabase
      .from("crm_lead_contacts")
      .update({ is_primary: false })
      .eq("organization_id", orgId)
      .eq("lead_id", leadId);
  }

  const { data, error } = await supabase
    .from("crm_lead_contacts")
    .insert({
      organization_id: orgId,
      lead_id: leadId,
      first_name: firstName,
      last_name: lastName,
      job_title: String(formData.get("job_title") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      linkedin_url: String(formData.get("linkedin_url") ?? "").trim() || null,
      is_primary: isPrimary,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon contact niet opslaan."),
    };
  }

  await logCrmActivity(supabase, {
    organizationId: orgId,
    userId: user?.id,
    eventType: "crm.contact.created",
    entityType: "crm_lead",
    entityId: leadId,
    description: `Contact toegevoegd: ${firstName} ${lastName}`.trim(),
    metadata: { contactId: data.id },
  });

  revalidateCrm([`/crm/leads/${leadId}`]);
  return { success: true, message: "Contact opgeslagen.", id: data.id };
}

export async function updateLeadContactAction(
  contactId: string,
  formData: FormData,
): Promise<CrmActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  if (!firstName && !lastName) {
    return { success: false, message: "Minimaal een naam is verplicht." };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;
  const isPrimary = formData.get("is_primary") === "on";

  const { data: existing } = await supabase
    .from("crm_lead_contacts")
    .select("id, lead_id")
    .eq("organization_id", orgId)
    .eq("id", contactId)
    .maybeSingle();

  if (!existing) return { success: false, message: "Contact niet gevonden." };

  if (isPrimary) {
    await supabase
      .from("crm_lead_contacts")
      .update({ is_primary: false })
      .eq("organization_id", orgId)
      .eq("lead_id", existing.lead_id);
  }

  const { error } = await supabase
    .from("crm_lead_contacts")
    .update({
      first_name: firstName,
      last_name: lastName,
      job_title: String(formData.get("job_title") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      linkedin_url: String(formData.get("linkedin_url") ?? "").trim() || null,
      is_primary: isPrimary,
    })
    .eq("organization_id", orgId)
    .eq("id", contactId);

  if (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon contact niet bijwerken."),
    };
  }

  revalidateCrm([`/crm/leads/${existing.lead_id}`]);
  return { success: true, message: "Contact bijgewerkt.", id: contactId };
}

export async function deleteLeadContactAction(
  contactId: string,
): Promise<CrmActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const supabase = await createClient();
  const orgId = context.organization.id;

  const { data: existing } = await supabase
    .from("crm_lead_contacts")
    .select("id, lead_id")
    .eq("organization_id", orgId)
    .eq("id", contactId)
    .maybeSingle();

  if (!existing) return { success: false, message: "Contact niet gevonden." };

  const { error } = await supabase
    .from("crm_lead_contacts")
    .delete()
    .eq("organization_id", orgId)
    .eq("id", contactId);

  if (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon contact niet verwijderen."),
    };
  }

  revalidateCrm([`/crm/leads/${existing.lead_id}`]);
  return { success: true, message: "Contact verwijderd.", id: contactId };
}

export async function convertLeadToDealAction(
  leadId: string,
  formData: FormData,
): Promise<CrmActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const supabase = await createClient();
  const orgId = context.organization.id;

  const { data: lead } = await supabase
    .from("crm_leads")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return { success: false, message: "Lead niet gevonden." };

  const title =
    String(formData.get("title") ?? "").trim() ||
    `Deal — ${lead.company_name}`;
  const value = Number(
    formData.get("value") ?? lead.deal_value ?? 0,
  );
  const expectedClose = String(formData.get("expected_close_date") ?? "").trim();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("crm_deals")
    .insert({
      organization_id: orgId,
      lead_id: leadId,
      pipeline_id: lead.pipeline_id,
      stage_id: lead.stage_id,
      title,
      value: Number.isFinite(value) ? value : 0,
      expected_close_date: expectedClose || null,
      owner_user_id: lead.owner_user_id ?? user?.id ?? null,
      created_by: user?.id ?? null,
      status: "open",
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon deal niet aanmaken."),
    };
  }

  await logCrmActivity(supabase, {
    organizationId: orgId,
    userId: user?.id,
    eventType: "crm.deal.created",
    entityType: "crm_lead",
    entityId: leadId,
    description: `Deal aangemaakt: ${title}`,
    metadata: { dealId: data.id },
  });

  revalidateCrm([`/crm/leads/${leadId}`, `/crm/deals/${data.id}`]);
  return { success: true, message: "Deal aangemaakt.", id: data.id };
}

export async function updatePipelineAction(
  formData: FormData,
): Promise<CrmActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const pipelineId = String(formData.get("pipeline_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const color = String(formData.get("color") ?? "").trim() || "#2563eb";
  if (!pipelineId || !name) {
    return { success: false, message: "Pipeline en naam zijn verplicht." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_pipelines")
    .update({ name, description, color })
    .eq("organization_id", context.organization.id)
    .eq("id", pipelineId);

  if (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon pipeline niet bijwerken."),
    };
  }
  revalidateCrm();
  return { success: true, message: "Pipeline bijgewerkt.", id: pipelineId };
}

export async function archivePipelineAction(
  pipelineId: string,
  archive = true,
): Promise<CrmActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_pipelines")
    .update({
      is_archived: archive,
      archived_at: archive ? new Date().toISOString() : null,
    })
    .eq("organization_id", context.organization.id)
    .eq("id", pipelineId);

  if (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon pipeline niet archiveren."),
    };
  }
  revalidateCrm();
  return {
    success: true,
    message: archive ? "Pipeline gearchiveerd." : "Pipeline hersteld.",
    id: pipelineId,
  };
}

export async function updateStageAction(
  formData: FormData,
): Promise<CrmActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const stageId = String(formData.get("stage_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim() || "#64748b";
  const probability = Math.max(
    0,
    Math.min(100, Math.round(Number(formData.get("probability") ?? 0))),
  );
  const isWon = formData.get("is_won") === "on";
  const isLost = formData.get("is_lost") === "on";

  if (!stageId || !name) {
    return { success: false, message: "Stage en naam zijn verplicht." };
  }
  if (isWon && isLost) {
    return {
      success: false,
      message: "Een stage kan niet tegelijk gewonnen en verloren zijn.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_funnel_stages")
    .update({
      name,
      color,
      probability: isWon ? 100 : isLost ? 0 : probability,
      is_won: isWon,
      is_lost: isLost,
    })
    .eq("organization_id", context.organization.id)
    .eq("id", stageId);

  if (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon stage niet bijwerken."),
    };
  }
  revalidateCrm();
  return { success: true, message: "Stage bijgewerkt.", id: stageId };
}

export async function reorderStagesAction(
  pipelineId: string,
  orderedStageIds: string[],
): Promise<CrmActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };
  if (!pipelineId || orderedStageIds.length === 0) {
    return { success: false, message: "Geen stages om te herordenen." };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  for (let index = 0; index < orderedStageIds.length; index += 1) {
    const { error } = await supabase
      .from("crm_funnel_stages")
      .update({ sort_order: index })
      .eq("organization_id", orgId)
      .eq("pipeline_id", pipelineId)
      .eq("id", orderedStageIds[index]);
    if (error) {
      return {
        success: false,
        message: toUserFacingError(error, "Kon stages niet herordenen."),
      };
    }
  }

  revalidateCrm();
  return { success: true, message: "Stages herordend." };
}

export async function moveDealStageAction(
  dealId: string,
  stageId: string,
): Promise<CrmActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const supabase = await createClient();
  const orgId = context.organization.id;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: deal, error: dealError } = await supabase
    .from("crm_deals")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", dealId)
    .maybeSingle();
  if (dealError || !deal) {
    return { success: false, message: "Deal niet gevonden." };
  }

  const { data: stage, error: stageError } = await supabase
    .from("crm_funnel_stages")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", stageId)
    .maybeSingle();
  if (stageError || !stage) {
    return { success: false, message: "Stage niet gevonden." };
  }
  if (stage.pipeline_id !== deal.pipeline_id) {
    return { success: false, message: "Stage hoort niet bij deze pipeline." };
  }

  const now = new Date().toISOString();
  let status = deal.status;
  let closedAt = deal.closed_at;
  if (stage.is_won) {
    status = "won";
    closedAt = now;
  } else if (stage.is_lost) {
    status = "lost";
    closedAt = now;
  } else {
    status = "open";
    closedAt = null;
  }

  const expectedRevenue =
    deal.probability != null
      ? (Number(deal.value) * Number(deal.probability)) / 100
      : (Number(deal.value) * Number(stage.probability ?? 0)) / 100;

  const { error } = await supabase
    .from("crm_deals")
    .update({
      stage_id: stageId,
      status,
      closed_at: closedAt,
      last_stage_changed_at: now,
      expected_revenue: expectedRevenue,
    })
    .eq("id", dealId)
    .eq("organization_id", orgId);

  if (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon deal niet verplaatsen."),
    };
  }

  await supabase.from("crm_deal_stage_history").insert({
    organization_id: orgId,
    deal_id: dealId,
    from_stage_id: deal.stage_id,
    to_stage_id: stageId,
    from_status: deal.status,
    to_status: status,
    changed_by: user?.id ?? null,
    metadata_json: { stageName: stage.name },
  });

  const { emitPipelineAutomationEvent } = await import(
    "@/lib/crm/pipeline/automation"
  );
  await emitPipelineAutomationEvent(supabase, {
    organizationId: orgId,
    eventType: stage.is_won
      ? "deal_won"
      : stage.is_lost
        ? "deal_lost"
        : "stage_changed",
    entityType: "crm_deal",
    entityId: dealId,
    payload: {
      fromStageId: deal.stage_id,
      toStageId: stageId,
      status,
      value: deal.value,
    },
  });

  await logCrmActivity(supabase, {
    organizationId: orgId,
    userId: user?.id,
    eventType: stage.is_won
      ? "crm.deal.won"
      : stage.is_lost
        ? "crm.deal.lost"
        : "crm.deal.stage_changed",
    entityType: "crm_deal",
    entityId: dealId,
    description: `Deal verplaatst naar ${stage.name}`,
    metadata: { fromStageId: deal.stage_id, toStageId: stageId, status },
  });

  if (Number(deal.value) >= 25000) {
    await emitPipelineAutomationEvent(supabase, {
      organizationId: orgId,
      eventType: "large_opportunity",
      entityType: "crm_deal",
      entityId: dealId,
      payload: { value: deal.value },
    });
  }

  revalidateCrm([`/crm/deals/${dealId}`]);
  return { success: true, message: "Deal stage bijgewerkt.", id: dealId };
}

export async function updateDealAction(
  formData: FormData,
): Promise<CrmActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const dealId = String(formData.get("deal_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const value = Number(formData.get("value") ?? 0);
  const description = String(formData.get("description") ?? "").trim() || null;
  const priority = String(formData.get("priority") ?? "normal");
  const expectedClose = String(formData.get("expected_close_date") ?? "").trim();
  const owner = String(formData.get("owner_user_id") ?? "").trim() || null;
  const probabilityRaw = String(formData.get("probability") ?? "").trim();
  const probability =
    probabilityRaw === ""
      ? null
      : Math.max(0, Math.min(100, Number(probabilityRaw)));
  const tags = parseTags(String(formData.get("tags") ?? ""));
  const primaryContact =
    String(formData.get("primary_contact_id") ?? "").trim() || null;

  if (!dealId || !title) {
    return { success: false, message: "Deal en titel zijn verplicht." };
  }

  const expectedRevenue =
    probability != null && Number.isFinite(value)
      ? (value * probability) / 100
      : null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_deals")
    .update({
      title,
      value: Number.isFinite(value) ? value : 0,
      description,
      priority,
      expected_close_date: expectedClose || null,
      owner_user_id: owner,
      probability,
      expected_revenue: expectedRevenue,
      tags,
      primary_contact_id: primaryContact,
    })
    .eq("organization_id", context.organization.id)
    .eq("id", dealId);

  if (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon deal niet bijwerken."),
    };
  }

  revalidateCrm([`/crm/deals/${dealId}`]);
  return { success: true, message: "Deal bijgewerkt.", id: dealId };
}

export async function closeDealAction(
  formData: FormData,
): Promise<CrmActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const dealId = String(formData.get("deal_id") ?? "");
  const outcome = String(formData.get("outcome") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const competitor = String(formData.get("competitor") ?? "").trim() || null;
  const notes = String(formData.get("close_notes") ?? "").trim() || null;

  if (!dealId || (outcome !== "won" && outcome !== "lost")) {
    return { success: false, message: "Deal en uitkomst (won/lost) zijn verplicht." };
  }
  if (!reason) {
    return { success: false, message: "Reden is verplicht." };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: deal } = await supabase
    .from("crm_deals")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", dealId)
    .maybeSingle();
  if (!deal) return { success: false, message: "Deal niet gevonden." };

  const { data: stages } = await supabase
    .from("crm_funnel_stages")
    .select("*")
    .eq("organization_id", orgId)
    .eq("pipeline_id", deal.pipeline_id);

  const target = (stages ?? []).find((s) =>
    outcome === "won" ? s.is_won : s.is_lost,
  );
  if (!target) {
    return {
      success: false,
      message: `Geen ${outcome === "won" ? "gewonnen" : "verloren"} stage in pipeline.`,
    };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("crm_deals")
    .update({
      stage_id: target.id,
      status: outcome,
      closed_at: now,
      last_stage_changed_at: now,
      won_reason: outcome === "won" ? reason : null,
      lost_reason: outcome === "lost" ? reason : null,
      competitor: outcome === "lost" ? competitor : null,
      close_notes: notes,
      probability: outcome === "won" ? 100 : 0,
      expected_revenue: outcome === "won" ? Number(deal.value) : 0,
    })
    .eq("id", dealId)
    .eq("organization_id", orgId);

  if (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon deal niet afsluiten."),
    };
  }

  await supabase.from("crm_deal_stage_history").insert({
    organization_id: orgId,
    deal_id: dealId,
    from_stage_id: deal.stage_id,
    to_stage_id: target.id,
    from_status: deal.status,
    to_status: outcome,
    changed_by: user?.id ?? null,
    note: reason,
    metadata_json: { competitor, notes },
  });

  const { emitPipelineAutomationEvent } = await import(
    "@/lib/crm/pipeline/automation"
  );
  await emitPipelineAutomationEvent(supabase, {
    organizationId: orgId,
    eventType: outcome === "won" ? "deal_won" : "deal_lost",
    entityType: "crm_deal",
    entityId: dealId,
    payload: { reason, competitor },
  });

  await logCrmActivity(supabase, {
    organizationId: orgId,
    userId: user?.id,
    eventType: outcome === "won" ? "crm.deal.won" : "crm.deal.lost",
    entityType: "crm_deal",
    entityId: dealId,
    description: `Deal ${outcome}: ${reason}`,
    metadata: { reason, competitor },
  });

  revalidateCrm([`/crm/deals/${dealId}`, "/crm/analytics"]);
  return { success: true, message: `Deal gemarkeerd als ${outcome}.`, id: dealId };
}
