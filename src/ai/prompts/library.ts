/**
 * Prompt library — versioned templates with variables + inheritance.
 */

import type { AiPromptTemplateRow } from "@/ai/types";
import { renderPromptTemplate } from "@/ai/prompts/render";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

export { renderPromptTemplate } from "@/ai/prompts/render";

export async function upsertPromptTemplate(params: {
  organizationId: string;
  slug: string;
  name: string;
  category?: string;
  locale?: string;
  templateBody: string;
  variables?: string[];
  parentSlug?: string | null;
  abVariant?: string | null;
  createdBy?: string | null;
}): Promise<AiPromptTemplateRow | null> {
  const supabase = await createClient();
  const { data: latest } = await supabase
    .from("ai_prompt_templates")
    .select("version")
    .eq("organization_id", params.organizationId)
    .eq("slug", params.slug)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (latest?.version ?? 0) + 1;
  const { data, error } = await supabase
    .from("ai_prompt_templates")
    .insert({
      organization_id: params.organizationId,
      slug: params.slug,
      name: params.name,
      category: params.category ?? "general",
      version: nextVersion,
      locale: params.locale ?? "nl",
      template_body: params.templateBody,
      variables_json: (params.variables ?? []) as Json,
      parent_slug: params.parentSlug ?? null,
      ab_variant: params.abVariant ?? null,
      created_by: params.createdBy ?? null,
      is_active: true,
    })
    .select("*")
    .single();
  if (error) return null;
  return data as AiPromptTemplateRow;
}

export async function resolvePrompt(params: {
  organizationId: string;
  slug: string;
  locale?: string;
  variables?: Record<string, string>;
}): Promise<{ body: string; version: number } | null> {
  const supabase = await createClient();
  let q = supabase
    .from("ai_prompt_templates")
    .select("*")
    .eq("organization_id", params.organizationId)
    .eq("slug", params.slug)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("version", { ascending: false })
    .limit(1);
  if (params.locale) q = q.eq("locale", params.locale);

  const { data } = await q.maybeSingle();
  if (!data) return null;

  let body = data.template_body as string;
  if (data.parent_slug) {
    const { data: parent } = await supabase
      .from("ai_prompt_templates")
      .select("template_body")
      .eq("organization_id", params.organizationId)
      .eq("slug", data.parent_slug)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (parent?.template_body) {
      body = `${parent.template_body}\n\n${body}`;
    }
  }

  return {
    body: renderPromptTemplate(body, params.variables ?? {}),
    version: data.version,
  };
}
