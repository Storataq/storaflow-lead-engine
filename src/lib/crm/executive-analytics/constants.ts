/**
 * Phase 25G — metric glossary + UI constants.
 */

export const ATTENTION_PRIORITY_LABELS = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
} as const;

export const METRIC_GLOSSARY = [
  {
    name: "Total companies",
    definition: "Count of companies in the active organization.",
    calculation: "COUNT(companies) WHERE organization_id = current org",
    included: "All org companies visible via RLS",
    excluded: "Other organizations",
    dateField: "created_at (for New companies KPI)",
  },
  {
    name: "Pipeline value",
    definition: "Sum of open deal values, grouped by currency.",
    calculation: "SUM(value) WHERE status = open, GROUP BY currency",
    included: "Open deals",
    excluded: "Won/lost deals; cross-currency totals",
    dateField: "created_at / expected_close_date for forecasts",
  },
  {
    name: "Weighted pipeline value",
    definition: "Open deal value × effective win probability, by currency.",
    calculation: "SUM(value * probability) GROUP BY currency",
    included: "Open deals with stage or deal probability",
    excluded: "Cross-currency combined totals",
    dateField: "n/a",
  },
  {
    name: "Won revenue",
    definition: "Sum of won deal values in the selected period, by currency.",
    calculation: "SUM(value) WHERE status = won AND closed_at in range",
    included: "Won deals in range",
    excluded: "Open/lost; FX conversion",
    dateField: "closed_at",
  },
  {
    name: "Conversion rate",
    definition: "Won deals / (won + lost) among closed deals.",
    calculation: "won / (won + lost) * 100",
    included: "Closed deals",
    excluded: "Open deals",
    dateField: "closed_at when filtered",
  },
  {
    name: "Hot leads",
    definition: "Leads with AI score classification hot or very_hot.",
    calculation: "COUNT WHERE score_classification IN (hot, very_hot)",
    included: "Scored leads",
    excluded: "Unscored leads",
    dateField: "scored_at",
  },
  {
    name: "Reply rate",
    definition: "Email replies / delivered (or sent fallback).",
    calculation: "From email analytics service rates",
    included: "Tracked deliveries in range",
    excluded: "Privacy-protected opens treated as unavailable, not zero",
    dateField: "delivery/engagement timestamps",
  },
  {
    name: "Automation success rate",
    definition: "Completed runs / (completed + failed) today.",
    calculation: "completedToday / (completedToday + failedToday)",
    included: "crm_automation_runs for current org",
    excluded: "Pending/running (not counted as success or fail)",
    dateField: "created_at",
  },
] as const;

export const DEFAULT_EXEC_FILTERS = {
  dateRange: "last_30_days" as const,
  customFrom: null,
  customTo: null,
  ownerUserId: null,
  pipelineId: null,
  campaignId: null,
  companyCategory: null,
  industry: null,
  country: null,
  region: null,
  leadClassification: null,
  leadScoreMin: null,
  leadScoreMax: null,
  dealStatus: null,
  currency: null,
};

export const EXEC_FILTER_STORAGE_KEY = "storaflow.exec.filters.v1";
