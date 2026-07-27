import { applyClassificationResult } from "@/lib/companies/classification/apply";
import { classifyCompanyCategory } from "@/lib/companies/classification/classify";
import type {
  ClassificationSignals,
  ClassificationSource,
} from "@/lib/companies/classification/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

/**
 * Fire-and-forget safe classify for scrape/enrichment pipelines.
 * Never throws to the caller — logs are left to the pipeline.
 */
export async function classifyCompanyInBackground(input: {
  supabase: Client;
  organizationId: string;
  companyId: string;
  source: ClassificationSource;
  actorUserId?: string | null;
  signals?: ClassificationSignals;
  useAi?: boolean;
}): Promise<void> {
  try {
    const { data: company } = await input.supabase
      .from("companies")
      .select("category_manual_override")
      .eq("organization_id", input.organizationId)
      .eq("id", input.companyId)
      .maybeSingle();

    // Still classify for suggestions even with override (apply respects override).
    void company;

    const result = await classifyCompanyCategory({
      organizationId: input.organizationId,
      companyId: input.companyId,
      signals: input.signals,
      supabase: input.supabase,
      useAi: input.useAi ?? true,
    });

    await applyClassificationResult(input.supabase, {
      organizationId: input.organizationId,
      companyId: input.companyId,
      result,
      source: input.source,
      actorUserId: input.actorUserId ?? null,
    });
  } catch {
    // Non-blocking for scrape/enrichment pipelines.
  }
}
