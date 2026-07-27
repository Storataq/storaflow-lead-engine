"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  EMAIL_TEMPLATE_CATEGORIES,
  EMAIL_TEMPLATE_STATUSES,
} from "@/lib/email/template/constants";
import {
  collectTemplateVariables,
  validateTemplateContent,
} from "@/lib/email/template";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { createClient } from "@/lib/supabase/server";
import { toUserFacingError } from "@/lib/ui/user-facing-error";
import type { Json } from "@/types/supabase";

export type TemplateActionResult = {
  success: boolean;
  message: string;
  id?: string;
  warnings?: string[];
};

function revalidateTemplates(id?: string) {
  revalidatePath("/email/templates");
  revalidatePath("/email");
  if (id) {
    revalidatePath(`/email/templates/${id}`);
    revalidatePath(`/email/templates/${id}/edit`);
    revalidatePath(`/email/templates/${id}/preview`);
    revalidatePath(`/email/templates/${id}/versions`);
  }
}

function parseTags(raw: string | null | undefined): string[] {
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

function parseFallbacks(raw: string | null | undefined): Record<string, string> {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

const templateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  category: z.enum(EMAIL_TEMPLATE_CATEGORIES).default("custom"),
  language: z.string().trim().min(2).max(16).default("en"),
  subject: z.string().trim().min(1, "Subject is required"),
  preview_text: z.string().trim().optional().nullable(),
  html_body: z.string().min(1, "HTML body is required"),
  text_body: z.string().optional().nullable(),
  status: z.enum(EMAIL_TEMPLATE_STATUSES).default("draft"),
  tags: z.string().optional(),
  folder_id: z
    .union([z.string().uuid(), z.literal(""), z.null()])
    .optional(),
  fallbacks_json: z.string().optional(),
  change_notes: z.string().trim().optional().nullable(),
});

async function snapshotVersion(input: {
  organizationId: string;
  templateId: string;
  versionNumber: number;
  name: string;
  subject: string;
  previewText: string | null;
  htmlBody: string;
  textBody: string | null;
  variables: string[];
  changeNotes: string | null;
  userId: string | null;
  isCurrent: boolean;
  previousVersionNumber?: number | null;
}) {
  const supabase = await createClient();
  if (input.isCurrent) {
    await supabase
      .from("email_template_versions")
      .update({ is_current: false })
      .eq("organization_id", input.organizationId)
      .eq("template_id", input.templateId)
      .eq("is_current", true);
  }

  const { error } = await supabase.from("email_template_versions").insert({
    organization_id: input.organizationId,
    template_id: input.templateId,
    version_number: input.versionNumber,
    name: input.name,
    subject: input.subject,
    preview_text: input.previewText,
    html_body: input.htmlBody,
    text_body: input.textBody,
    variables: input.variables,
    change_notes: input.changeNotes,
    is_current: input.isCurrent,
    previous_version_number: input.previousVersionNumber ?? null,
    created_by: input.userId,
  });

  if (error) {
    // Unique violation means snapshot already exists — never overwrite
    if (error.code === "23505") return;
    throw new Error(error.message);
  }
}

export async function createEmailTemplateAction(
  formData: FormData,
): Promise<TemplateActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const parsed = templateSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    category: formData.get("category") || "custom",
    language: formData.get("language") || "en",
    subject: formData.get("subject"),
    preview_text: formData.get("preview_text") || null,
    html_body: formData.get("html_body"),
    text_body: formData.get("text_body") || null,
    status: formData.get("status") || "draft",
    tags: String(formData.get("tags") ?? ""),
    folder_id: formData.get("folder_id") || "",
    fallbacks_json: String(formData.get("fallbacks_json") ?? ""),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid template",
    };
  }

  const data = parsed.data;
  const validation = validateTemplateContent({
    subject: data.subject,
    previewText: data.preview_text,
    htmlBody: data.html_body,
    textBody: data.text_body,
  });

  if (!validation.ok) {
    const firstError =
      validation.variableIssues.find((i) => i.severity === "error")?.message ??
      validation.htmlIssues.find((i) => i.severity === "error")?.message ??
      "Template validation failed";
    return { success: false, message: firstError };
  }

  try {
    const supabase = await createClient();
    const variables = collectTemplateVariables({
      subject: data.subject,
      previewText: data.preview_text,
      htmlBody: validation.sanitizedHtml,
      textBody: validation.plainText,
    });
    const fallbacks = parseFallbacks(data.fallbacks_json);

    const { data: created, error } = await supabase
      .from("email_templates")
      .insert({
        organization_id: context.organization.id,
        name: data.name,
        description: data.description ?? null,
        category: data.category,
        language: data.language,
        subject: data.subject,
        preview_text: data.preview_text ?? null,
        html_body: validation.sanitizedHtml,
        text_body: validation.plainText,
        variables,
        status: data.status === "active" ? "active" : "draft",
        version: 1,
        tags: parseTags(data.tags),
        folder_id: data.folder_id || null,
        created_by: context.membership.user_id,
        fallbacks_json: fallbacks as Json,
        archived_at: null,
      })
      .select("id")
      .single();

    if (error || !created) {
      return {
        success: false,
        message: toUserFacingError(
          error,
          "Kon template niet opslaan. Voer migratie 000012 uit indien nodig.",
        ),
      };
    }

    await snapshotVersion({
      organizationId: context.organization.id,
      templateId: created.id,
      versionNumber: 1,
      name: data.name,
      subject: data.subject,
      previewText: data.preview_text ?? null,
      htmlBody: validation.sanitizedHtml,
      textBody: validation.plainText,
      variables,
      changeNotes: "Initial version",
      userId: context.membership.user_id,
      isCurrent: true,
    });

    revalidateTemplates(created.id);
    return {
      success: true,
      message: "Template created",
      id: created.id,
      warnings: [
        ...validation.variableIssues.map((i) => i.message),
        ...validation.htmlIssues.map((i) => i.message),
      ],
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon template niet aanmaken."),
    };
  }
}

export async function updateEmailTemplateAction(
  templateId: string,
  formData: FormData,
): Promise<TemplateActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const parsed = templateSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    category: formData.get("category") || "custom",
    language: formData.get("language") || "en",
    subject: formData.get("subject"),
    preview_text: formData.get("preview_text") || null,
    html_body: formData.get("html_body"),
    text_body: formData.get("text_body") || null,
    status: formData.get("status") || "draft",
    tags: String(formData.get("tags") ?? ""),
    folder_id: formData.get("folder_id") || "",
    fallbacks_json: String(formData.get("fallbacks_json") ?? ""),
    change_notes: formData.get("change_notes") || null,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid template",
    };
  }

  const data = parsed.data;
  const validation = validateTemplateContent({
    subject: data.subject,
    previewText: data.preview_text,
    htmlBody: data.html_body,
    textBody: data.text_body,
  });
  if (!validation.ok) {
    const firstError =
      validation.variableIssues.find((i) => i.severity === "error")?.message ??
      validation.htmlIssues.find((i) => i.severity === "error")?.message ??
      "Template validation failed";
    return { success: false, message: firstError };
  }

  try {
    const supabase = await createClient();
    const orgId = context.organization.id;

    const { data: existing, error: loadError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("organization_id", orgId)
      .eq("id", templateId)
      .maybeSingle();

    if (loadError || !existing) {
      return { success: false, message: "Template not found." };
    }

    const contentChanged =
      existing.subject !== data.subject ||
      existing.html_body !== validation.sanitizedHtml ||
      (existing.text_body ?? "") !== validation.plainText ||
      (existing.preview_text ?? "") !== (data.preview_text ?? "");

    const variables = collectTemplateVariables({
      subject: data.subject,
      previewText: data.preview_text,
      htmlBody: validation.sanitizedHtml,
      textBody: validation.plainText,
    });
    const fallbacks = parseFallbacks(data.fallbacks_json);

    let nextVersion = existing.version;
    const publishNewVersion =
      contentChanged &&
      (existing.status === "active" || data.status === "active");

    if (publishNewVersion) {
      nextVersion = existing.version + 1;
    }

    const archivedAt =
      data.status === "archived"
        ? existing.archived_at ?? new Date().toISOString()
        : null;

    const { error } = await supabase
      .from("email_templates")
      .update({
        name: data.name,
        description: data.description ?? null,
        category: data.category,
        language: data.language,
        subject: data.subject,
        preview_text: data.preview_text ?? null,
        html_body: validation.sanitizedHtml,
        text_body: validation.plainText,
        variables,
        status: data.status,
        version: nextVersion,
        tags: parseTags(data.tags),
        folder_id: data.folder_id || null,
        fallbacks_json: fallbacks as Json,
        archived_at: archivedAt,
      })
      .eq("organization_id", orgId)
      .eq("id", templateId);

    if (error) {
      return {
        success: false,
        message: toUserFacingError(error, "Kon template niet bijwerken."),
      };
    }

    if (publishNewVersion) {
      await snapshotVersion({
        organizationId: orgId,
        templateId,
        versionNumber: nextVersion,
        name: data.name,
        subject: data.subject,
        previewText: data.preview_text ?? null,
        htmlBody: validation.sanitizedHtml,
        textBody: validation.plainText,
        variables,
        changeNotes: data.change_notes || `Version ${nextVersion}`,
        userId: context.membership.user_id,
        isCurrent: true,
        previousVersionNumber: existing.version,
      });
    }

    revalidateTemplates(templateId);
    return {
      success: true,
      message: publishNewVersion
        ? `Template updated as version ${nextVersion}`
        : "Template updated",
      id: templateId,
      warnings: [
        ...validation.variableIssues.map((i) => i.message),
        ...validation.htmlIssues.map((i) => i.message),
      ],
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon template niet bijwerken."),
    };
  }
}

export async function duplicateEmailTemplateAction(
  templateId: string,
): Promise<TemplateActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  try {
    const supabase = await createClient();
    const orgId = context.organization.id;
    const { data: source, error } = await supabase
      .from("email_templates")
      .select("*")
      .eq("organization_id", orgId)
      .eq("id", templateId)
      .maybeSingle();

    if (error || !source) {
      return { success: false, message: "Template not found." };
    }

    const { data: created, error: createError } = await supabase
      .from("email_templates")
      .insert({
        organization_id: orgId,
        name: `${source.name} (copy)`,
        description: source.description,
        category: source.category,
        language: source.language,
        subject: source.subject,
        preview_text: source.preview_text,
        html_body: source.html_body,
        text_body: source.text_body,
        variables: source.variables,
        status: "draft",
        version: 1,
        tags: source.tags,
        folder_id: source.folder_id,
        created_by: context.membership.user_id,
        fallbacks_json: source.fallbacks_json,
        archived_at: null,
        is_library_placeholder: false,
      })
      .select("id")
      .single();

    if (createError || !created) {
      return {
        success: false,
        message: toUserFacingError(createError, "Kon template niet dupliceren."),
      };
    }

    await snapshotVersion({
      organizationId: orgId,
      templateId: created.id,
      versionNumber: 1,
      name: `${source.name} (copy)`,
      subject: source.subject,
      previewText: source.preview_text,
      htmlBody: source.html_body,
      textBody: source.text_body,
      variables: source.variables ?? [],
      changeNotes: `Duplicated from ${templateId}`,
      userId: context.membership.user_id,
      isCurrent: true,
    });

    revalidateTemplates(created.id);
    return {
      success: true,
      message: "Template duplicated as draft",
      id: created.id,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon template niet dupliceren."),
    };
  }
}

export async function archiveEmailTemplateAction(
  templateId: string,
): Promise<TemplateActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("email_templates")
    .update({
      status: "archived",
      archived_at: new Date().toISOString(),
    })
    .eq("organization_id", context.organization.id)
    .eq("id", templateId);

  if (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon template niet archiveren."),
    };
  }

  revalidateTemplates(templateId);
  return { success: true, message: "Template archived", id: templateId };
}

export async function restoreTemplateVersionAction(
  templateId: string,
  versionNumber: number,
): Promise<TemplateActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  try {
    const supabase = await createClient();
    const orgId = context.organization.id;

    const { data: version, error } = await supabase
      .from("email_template_versions")
      .select("*")
      .eq("organization_id", orgId)
      .eq("template_id", templateId)
      .eq("version_number", versionNumber)
      .maybeSingle();

    if (error || !version) {
      return { success: false, message: "Version not found." };
    }

    const { data: current } = await supabase
      .from("email_templates")
      .select("*")
      .eq("organization_id", orgId)
      .eq("id", templateId)
      .maybeSingle();

    if (!current) return { success: false, message: "Template not found." };

    // Snapshot current before restore (immutable history) if missing
    await snapshotVersion({
      organizationId: orgId,
      templateId,
      versionNumber: current.version,
      name: current.name,
      subject: current.subject,
      previewText: current.preview_text,
      htmlBody: current.html_body,
      textBody: current.text_body,
      variables: current.variables ?? [],
      changeNotes: "Snapshot before restore",
      userId: context.membership.user_id,
      isCurrent: false,
      previousVersionNumber:
        current.version > 1 ? current.version - 1 : null,
    });

    const nextVersion = current.version + 1;
    const { error: updateError } = await supabase
      .from("email_templates")
      .update({
        name: version.name,
        subject: version.subject,
        preview_text: version.preview_text,
        html_body: version.html_body,
        text_body: version.text_body,
        variables: version.variables,
        version: nextVersion,
        status: "draft",
      })
      .eq("organization_id", orgId)
      .eq("id", templateId);

    if (updateError) {
      return {
        success: false,
        message: toUserFacingError(updateError, "Kon versie niet herstellen."),
      };
    }

    await snapshotVersion({
      organizationId: orgId,
      templateId,
      versionNumber: nextVersion,
      name: version.name,
      subject: version.subject,
      previewText: version.preview_text,
      htmlBody: version.html_body,
      textBody: version.text_body,
      variables: version.variables ?? [],
      changeNotes: `Restored from version ${versionNumber}`,
      userId: context.membership.user_id,
      isCurrent: true,
      previousVersionNumber: current.version,
    });

    revalidateTemplates(templateId);
    return {
      success: true,
      message: `Restored version ${versionNumber} as draft v${nextVersion}`,
      id: templateId,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon versie niet herstellen."),
    };
  }
}
