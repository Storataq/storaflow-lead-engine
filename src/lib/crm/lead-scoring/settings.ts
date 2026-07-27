/**
 * Org lead scoring settings (weights / thresholds).
 */

import {
  DEFAULT_CATEGORY_WEIGHTS,
  DEFAULT_CLASSIFICATION_RANGES,
  type ScoringCategory,
} from "@/lib/crm/lead-scoring/constants";
import type { Json } from "@/types/supabase";
import { createClient } from "@/lib/supabase/server";

export type LeadScoringSettings = {
  weights: Record<ScoringCategory, number>;
  classificationRanges: typeof DEFAULT_CLASSIFICATION_RANGES;
  thresholds: Record<string, number>;
  automationTriggers: Record<string, boolean>;
  enabled: boolean;
};

export function defaultScoringSettings(): LeadScoringSettings {
  return {
    weights: { ...DEFAULT_CATEGORY_WEIGHTS },
    classificationRanges: { ...DEFAULT_CLASSIFICATION_RANGES },
    thresholds: {
      scoreIncreaseAlert: 8,
      scoreDecreaseAlert: 8,
      hotMin: DEFAULT_CLASSIFICATION_RANGES.hotMin,
      riskAlert: 60,
    },
    automationTriggers: {
      enrollCampaignOnHot: false,
      createTaskOnHot: false,
      assignOwnerOnHot: false,
      notifyOnScoreChange: true,
      movePipelineOnHot: false,
    },
    enabled: true,
  };
}

export async function ensureLeadScoringSettings(
  organizationId: string,
): Promise<LeadScoringSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lead_scoring_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!data) {
    const defaults = defaultScoringSettings();
    await supabase.from("lead_scoring_settings").upsert({
      organization_id: organizationId,
      weights_json: defaults.weights as unknown as Json,
      classification_ranges_json:
        defaults.classificationRanges as unknown as Json,
      thresholds_json: defaults.thresholds as unknown as Json,
      automation_triggers_json:
        defaults.automationTriggers as unknown as Json,
      enabled: true,
    });
    return defaults;
  }

  const defaults = defaultScoringSettings();
  const weights =
    data.weights_json &&
    typeof data.weights_json === "object" &&
    !Array.isArray(data.weights_json)
      ? { ...defaults.weights, ...(data.weights_json as object) }
      : defaults.weights;
  const classificationRanges =
    data.classification_ranges_json &&
    typeof data.classification_ranges_json === "object" &&
    !Array.isArray(data.classification_ranges_json)
      ? {
          ...defaults.classificationRanges,
          ...(data.classification_ranges_json as object),
        }
      : defaults.classificationRanges;
  const thresholds =
    data.thresholds_json &&
    typeof data.thresholds_json === "object" &&
    !Array.isArray(data.thresholds_json)
      ? { ...defaults.thresholds, ...(data.thresholds_json as object) }
      : defaults.thresholds;
  const automationTriggers =
    data.automation_triggers_json &&
    typeof data.automation_triggers_json === "object" &&
    !Array.isArray(data.automation_triggers_json)
      ? {
          ...defaults.automationTriggers,
          ...(data.automation_triggers_json as object),
        }
      : defaults.automationTriggers;

  return {
    weights: weights as Record<ScoringCategory, number>,
    classificationRanges:
      classificationRanges as typeof DEFAULT_CLASSIFICATION_RANGES,
    thresholds: thresholds as Record<string, number>,
    automationTriggers: automationTriggers as Record<string, boolean>,
    enabled: data.enabled,
  };
}
