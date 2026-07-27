/**
 * Non-throwing helper for future enrichment/scheduled pipelines.
 */

import {
  applyIntelligenceResult,
} from "@/lib/companies/intelligence/apply";
import { generateCompanyIntelligence } from "@/lib/companies/intelligence/generate";
import type { IntelligenceSource } from "@/lib/companies/intelligence/constants";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

export async function runIntelligenceInBackground(input: {
  organizationId: string;
  companyId: string;
  supabase: Client;
  source?: IntelligenceSource;
  useAi?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const started = Date.now();
    const { result } = await generateCompanyIntelligence({
      organizationId: input.organizationId,
      companyId: input.companyId,
      supabase: input.supabase,
      useAi: input.useAi ?? true,
    });
    await applyIntelligenceResult(input.supabase, {
      organizationId: input.organizationId,
      companyId: input.companyId,
      result,
      source: input.source ?? "enrichment",
      durationMs: Date.now() - started,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Intelligence failed",
    };
  }
}
