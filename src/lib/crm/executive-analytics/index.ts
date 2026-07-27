/**
 * Phase 25G — Executive Analytics public surface.
 * Note: import build/queries only from Server Components — not from client barrels.
 */

export {
  groupByCurrency,
  comparePeriods,
  buildFunnelMetrics,
  overallFunnelConversion,
  distributionCounts,
  average,
} from "@/lib/crm/executive-analytics/calculations";

export {
  EXEC_DATE_RANGES,
  EXEC_DATE_RANGE_OPTIONS,
  resolveExecDateRange,
  inDateRange,
} from "@/lib/crm/executive-analytics/date-range";

export {
  METRIC_GLOSSARY,
  ATTENTION_PRIORITY_LABELS,
  DEFAULT_EXEC_FILTERS,
  EXEC_FILTER_STORAGE_KEY,
} from "@/lib/crm/executive-analytics/constants";

export { buildGroundedExecutiveSummary } from "@/lib/crm/executive-analytics/summary";

export type {
  ExecutiveAnalyticsBundle,
  ExecutiveFilters,
  KpiCardMetric,
  AttentionItem,
  GroundedSummary,
} from "@/lib/crm/executive-analytics/types";
