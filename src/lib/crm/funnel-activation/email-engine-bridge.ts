/**
 * Bridge payload for the future Automated Email Engine (no send).
 */

import type { CampaignRecipientPreview } from "@/lib/crm/funnel-activation/types";
import type { Database } from "@/types/supabase";

export function toCampaignRecipientPreview(input: {
  lead: Pick<
    Database["public"]["Tables"]["crm_leads"]["Row"],
    "id" | "company_id" | "owner_user_id"
  >;
  readiness: Pick<
    Database["public"]["Tables"]["campaign_readiness"]["Row"],
    | "contact_id"
    | "preferred_email"
    | "preferred_name"
    | "qualification_score"
    | "opportunity_score"
    | "sales_priority"
    | "approval_status"
    | "suppression_reason"
    | "status"
    | "reasons"
    | "personalization_json"
  >;
}): CampaignRecipientPreview {
  const personalization =
    input.readiness.personalization_json &&
    typeof input.readiness.personalization_json === "object" &&
    !Array.isArray(input.readiness.personalization_json)
      ? (input.readiness.personalization_json as Record<string, string | null>)
      : {};

  return {
    leadId: input.lead.id,
    companyId: input.lead.company_id,
    contactId: input.readiness.contact_id,
    preferredEmail: input.readiness.preferred_email,
    preferredName: input.readiness.preferred_name,
    personalization,
    qualificationScore: input.readiness.qualification_score,
    opportunityScore: input.readiness.opportunity_score,
    priority: input.readiness.sales_priority as CampaignRecipientPreview["priority"],
    ownerUserId: input.lead.owner_user_id,
    approvalStatus:
      input.readiness.approval_status as CampaignRecipientPreview["approvalStatus"],
    suppressionStatus: input.readiness.suppression_reason,
    readinessStatus:
      input.readiness.status as CampaignRecipientPreview["readinessStatus"],
    readinessReasons: input.readiness.reasons ?? [],
  };
}

export const EMAIL_ENGINE_FUNNEL_HOOKS = [
  "campaign_readiness.status === ready && approval_status === approved",
  "preferred_email + personalization_json → recipient merge fields",
  "exclusion_list / suppression_reason must block enrollment",
  "funnel stops at outreach-ready — send lives in Email Engine project",
] as const;
