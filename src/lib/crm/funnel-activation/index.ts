export type * from "@/lib/crm/funnel-activation/types";
export {
  DEFAULT_FUNNEL_POLICY,
  FUNNEL_COMPLIANCE_NOTICE,
} from "@/lib/crm/funnel-activation/types";
export { getFunnelActivationPolicy } from "@/lib/crm/funnel-activation/policy";
export {
  evaluateCompanyEligibility,
  evaluateContactEligibility,
} from "@/lib/crm/funnel-activation/eligibility";
export { calculateCampaignReadiness } from "@/lib/crm/funnel-activation/campaign-readiness";
export { runFunnelActivation } from "@/lib/crm/funnel-activation/orchestrator";
export {
  activateFunnelForCompanyAction,
  activateFunnelForLeadAction,
  activateFunnelBulkAction,
  retryFunnelActivationAction,
  updateCampaignApprovalAction,
} from "@/lib/crm/funnel-activation/actions";
export {
  listCampaignReady,
  getCampaignReadinessForLead,
  getLatestActivationForCompany,
  getFunnelDashboardStats,
} from "@/lib/crm/funnel-activation/queries";
export {
  toCampaignRecipientPreview,
  EMAIL_ENGINE_FUNNEL_HOOKS,
} from "@/lib/crm/funnel-activation/email-engine-bridge";
