/**
 * Resolve organization funnel activation policy (defaults + settings columns).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  DEFAULT_FUNNEL_POLICY,
  type FunnelActivationPolicy,
} from "@/lib/crm/funnel-activation/types";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

export async function getFunnelActivationPolicy(
  supabase: Client,
  organizationId: string,
): Promise<FunnelActivationPolicy> {
  try {
    const { data, error } = await supabase
      .from("organization_settings")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error || !data) return { ...DEFAULT_FUNNEL_POLICY };

    return {
      mode: data.funnel_activation_mode ?? DEFAULT_FUNNEL_POLICY.mode,
      qualificationThreshold:
        data.qualification_threshold ??
        DEFAULT_FUNNEL_POLICY.qualificationThreshold,
      opportunityThreshold:
        data.opportunity_threshold ?? DEFAULT_FUNNEL_POLICY.opportunityThreshold,
      autoDealMode: data.auto_deal_mode ?? DEFAULT_FUNNEL_POLICY.autoDealMode,
      autoCreateTasks:
        data.auto_create_tasks ?? DEFAULT_FUNNEL_POLICY.autoCreateTasks,
      allowRoleEmails:
        data.allow_role_emails ?? DEFAULT_FUNNEL_POLICY.allowRoleEmails,
      requireNamedContact:
        data.require_named_contact ?? DEFAULT_FUNNEL_POLICY.requireNamedContact,
      requireManualApproval:
        data.require_manual_approval ??
        DEFAULT_FUNNEL_POLICY.requireManualApproval,
      skipRecentActivationHours:
        data.skip_recent_activation_hours ??
        DEFAULT_FUNNEL_POLICY.skipRecentActivationHours,
      defaultPipelineId:
        data.default_funnel_pipeline_id ??
        DEFAULT_FUNNEL_POLICY.defaultPipelineId,
    };
  } catch {
    return { ...DEFAULT_FUNNEL_POLICY };
  }
}
