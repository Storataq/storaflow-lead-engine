/**
 * Executive CRM Dashboard — typed contracts (Phase 19).
 */

export type DateRangeKey =
  | "today"
  | "7d"
  | "30d"
  | "90d"
  | "year"
  | "custom";

export type ExecutiveAlertSeverity =
  | "critical"
  | "warning"
  | "information"
  | "success";

export type DrawerKind =
  | "hot_leads"
  | "overdue_tasks"
  | "strategic_opportunities"
  | "stalled_deals"
  | "campaign_ready"
  | "source_detail"
  | "pipeline_stage"
  | null;

export interface DashboardFilters {
  dateRange: DateRangeKey;
  customFrom: string | null;
  customTo: string | null;
  source: string;
  qualification: string;
  opportunityClass: string;
  pipelineStage: string;
  dealStatus: string;
  priority: string;
  outreachReadiness: string;
  industry: string;
  channel: string;
}

export interface ExecutiveTrend {
  percentage: number;
  direction: "up" | "down" | "flat";
  previousLabel: string;
}

export interface ExecutiveKpi {
  key: string;
  label: string;
  value: string;
  rawValue: number;
  tooltip: string;
  trend: ExecutiveTrend;
  status?: "good" | "warn" | "neutral";
  drawer?: DrawerKind;
}

export interface FunnelStageMetric {
  id: string;
  label: string;
  count: number;
  percentOfTotal: number;
  conversionFromPrevious: number | null;
  dropOffCount: number;
  dropOffPercent: number;
}

export interface PipelineStageMetric {
  id: string;
  label: string;
  match: string;
  count: number;
  totalValue: number;
  averageValue: number;
  conversionProbability: number;
  averageAgeDays: number;
  stalledCount: number;
}

export interface ConversionMetric {
  id: string;
  label: string;
  rate: number;
  previousRate: number;
  difference: number;
  trend: ExecutiveTrend;
  explanation: string;
}

export interface SourcePerformanceMetric {
  id: string;
  name: string;
  leadsDiscovered: number;
  leadsQualified: number;
  opportunitiesCreated: number;
  dealsCreated: number;
  conversionRate: number;
  averageQualificationScore: number;
  averageOpportunityScore: number;
  estimatedValue: number;
  dataCompleteness: number;
  sourceConfidence: number;
  simulated: true;
}

export interface QualificationDistributionItem {
  key: string;
  label: string;
  count: number;
  percent: number;
}

export interface DealAnalytics {
  totalDeals: number;
  openDeals: number;
  wonDeals: number;
  lostDeals: number;
  winRate: number;
  averageDealValue: number;
  averageSalesCycleDays: number;
  totalWonRevenue: number;
  expectedRevenue: number;
  stalledDeals: number;
  byStatus: { status: string; count: number; value: number }[];
}

export interface RevenueForecast {
  currentPipelineValue: number;
  weightedPipelineValue: number;
  expectedThisMonth: number;
  expectedNextMonth: number;
  expectedThisQuarter: number;
  wonRevenue: number;
  atRiskRevenue: number;
  monthly: { month: string; estimate: number }[];
  isEstimate: true;
}

export interface OutreachReadinessMetric {
  readyEmail: number;
  readyPhone: number;
  readyManual: number;
  needsEnrichment: number;
  blocked: number;
  excluded: number;
  missingRequirements: { key: string; label: string; count: number }[];
}

export interface TaskMetric {
  open: number;
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
  completed: number;
  followUpsRequired: number;
  leadsWithoutFollowUp: number;
  highPriority: number;
}

export interface TaskListItem {
  id: string;
  title: string;
  companyName: string | null;
  dueAt: string | null;
  priority: string;
  ownerLabel: string;
  status: string;
  leadId: string | null;
}

export interface ExecutiveAlert {
  id: string;
  title: string;
  description: string;
  severity: ExecutiveAlertSeverity;
  relatedLabel: string;
  suggestedAction: string;
  timestamp: string;
  drawer?: DrawerKind;
}

export interface ActivityEvent {
  id: string;
  title: string;
  companyName: string | null;
  actor: string;
  timestamp: string;
  module: string;
  href: string | null;
}

export interface ExecutiveSummary {
  paragraphs: string[];
  generatedAt: string;
  isAiGenerated: false;
}

export interface RankedItem {
  id: string;
  label: string;
  value: string;
  secondary?: string;
  href?: string | null;
}

export interface TimeSeriesPoint {
  label: string;
  value: number;
}

export interface ExecutiveDashboardData {
  generatedAt: string;
  rangeLabel: string;
  kpis: ExecutiveKpi[];
  funnel: FunnelStageMetric[];
  pipeline: PipelineStageMetric[];
  conversions: ConversionMetric[];
  conversionHighlights: {
    bestStage: string;
    weakestStage: string;
    largestDropOff: string;
    averageDurationDays: number;
  };
  sources: SourcePerformanceMetric[];
  qualification: {
    hot: number;
    warm: number;
    cold: number;
    unqualified: number;
    averageQualificationScore: number;
    averageOpportunityScore: number;
    averageOutreachReadiness: number;
    averageDataConfidence: number;
    classDistribution: QualificationDistributionItem[];
    priorityDistribution: QualificationDistributionItem[];
    opportunityDistribution: QualificationDistributionItem[];
    actionDistribution: QualificationDistributionItem[];
    channelDistribution: QualificationDistributionItem[];
  };
  opportunities: {
    strategic: number;
    highPotential: number;
    promising: number;
    nurture: number;
    lowPotential: number;
    insufficientData: number;
    cards: RankedItem[];
  };
  deals: DealAnalytics;
  revenue: RevenueForecast;
  outreach: OutreachReadinessMetric;
  tasks: TaskMetric;
  taskList: TaskListItem[];
  activity: ActivityEvent[];
  alerts: ExecutiveAlert[];
  topPerformers: {
    highestScoringLeads: RankedItem[];
    highestValueOpportunities: RankedItem[];
    bestConvertingSources: RankedItem[];
    mostActivePipelineStages: RankedItem[];
    highestExpectedValueDeals: RankedItem[];
    mostCompleteProfiles: RankedItem[];
  };
  series: {
    leadsOverTime: TimeSeriesPoint[];
    opportunitiesOverTime: TimeSeriesPoint[];
    pipelineValueByStage: TimeSeriesPoint[];
  };
  summary: ExecutiveSummary;
  drawerLists: Record<
    Exclude<DrawerKind, null>,
    { id: string; title: string; subtitle: string; href: string | null }[]
  >;
}
