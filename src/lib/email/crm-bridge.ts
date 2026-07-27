/**
 * CRM integration points for the Automated Email Engine.
 * Foundation only — does not mutate pipeline or send mail.
 */

import { toCampaignRecipientPreview } from "@/lib/crm/funnel-activation/email-engine-bridge";
import { evaluateRecipientEnrollment } from "@/lib/email/recipient";
import type { CampaignRecipientPreview } from "@/lib/crm/funnel-activation/types";

export { toCampaignRecipientPreview };

export const CRM_EMAIL_INTEGRATION_POINTS = [
  {
    key: "campaign_ready_gate",
    description:
      "Only approved campaign_readiness rows may become email recipients in a later phase",
  },
  {
    key: "exclusion_list",
    description:
      "Map exclusion_list + campaign_readiness.suppression_reason into email_suppressions",
  },
  {
    key: "lead_activity",
    description:
      "Future send/open/reply events write organization-scoped activity_events on crm_lead",
  },
  {
    key: "pipeline_ceiling",
    description:
      "Do not auto-advance past outreach-ready until user/email activity is confirmed",
  },
  {
    key: "tasks_notes",
    description:
      "Human override remains via CRM tasks/notes; engine must not silently contact",
  },
] as const;

export function previewEnrollmentFromCampaignReady(
  preview: CampaignRecipientPreview,
) {
  return evaluateRecipientEnrollment({ preview });
}
