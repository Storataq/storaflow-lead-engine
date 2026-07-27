/**
 * Phase 25G — Executive Analytics types.
 */

import type { CurrencyBucket, TrendResult } from "@/lib/crm/executive-analytics/calculations";
import type { ExecDateRangeKey } from "@/lib/crm/executive-analytics/date-range";
import type { FunnelStepMetric } from "@/lib/crm/executive-analytics/calculations";

export type AttentionPriority = "critical" | "high" | "medium" | "low";

export type DataAvailability =
  | "live"
  | "partial"
  | "unavailable"
  | "empty";

export type ExecutiveFilters = {
  dateRange: ExecDateRangeKey;
  customFrom: string | null;
  customTo: string | null;
  ownerUserId: string | null;
  pipelineId: string | null;
  campaignId: string | null;
  companyCategory: string | null;
  industry: string | null;
  country: string | null;
  region: string | null;
  leadClassification: string | null;
  leadScoreMin: number | null;
  leadScoreMax: number | null;
  dealStatus: string | null;
  currency: string | null;
};

export type KpiCardMetric = {
  key: string;
  label: string;
  value: string;
  rawValue: number | null;
  tooltip: string;
  href: string | null;
  trend: TrendResult;
  status: "good" | "warn" | "neutral";
  currency?: string | null;
  unavailableReason?: string | null;
};

export type AttentionItem = {
  id: string;
  title: string;
  description: string;
  priority: AttentionPriority;
  href: string | null;
  count?: number;
};

export type RecommendationItem = {
  id: string;
  title: string;
  rationale: string;
  href: string | null;
};

export type GroundedSummary = {
  periodLabel: string;
  generatedAt: string;
  mainDevelopments: string[];
  positiveSignals: string[];
  risks: string[];
  opportunities: string[];
  recommendedActions: string[];
  facts: string[];
  suggestions: string[];
  unavailableNotes: string[];
  isModelGenerated: false;
};

export type NamedCount = {
  key: string;
  label: string;
  count: number;
  href?: string | null;
};

export type ExecutiveAnalyticsBundle = {
  generatedAt: string;
  organizationId: string;
  organizationName: string;
  rangeLabel: string;
  filters: ExecutiveFilters;
  role: {
    canViewOrgRevenue: boolean;
    canManageReports: boolean;
    canExport: boolean;
  };
  availability: Record<string, DataAvailability>;
  notices: string[];
  kpis: KpiCardMetric[];
  revenue: {
    pipelineByCurrency: CurrencyBucket[];
    weightedByCurrency: CurrencyBucket[];
    wonByCurrency: CurrencyBucket[];
    lostByCurrency: CurrencyBucket[];
    dealsByStage: Array<{
      stageId: string;
      stageName: string;
      count: number;
      valueByCurrency: CurrencyBucket[];
    }>;
    openDeals: number;
    wonDeals: number;
    lostDeals: number;
    winRate: number | null;
    averageDealSizeByCurrency: CurrencyBucket[];
    averageSalesCycleDays: number | null;
    multiCurrency: boolean;
  };
  funnels: {
    sales: FunnelStepMetric[];
    email: FunnelStepMetric[];
    salesOverallConversion: number | null;
    emailOverallConversion: number | null;
  };
  leadQuality: {
    distribution: NamedCount[];
    averageScore: number | null;
    hotCount: number;
    veryHotCount: number;
    scoredCount: number;
    fastestImproving: Array<{
      id: string;
      label: string;
      score: number;
      delta: number;
      href: string;
    }>;
    highestRisk: Array<{
      id: string;
      label: string;
      risk: number;
      href: string;
    }>;
    highestOpportunity: Array<{
      id: string;
      label: string;
      band: string;
      href: string;
    }>;
    byIndustry: NamedCount[];
    byCountry: NamedCount[];
  };
  intelligence: {
    decisionMakers: number;
    contactsMissingEmail: number;
    contactsMissingRole: number;
    companiesWithoutWebsite: number | null;
    companiesWithoutContacts: number | null;
    notes: string[];
  };
  campaigns: {
    active: number;
    completed: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    replied: number;
    bounced: number;
    unsubscribed: number;
    spamComplaints: number;
    openRate: number | null;
    replyRate: number | null;
    bounceRate: number | null;
    privacyNote: string | null;
    topCampaigns: Array<{
      id: string;
      name: string;
      sent: number;
      openRate: number | null;
      href: string;
    }>;
  };
  automations: {
    active: number;
    executionsToday: number;
    successfulToday: number;
    failedToday: number;
    successRate: number | null;
    averageDurationMs: number | null;
    mostUsed: Array<{ id: string; name: string; count: number; href: string }>;
    mostFailing: Array<{ id: string; name: string; count: number; href: string }>;
  };
  geo: {
    companiesByCountry: NamedCount[];
    leadsByCountry: NamedCount[];
    dealsByCountry: NamedCount[];
  };
  industry: {
    companiesByCategory: NamedCount[];
    leadsByIndustry: NamedCount[];
    avgScoreByIndustry: Array<{ key: string; label: string; avg: number; count: number }>;
  };
  sources: {
    rows: Array<{
      key: string;
      label: string;
      leads: number;
      note: string;
    }>;
    attributionAvailable: boolean;
  };
  activity: {
    recent: Array<{
      id: string;
      title: string;
      module: string;
      timestamp: string;
      href: string | null;
    }>;
    overdueTasks: number;
    staleLeads: number;
  };
  attention: AttentionItem[];
  recommendations: RecommendationItem[];
  aiSummary: GroundedSummary;
  reports: Array<{
    id: string;
    name: string;
    isFavorite: boolean;
    isDefault: boolean;
    updatedAt: string;
  }>;
};
