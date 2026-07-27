export * from "@/lib/crm/contact-intelligence/constants";
export type {
  ContactAiSummary,
  ContactBadgeItem,
  ContactHealthBlock,
  ContactIntelligenceListFilters,
  ContactIntelligenceProfileRow,
  ContactIntelligenceResult,
  ContactIntelligenceRunRow,
  ContactProfileBlock,
  ContactQualityBlock,
  DecisionMakerBlock,
  InsightItem,
  RecommendationItem,
  TimelineItem,
} from "@/lib/crm/contact-intelligence/types";
export { refreshContactIntelligenceAction } from "@/lib/crm/contact-intelligence/actions";
export {
  getContactIntelligenceDashboard,
  getContactIntelligenceProfile,
  getCrmLeadContact,
  getLatestContactIntelligenceRun,
  listIntelligentContacts,
} from "@/lib/crm/contact-intelligence/queries";
export { generateContactIntelligence } from "@/lib/crm/contact-intelligence/generate";
export { runContactIntelligenceInBackground } from "@/lib/crm/contact-intelligence/background";
