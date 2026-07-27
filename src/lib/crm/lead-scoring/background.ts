/**
 * Background recalculation hook (non-throwing).
 */

import { applyLeadScoringResult } from "@/lib/crm/lead-scoring/apply";
import { generateLeadScore } from "@/lib/crm/lead-scoring/generate";
import { ensureLeadScoringSettings } from "@/lib/crm/lead-scoring/settings";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

/** Avoid duplicate calc within a short window (fingerprint by lead + hour). */
const recentFingerprints = new Map<string, number>();

function fingerprint(orgId: string, leadId: string) {
  const hour = Math.floor(Date.now() / (60 * 60 * 1000));
  return `${orgId}:${leadId}:${hour}`;
}

export async function maybeRecalculateLeadScoreInBackground(
  supabase: Client,
  organizationId: string,
  leadId: string,
  actorUserId?: string | null,
): Promise<void> {
  try {
    const key = fingerprint(organizationId, leadId);
    if (recentFingerprints.has(key)) return;
    recentFingerprints.set(key, Date.now());

    const settings = await ensureLeadScoringSettings(organizationId);
    if (!settings.enabled) return;

    const { result, companyId } = await generateLeadScore({
      organizationId,
      leadId,
      supabase,
      settings,
    });
    await applyLeadScoringResult(supabase, {
      organizationId,
      leadId,
      companyId,
      result,
      source: "crm",
      actorUserId: actorUserId ?? null,
      reason: "background_recalculate",
    });
  } catch {
    // never break caller flows
  }
}
