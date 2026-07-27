/**
 * Email template queries (Phase 21B).
 */

import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TEMPLATE_FOLDER_DEFS } from "@/lib/email/template/constants";
import type { Database } from "@/types/supabase";

export type EmailTemplateRow =
  Database["public"]["Tables"]["email_templates"]["Row"];
export type EmailTemplateVersionRow =
  Database["public"]["Tables"]["email_template_versions"]["Row"];
export type EmailTemplateFolderRow =
  Database["public"]["Tables"]["email_template_folders"]["Row"];

export type TemplateListFilters = {
  query?: string;
  category?: string;
  status?: string;
  language?: string;
  folderId?: string;
  tag?: string;
};

export { mapTemplateFallbacks } from "@/lib/email/template/fallbacks";

export async function ensureDefaultTemplateFolders(
  organizationId: string,
): Promise<EmailTemplateFolderRow[]> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("email_template_folders")
    .select("*")
    .eq("organization_id", organizationId)
    .order("sort_order", { ascending: true });

  if ((existing ?? []).length > 0) return existing ?? [];

  const rows = DEFAULT_TEMPLATE_FOLDER_DEFS.map((folder) => ({
    organization_id: organizationId,
    name: folder.name,
    slug: folder.slug,
    sort_order: folder.sortOrder,
  }));

  const { data, error } = await supabase
    .from("email_template_folders")
    .insert(rows)
    .select("*");

  if (error) {
    // Migration may not be applied yet — return empty
    return [];
  }
  return data ?? [];
}

export async function listTemplateFolders(organizationId: string) {
  return ensureDefaultTemplateFolders(organizationId);
}

export async function listEmailTemplates(
  organizationId: string,
  filters: TemplateListFilters = {},
): Promise<EmailTemplateRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("email_templates")
    .select("*")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (filters.category && filters.category !== "all") {
    query = query.eq("category", filters.category);
  }
  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.language && filters.language !== "all") {
    query = query.eq("language", filters.language);
  }
  if (filters.folderId && filters.folderId !== "all") {
    query = query.eq("folder_id", filters.folderId);
  }
  if (filters.tag?.trim()) {
    query = query.contains("tags", [filters.tag.trim()]);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let rows = data ?? [];
  if (filters.query?.trim()) {
    const needle = filters.query.trim().toLowerCase();
    rows = rows.filter((row) => {
      const haystack = [
        row.name,
        row.description ?? "",
        row.category ?? "",
        row.subject,
        ...(row.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }
  return rows;
}

export async function getEmailTemplate(
  organizationId: string,
  templateId: string,
): Promise<EmailTemplateRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", templateId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function listTemplateVersions(
  organizationId: string,
  templateId: string,
): Promise<EmailTemplateVersionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_template_versions")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("template_id", templateId)
    .order("version_number", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listLeadsForTemplatePreview(
  organizationId: string,
  limit = 20,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_leads")
    .select(
      "id, company_name, contact_name, email, phone, website, industry, city, country, notes, owner_user_id",
    )
    .eq("organization_id", organizationId)
    .eq("status", "open")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Placeholder rows for a future default template library (no AI content).
 * Idempotent: only inserts when org has zero library placeholders.
 */
export async function ensureLibraryPlaceholders(
  organizationId: string,
  createdBy: string | null,
): Promise<number> {
  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from("email_templates")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("is_library_placeholder", true);

  if (countError) return 0;
  if ((count ?? 0) > 0) return 0;

  const shells = [
    {
      name: "[Library] Cold Outreach",
      category: "cold_outreach",
      subject: "{{companyName}} — introduction",
    },
    {
      name: "[Library] Follow-up",
      category: "follow_up",
      subject: "Following up with {{contactFirstName}}",
    },
    {
      name: "[Library] Welcome",
      category: "welcome",
      subject: "Welcome, {{contactFirstName}}",
    },
  ] as const;

  const rows = shells.map((shell) => ({
    organization_id: organizationId,
    name: shell.name,
    description:
      "Placeholder for future default library content — no AI generation yet.",
    category: shell.category,
    language: "en",
    subject: shell.subject,
    preview_text: null,
    html_body: `<p>Hi {{contactFirstName}},</p><p>Placeholder body for {{companyName}}.</p>`,
    text_body: `Hi {{contactFirstName}},\n\nPlaceholder body for {{companyName}}.`,
    variables: ["contactFirstName", "companyName"],
    status: "draft",
    version: 1,
    tags: ["General"],
    created_by: createdBy,
    is_library_placeholder: true,
    fallbacks_json: {},
  }));

  const { data, error } = await supabase
    .from("email_templates")
    .insert(rows)
    .select("id");

  if (error) return 0;
  return data?.length ?? 0;
}
