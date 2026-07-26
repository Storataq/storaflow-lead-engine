export type {
  ActivityEvent,
  ConversionMetric,
  DashboardFilters,
  DateRangeKey,
  DealAnalytics,
  DrawerKind,
  ExecutiveAlert,
  ExecutiveDashboardData,
  ExecutiveKpi,
  FunnelStageMetric,
  PipelineStageMetric,
  RankedItem,
  RevenueForecast,
  SourcePerformanceMetric,
} from "@/lib/crm/executive-dashboard/types";

export {
  buildExecutiveDashboardData,
  EXECUTIVE_DASHBOARD_NOTICE,
  resolveDateRange,
} from "@/lib/crm/executive-dashboard/analytics";

export {
  DATE_RANGE_OPTIONS,
  FUNNEL_STAGES,
  PIPELINE_OVERVIEW_STAGES,
  SOURCE_IDS,
} from "@/lib/crm/executive-dashboard/mock-data";
