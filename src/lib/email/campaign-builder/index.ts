/**
 * Phase 25D — AI Email Campaign Builder public surface.
 */

export {
  BUILDER_MODES,
  BUILDER_BLOCK_TYPES,
  BUILDER_BLOCK_LABELS,
  BUILDER_TO_SEQUENCE_STEP,
  EXTENDED_CAMPAIGN_TYPES,
  EXTENDED_CAMPAIGN_TYPE_LABELS,
  MERGE_FIELDS,
  AUTOMATION_TRIGGERS,
  WAIT_UNITS,
  TEMPLATE_LIBRARY_CATEGORIES,
  AI_RECOMMENDATION_EXAMPLES,
  type BuilderMode,
  type BuilderBlockType,
  type ExtendedCampaignType,
} from "@/lib/email/campaign-builder/constants";

export {
  emptyWorkflowGraph,
  graphFromSequenceSteps,
  parseWorkflowGraph,
} from "@/lib/email/campaign-builder/graph";

export {
  scoreSubjectLine,
  suggestSubjectLines,
} from "@/lib/email/campaign-builder/scores";

export { buildCampaignRecommendations } from "@/lib/email/campaign-builder/recommendations";

export type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowGraph,
  AiBrief,
  CalendarMetadata,
  SubjectScoreBreakdown,
  CampaignRecommendation,
} from "@/lib/email/campaign-builder/types";

export {
  parseAiBrief,
  parseCalendarMetadata,
  getCampaignWorkflowGraph,
  listCampaignAbTests,
  listSubjectScores,
  listChannelPlans,
  listCampaignsForCalendar,
  filterBuilderCampaigns,
  buildCampaignPerformanceWidgets,
  type BuilderCampaignFilters,
} from "@/lib/email/campaign-builder/queries";

export {
  saveCampaignWorkflowAction,
  createAiBuilderCampaignAction,
  optimizeSubjectsAction,
  createAbTestAction,
  setCampaignBuilderModeAction,
} from "@/lib/email/campaign-builder/actions";
