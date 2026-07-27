import type { SupabaseClient } from "@supabase/supabase-js";

import {
  DEFAULT_PIPELINE_DEFS,
  DEFAULT_STAGE_DEFS,
} from "@/lib/crm/constants";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

/**
 * Ensures default pipelines + stages exist for an organization.
 * Safe to call repeatedly (idempotent by slug).
 */
export async function ensureDefaultCrmSetup(
  supabase: Client,
  organizationId: string,
): Promise<void> {
  const { data: existing, error } = await supabase
    .from("crm_pipelines")
    .select("id, slug")
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(error.message);
  }

  const bySlug = new Map((existing ?? []).map((row) => [row.slug, row.id]));

  for (const def of DEFAULT_PIPELINE_DEFS) {
    let pipelineId = bySlug.get(def.slug);

    if (!pipelineId) {
      const { data: created, error: createError } = await supabase
        .from("crm_pipelines")
        .insert({
          organization_id: organizationId,
          name: def.name,
          slug: def.slug,
          description: def.description,
          color: def.color,
          is_default: def.isDefault,
          sort_order: def.sortOrder,
        })
        .select("id")
        .single();

      if (createError || !created) {
        throw new Error(createError?.message ?? "Kon pipeline niet aanmaken.");
      }

      pipelineId = created.id;
      bySlug.set(def.slug, pipelineId);
    }

    const { data: stages, error: stagesError } = await supabase
      .from("crm_funnel_stages")
      .select("id, slug")
      .eq("pipeline_id", pipelineId);

    if (stagesError) {
      throw new Error(stagesError.message);
    }

    const stageSlugs = new Set((stages ?? []).map((row) => row.slug));

    for (const stage of DEFAULT_STAGE_DEFS) {
      if (stageSlugs.has(stage.slug)) continue;

      const { error: stageError } = await supabase
        .from("crm_funnel_stages")
        .insert({
          organization_id: organizationId,
          pipeline_id: pipelineId,
          name: stage.name,
          slug: stage.slug,
          color: stage.color,
          sort_order: stage.sortOrder,
          is_won: "isWon" in stage ? Boolean(stage.isWon) : false,
          is_lost: "isLost" in stage ? Boolean(stage.isLost) : false,
          probability:
            "probability" in stage ? Number(stage.probability ?? 0) : 0,
        });

      if (stageError) {
        throw new Error(stageError.message);
      }
    }
  }
}

export async function ensureCloseReasons(
  supabase: Client,
  organizationId: string,
): Promise<void> {
  const { DEFAULT_LOST_REASONS, DEFAULT_WON_REASONS } = await import(
    "@/lib/crm/pipeline/constants"
  );

  const { data: existing } = await supabase
    .from("crm_close_reasons")
    .select("kind, code")
    .eq("organization_id", organizationId);

  const have = new Set(
    (existing ?? []).map((row) => `${row.kind}:${row.code}`),
  );

  const rows = [
    ...DEFAULT_WON_REASONS.map((reason, index) => ({
      organization_id: organizationId,
      kind: "won" as const,
      code: reason.code,
      label: reason.label,
      sort_order: index,
    })),
    ...DEFAULT_LOST_REASONS.map((reason, index) => ({
      organization_id: organizationId,
      kind: "lost" as const,
      code: reason.code,
      label: reason.label,
      sort_order: index,
    })),
  ].filter((row) => !have.has(`${row.kind}:${row.code}`));

  if (rows.length === 0) return;
  const { error } = await supabase.from("crm_close_reasons").insert(rows);
  if (error) throw new Error(error.message);
}
