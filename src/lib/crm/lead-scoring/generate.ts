/**
 * Orchestrate signal collection → weighted score.
 */

import { computeLeadScore } from "@/lib/crm/lead-scoring/score";
import { collectLeadScoringSignals } from "@/lib/crm/lead-scoring/signals";
import {
  ensureLeadScoringSettings,
  type LeadScoringSettings,
} from "@/lib/crm/lead-scoring/settings";
import type { LeadScoringResult } from "@/lib/crm/lead-scoring/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

export async function generateLeadScore(input: {
  organizationId: string;
  leadId: string;
  supabase: Client;
  settings?: LeadScoringSettings;
}): Promise<{ result: LeadScoringResult; companyId: string | null }> {
  const settings =
    input.settings ?? (await ensureLeadScoringSettings(input.organizationId));
  const signals = await collectLeadScoringSignals(
    input.supabase,
    input.organizationId,
    input.leadId,
  );
  const result = computeLeadScore(signals, {
    weights: settings.weights,
    classificationRanges: settings.classificationRanges,
  });
  return { result, companyId: signals.companyId };
}
