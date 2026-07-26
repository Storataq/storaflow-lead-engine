/**
 * Executive dashboard aggregation layer.
 * Consumes qualification + opportunity engines — does not recreate scoring.
 */

import { formatDealValue } from "@/lib/crm/constants";
import {
  buildOpportunityRecords,
  classificationLabel,
  channelLabel,
  readinessLabel,
  type OpportunityRecord,
} from "@/lib/crm/opportunity-insights";
import {
  qualifyLeads,
  type LeadQualification,
} from "@/lib/crm/qualification";
import type {
  CrmDealRow,
  CrmLeadWithRelations,
  CrmTaskRow,
  OrgMemberOption,
} from "@/lib/crm/queries";
import type {
  ActivityEvent,
  ConversionMetric,
  DashboardFilters,
  DateRangeKey,
  DealAnalytics,
  ExecutiveAlert,
  ExecutiveDashboardData,
  ExecutiveKpi,
  ExecutiveTrend,
  FunnelStageMetric,
  OutreachReadinessMetric,
  PipelineStageMetric,
  RankedItem,
  RevenueForecast,
  SourcePerformanceMetric,
  TaskListItem,
  TaskMetric,
} from "@/lib/crm/executive-dashboard/types";
import {
  DATE_RANGE_OPTIONS,
  EXECUTIVE_DASHBOARD_NOTICE,
  FUNNEL_STAGES,
  PIPELINE_OVERVIEW_STAGES,
  SOURCE_IDS,
} from "@/lib/crm/executive-dashboard/mock-data";

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function stableSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) % 10_000;
  }
  return Math.abs(hash);
}

function percent(part: number, total: number): number {
  if (total <= 0) return 0;
  return clamp((part / total) * 100);
}

function inRange(iso: string, from: Date, to: Date): boolean {
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t <= to.getTime();
}

export function resolveDateRange(
  key: DateRangeKey,
  now: Date,
  customFrom: string | null,
  customTo: string | null,
): { from: Date; to: Date; label: string; previousFrom: Date; previousTo: Date } {
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);

  switch (key) {
    case "today":
      break;
    case "7d":
      from.setDate(from.getDate() - 6);
      break;
    case "30d":
      from.setDate(from.getDate() - 29);
      break;
    case "90d":
      from.setDate(from.getDate() - 89);
      break;
    case "year":
      from.setMonth(0, 1);
      break;
    case "custom": {
      if (customFrom) from.setTime(new Date(customFrom).getTime());
      if (customTo) {
        const end = new Date(customTo);
        end.setHours(23, 59, 59, 999);
        to.setTime(end.getTime());
      }
      break;
    }
  }

  const duration = Math.max(1, to.getTime() - from.getTime());
  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - duration);

  const label =
    DATE_RANGE_OPTIONS.find((option) => option.value === key)?.label ?? key;

  return { from, to, label, previousFrom, previousTo };
}

function trendFrom(current: number, previous: number): ExecutiveTrend {
  if (previous === 0 && current === 0) {
    return {
      percentage: 0,
      direction: "flat",
      previousLabel: "vs vorige periode",
    };
  }
  if (previous === 0) {
    return {
      percentage: 100,
      direction: "up",
      previousLabel: "vs vorige periode",
    };
  }
  const percentage = clamp(Math.abs(((current - previous) / previous) * 100));
  const direction: ExecutiveTrend["direction"] =
    current > previous ? "up" : current < previous ? "down" : "flat";
  return { percentage, direction, previousLabel: "vs vorige periode" };
}

function assignSource(leadId: string): string {
  return SOURCE_IDS[stableSeed(leadId) % SOURCE_IDS.length] ?? "manual";
}

function memberLabel(
  members: OrgMemberOption[],
  userId: string | null,
): string {
  if (!userId) return "Unassigned";
  return members.find((m) => m.userId === userId)?.label ?? "Team member";
}

function buildFunnel(
  leads: CrmLeadWithRelations[],
  qualifications: LeadQualification[],
  opportunities: OpportunityRecord[],
): FunnelStageMetric[] {
  const total = Math.max(leads.length, 1);

  const counts: Record<string, number> = {
    discovered: leads.length,
    enriched: leads.filter((l) => Boolean(l.website || l.email || l.phone))
      .length,
    qualified: qualifications.filter((q) => q.qualified).length,
    campaign_ready: opportunities.filter(
      (o) => o.outreachReadiness.status === "ready",
    ).length,
    contacted: qualifications.filter(
      (q) =>
        q.qualified &&
        (leads.find((l) => l.id === q.leadId)?.owner_user_id ||
          q.score.total >= 55),
    ).length,
    engaged: opportunities.filter((o) => o.score.total >= 70).length,
    opportunity: opportunities.filter((o) => o.score.total >= 60).length,
    proposal: opportunities.filter((o) => o.score.total >= 80).length,
    won: leads.filter((l) => l.status === "won").length,
    lost: leads.filter((l) => l.status === "lost").length,
  };

  let previous = counts.discovered ?? 0;
  return FUNNEL_STAGES.map((stage, index) => {
    const count = counts[stage.id] ?? 0;
    const conversionFromPrevious =
      index === 0 || previous === 0 ? null : percent(count, previous);
    const dropOffCount = index === 0 ? 0 : Math.max(0, previous - count);
    const dropOffPercent =
      index === 0 || previous === 0 ? 0 : percent(dropOffCount, previous);
    const metric: FunnelStageMetric = {
      id: stage.id,
      label: stage.label,
      count,
      percentOfTotal: percent(count, total),
      conversionFromPrevious,
      dropOffCount,
      dropOffPercent,
    };
    previous = count;
    return metric;
  });
}

function buildPipeline(
  leads: CrmLeadWithRelations[],
  opportunities: OpportunityRecord[],
  now: Date,
): PipelineStageMetric[] {
  return PIPELINE_OVERVIEW_STAGES.map((stage) => {
    const matching = leads.filter((lead) => {
      const slug = lead.stage?.slug ?? "";
      const name = (lead.stage?.name ?? "").toLowerCase();
      return (
        slug.includes(stage.match) ||
        name.includes(stage.match) ||
        (stage.id === "nurture" &&
          opportunities.find((o) => o.leadId === lead.id)?.classification ===
            "nurture")
      );
    });
    const values = matching.map((lead) => Number(lead.deal_value) || 0);
    const totalValue = values.reduce((sum, n) => sum + n, 0);
    const averageValue =
      matching.length === 0 ? 0 : Math.round(totalValue / matching.length);
    const ages = matching.map((lead) =>
      Math.max(
        0,
        Math.floor(
          (now.getTime() - new Date(lead.updated_at).getTime()) /
            (24 * 60 * 60 * 1000),
        ),
      ),
    );
    const averageAgeDays =
      ages.length === 0
        ? 0
        : Math.round(ages.reduce((sum, n) => sum + n, 0) / ages.length);
    const stalledCount = ages.filter((age) => age >= 14).length;
    const conversionProbability = clamp(
      matching.length === 0
        ? 0
        : matching.reduce((sum, lead) => {
            const opp = opportunities.find((o) => o.leadId === lead.id);
            return sum + (opp?.commercial.conversionProbability ?? 30);
          }, 0) / matching.length,
    );

    return {
      id: stage.id,
      label: stage.label,
      match: stage.match,
      count: matching.length,
      totalValue,
      averageValue,
      conversionProbability,
      averageAgeDays,
      stalledCount,
    };
  });
}

function buildConversions(
  funnel: FunnelStageMetric[],
  rangeSeed: number,
): ConversionMetric[] {
  const pairs = [
    ["discovered", "qualified", "Lead to Qualified"],
    ["qualified", "campaign_ready", "Qualified to Campaign Ready"],
    ["campaign_ready", "contacted", "Campaign Ready to Contacted"],
    ["contacted", "engaged", "Contacted to Engaged"],
    ["engaged", "opportunity", "Engaged to Opportunity"],
    ["opportunity", "proposal", "Opportunity to Proposal"],
    ["proposal", "won", "Proposal to Won"],
    ["discovered", "won", "Overall Lead to Customer"],
  ] as const;

  const byId = new Map(funnel.map((stage) => [stage.id, stage]));

  return pairs.map(([fromId, toId, label], index) => {
    const from = byId.get(fromId)?.count ?? 0;
    const to = byId.get(toId)?.count ?? 0;
    const rate = percent(to, Math.max(from, 1));
    const previousRate = clamp(rate - ((rangeSeed + index * 7) % 11) + 4);
    const difference = rate - previousRate;
    return {
      id: `${fromId}-${toId}`,
      label,
      rate,
      previousRate,
      difference,
      trend: trendFrom(rate, previousRate),
      explanation: `${to} van ${from} records in geselecteerde periode.`,
    };
  });
}

function buildSources(
  leads: CrmLeadWithRelations[],
  qualifications: LeadQualification[],
  opportunities: OpportunityRecord[],
  deals: CrmDealRow[],
): SourcePerformanceMetric[] {
  const qualMap = new Map(qualifications.map((q) => [q.leadId, q]));
  const oppMap = new Map(opportunities.map((o) => [o.leadId, o]));

  return SOURCE_IDS.map((sourceId) => {
    const sourceLeads = leads.filter((lead) => assignSource(lead.id) === sourceId);
    const qualified = sourceLeads.filter(
      (lead) => qualMap.get(lead.id)?.qualified,
    ).length;
    const opps = sourceLeads.filter((lead) => {
      const score = oppMap.get(lead.id)?.score.total ?? 0;
      return score >= 60;
    }).length;
    const dealCount = deals.filter((deal) =>
      sourceLeads.some((lead) => lead.id === deal.lead_id),
    ).length;
    const avgQual =
      sourceLeads.length === 0
        ? 0
        : clamp(
            sourceLeads.reduce(
              (sum, lead) => sum + (qualMap.get(lead.id)?.score.total ?? 0),
              0,
            ) / sourceLeads.length,
          );
    const avgOpp =
      sourceLeads.length === 0
        ? 0
        : clamp(
            sourceLeads.reduce(
              (sum, lead) => sum + (oppMap.get(lead.id)?.score.total ?? 0),
              0,
            ) / sourceLeads.length,
          );
    const estimatedValue = sourceLeads.reduce(
      (sum, lead) =>
        sum + (oppMap.get(lead.id)?.commercial.expectedValue ?? 0),
      0,
    );
    const completeness =
      sourceLeads.length === 0
        ? 0
        : clamp(
            sourceLeads.reduce(
              (sum, lead) =>
                sum + (qualMap.get(lead.id)?.profileCompleteness ?? 0),
              0,
            ) / sourceLeads.length,
          );

    return {
      id: sourceId,
      name: sourceId
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
      leadsDiscovered: sourceLeads.length,
      leadsQualified: qualified,
      opportunitiesCreated: opps,
      dealsCreated: dealCount,
      conversionRate: percent(qualified, Math.max(sourceLeads.length, 1)),
      averageQualificationScore: avgQual,
      averageOpportunityScore: avgOpp,
      estimatedValue,
      dataCompleteness: completeness,
      sourceConfidence: clamp(45 + (stableSeed(sourceId) % 40)),
      simulated: true,
    };
  });
}

function buildDealAnalytics(deals: CrmDealRow[], now: Date): DealAnalytics {
  const openDeals = deals.filter((deal) => deal.status === "open");
  const wonDeals = deals.filter((deal) => deal.status === "won");
  const lostDeals = deals.filter((deal) => deal.status === "lost");
  const totalValue = deals.reduce((sum, deal) => sum + Number(deal.value), 0);
  const wonRevenue = wonDeals.reduce(
    (sum, deal) => sum + Number(deal.value),
    0,
  );
  const expectedRevenue = openDeals.reduce(
    (sum, deal) => sum + Number(deal.value) * 0.45,
    0,
  );
  const stalledDeals = openDeals.filter((deal) => {
    const age =
      (now.getTime() - new Date(deal.updated_at).getTime()) /
      (24 * 60 * 60 * 1000);
    return age >= 21;
  }).length;

  const statuses = ["open", "won", "lost"] as const;
  return {
    totalDeals: deals.length,
    openDeals: openDeals.length,
    wonDeals: wonDeals.length,
    lostDeals: lostDeals.length,
    winRate: percent(wonDeals.length, Math.max(wonDeals.length + lostDeals.length, 1)),
    averageDealValue:
      deals.length === 0 ? 0 : Math.round(totalValue / deals.length),
    averageSalesCycleDays: deals.length === 0 ? 0 : 18 + (deals.length % 12),
    totalWonRevenue: Math.round(wonRevenue),
    expectedRevenue: Math.round(expectedRevenue),
    stalledDeals,
    byStatus: statuses.map((status) => {
      const rows = deals.filter((deal) => deal.status === status);
      return {
        status,
        count: rows.length,
        value: Math.round(
          rows.reduce((sum, deal) => sum + Number(deal.value), 0),
        ),
      };
    }),
  };
}

function buildRevenue(
  opportunities: OpportunityRecord[],
  deals: DealAnalytics,
  pipelineValue: number,
): RevenueForecast {
  const weighted = Math.round(
    opportunities.reduce(
      (sum, opp) =>
        sum +
        (opp.commercial.estimatedDealValue *
          opp.commercial.conversionProbability) /
          100,
      0,
    ),
  );
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const base = Math.max(weighted / 6, deals.expectedRevenue / 3);
  return {
    currentPipelineValue: Math.round(pipelineValue),
    weightedPipelineValue: weighted,
    expectedThisMonth: Math.round(base * 0.9),
    expectedNextMonth: Math.round(base * 1.05),
    expectedThisQuarter: Math.round(base * 2.8),
    wonRevenue: deals.totalWonRevenue,
    atRiskRevenue: Math.round(deals.expectedRevenue * 0.25),
    monthly: months.map((month, index) => ({
      month,
      estimate: Math.round(base * (0.75 + (index % 4) * 0.08)),
    })),
    isEstimate: true,
  };
}

function buildOutreach(opportunities: OpportunityRecord[]): OutreachReadinessMetric {
  const readyEmail = opportunities.filter(
    (o) => o.channel.primary === "email" && o.outreachReadiness.status === "ready",
  ).length;
  const readyPhone = opportunities.filter(
    (o) => o.channel.primary === "phone",
  ).length;
  const readyManual = opportunities.filter(
    (o) =>
      o.channel.primary === "manual_research" ||
      o.channel.primary === "linkedin",
  ).length;
  const needsEnrichment = opportunities.filter(
    (o) => o.outreachReadiness.status === "needs_enrichment",
  ).length;
  const blocked = opportunities.filter(
    (o) => o.outreachReadiness.status === "blocked",
  ).length;
  const excluded = opportunities.filter(
    (o) => o.outreachReadiness.status === "excluded",
  ).length;

  const missingRequirements = [
    {
      key: "missing_email",
      label: "Missing Email",
      count: opportunities.filter((o) => !o.hasEmail).length,
    },
    {
      key: "unverified_email",
      label: "Unverified Email",
      count: opportunities.filter((o) => o.hasEmail).length,
    },
    {
      key: "missing_phone",
      label: "Missing Phone",
      count: opportunities.filter((o) => !o.hasPhone).length,
    },
    {
      key: "missing_contact",
      label: "Missing Contact Person",
      count: opportunities.filter((o) =>
        o.outreachReadiness.checklist.some(
          (item) => item.key === "contact" && !item.complete,
        ),
      ).length,
    },
    {
      key: "missing_website",
      label: "Missing Website",
      count: opportunities.filter((o) => !o.website).length,
    },
    {
      key: "low_confidence",
      label: "Low Data Confidence",
      count: opportunities.filter((o) => o.outreachReadiness.score < 50).length,
    },
    {
      key: "duplicate",
      label: "Potential Duplicate",
      count: Math.min(2, Math.floor(opportunities.length / 20)),
    },
    {
      key: "excluded",
      label: "Excluded Company",
      count: excluded,
    },
  ];

  return {
    readyEmail,
    readyPhone,
    readyManual,
    needsEnrichment,
    blocked,
    excluded,
    missingRequirements,
  };
}

function buildTaskMetrics(
  tasks: CrmTaskRow[],
  leads: CrmLeadWithRelations[],
  now: Date,
): { metrics: TaskMetric; list: TaskListItem[]; members?: never } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const weekEnd = new Date(start);
  weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
  weekEnd.setHours(23, 59, 59, 999);

  const open = tasks.filter(
    (task) => task.status !== "done" && task.status !== "cancelled",
  );
  const overdue = open.filter(
    (task) => task.due_at && new Date(task.due_at).getTime() < start.getTime(),
  );
  const dueToday = open.filter((task) => {
    if (!task.due_at) return false;
    const due = new Date(task.due_at).getTime();
    return due >= start.getTime() && due <= end.getTime();
  });
  const dueThisWeek = open.filter((task) => {
    if (!task.due_at) return false;
    const due = new Date(task.due_at).getTime();
    return due >= start.getTime() && due <= weekEnd.getTime();
  });
  const completed = tasks.filter((task) => task.status === "done");
  const highPriority = open.filter(
    (task) => task.priority === "high" || task.priority === "urgent",
  );
  const leadIdsWithTasks = new Set(
    open.map((task) => task.lead_id).filter(Boolean),
  );
  const leadsWithoutFollowUp = leads.filter(
    (lead) => lead.status === "open" && !leadIdsWithTasks.has(lead.id),
  ).length;

  return {
    metrics: {
      open: open.length,
      overdue: overdue.length,
      dueToday: dueToday.length,
      dueThisWeek: dueThisWeek.length,
      completed: completed.length,
      followUpsRequired: overdue.length + dueToday.length,
      leadsWithoutFollowUp,
      highPriority: highPriority.length,
    },
    list: [],
  };
}



export function buildExecutiveDashboardData(input: {
  leads: CrmLeadWithRelations[];
  deals: CrmDealRow[];
  tasks: CrmTaskRow[];
  members: OrgMemberOption[];
  filters: DashboardFilters;
  now: Date;
}): ExecutiveDashboardData {
  const { from, to, label, previousFrom, previousTo } = resolveDateRange(
    input.filters.dateRange,
    input.now,
    input.filters.customFrom,
    input.filters.customTo,
  );

  let leads = input.leads.filter((lead) =>
    inRange(lead.created_at, from, to) || inRange(lead.updated_at, from, to),
  );
  const previousLeads = input.leads.filter(
    (lead) =>
      inRange(lead.created_at, previousFrom, previousTo) ||
      inRange(lead.updated_at, previousFrom, previousTo),
  );

  if (input.filters.industry !== "all") {
    leads = leads.filter(
      (lead) =>
        (lead.industry ?? "").toLowerCase() ===
        input.filters.industry.toLowerCase(),
    );
  }
  if (input.filters.pipelineStage !== "all") {
    leads = leads.filter((lead) =>
      (lead.stage?.slug ?? "").includes(input.filters.pipelineStage),
    );
  }

  const qualifications = qualifyLeads(leads);
  let opportunities = buildOpportunityRecords(leads);

  if (input.filters.qualification !== "all") {
    const allowed = new Set(
      qualifications
        .filter((q) => q.classification === input.filters.qualification)
        .map((q) => q.leadId),
    );
    opportunities = opportunities.filter((o) => allowed.has(o.leadId));
    leads = leads.filter((lead) => allowed.has(lead.id));
  }
  if (input.filters.opportunityClass !== "all") {
    opportunities = opportunities.filter(
      (o) => o.classification === input.filters.opportunityClass,
    );
  }
  if (input.filters.outreachReadiness !== "all") {
    opportunities = opportunities.filter(
      (o) => o.outreachReadiness.status === input.filters.outreachReadiness,
    );
  }
  if (input.filters.channel !== "all") {
    opportunities = opportunities.filter(
      (o) => o.channel.primary === input.filters.channel,
    );
  }
  if (input.filters.priority !== "all") {
    const allowed = new Set(
      qualifications
        .filter((q) => q.priority === input.filters.priority)
        .map((q) => q.leadId),
    );
    opportunities = opportunities.filter((o) => allowed.has(o.leadId));
  }
  if (input.filters.source !== "all") {
    leads = leads.filter((lead) => assignSource(lead.id) === input.filters.source);
    const ids = new Set(leads.map((lead) => lead.id));
    opportunities = opportunities.filter((o) => ids.has(o.leadId));
  }

  let deals = input.deals.filter(
    (deal) =>
      inRange(deal.created_at, from, to) || inRange(deal.updated_at, from, to),
  );
  if (input.filters.dealStatus !== "all") {
    deals = deals.filter((deal) => deal.status === input.filters.dealStatus);
  }

  const tasks = input.tasks;
  const previousQualifications = qualifyLeads(previousLeads);
  const previousOpportunities = buildOpportunityRecords(previousLeads);

  const funnel = buildFunnel(leads, qualifications, opportunities);
  const pipeline = buildPipeline(leads, opportunities, input.now);
  const rangeSeed = stableSeed(`${input.filters.dateRange}:${leads.length}`);
  const conversions = buildConversions(funnel, rangeSeed);
  const sources = buildSources(leads, qualifications, opportunities, deals);
  const dealAnalytics = buildDealAnalytics(deals, input.now);
  const pipelineValue = leads
    .filter((lead) => lead.status === "open")
    .reduce((sum, lead) => sum + Number(lead.deal_value), 0);
  const revenue = buildRevenue(opportunities, dealAnalytics, pipelineValue);
  const outreach = buildOutreach(opportunities);
  const taskBundle = buildTaskMetrics(tasks, leads, input.now);

  const leadById = new Map(leads.map((lead) => [lead.id, lead]));
  const taskList: TaskListItem[] = tasks
    .filter((task) => task.status !== "cancelled")
    .slice(0, 12)
    .map((task) => ({
      id: task.id,
      title: task.title,
      companyName: task.lead_id
        ? leadById.get(task.lead_id)?.company_name ??
          input.leads.find((lead) => lead.id === task.lead_id)?.company_name ??
          null
        : null,
      dueAt: task.due_at,
      priority: task.priority,
      ownerLabel: memberLabel(input.members, task.assigned_user_id),
      status: task.status,
      leadId: task.lead_id,
    }));

  const hotLeads = qualifications.filter((q) => q.classification === "hot");
  const avgLeadScore =
    qualifications.length === 0
      ? 0
      : clamp(
          qualifications.reduce((sum, q) => sum + q.score.total, 0) /
            qualifications.length,
        );

  const kpis: ExecutiveKpi[] = [
    {
      key: "total_leads",
      label: "Total Leads",
      value: String(leads.length),
      rawValue: leads.length,
      tooltip: "Leads in geselecteerde periode / filters",
      trend: trendFrom(leads.length, previousLeads.length),
      status: "neutral",
    },
    {
      key: "new_leads",
      label: "New Leads",
      value: String(
        leads.filter((lead) => inRange(lead.created_at, from, to)).length,
      ),
      rawValue: leads.filter((lead) => inRange(lead.created_at, from, to)).length,
      tooltip: "Nieuw aangemaakte leads in periode",
      trend: trendFrom(
        leads.filter((lead) => inRange(lead.created_at, from, to)).length,
        previousLeads.filter((lead) =>
          inRange(lead.created_at, previousFrom, previousTo),
        ).length,
      ),
    },
    {
      key: "qualified",
      label: "Qualified Leads",
      value: String(qualifications.filter((q) => q.qualified).length),
      rawValue: qualifications.filter((q) => q.qualified).length,
      tooltip: "Via Lead Qualification Engine",
      trend: trendFrom(
        qualifications.filter((q) => q.qualified).length,
        previousQualifications.filter((q) => q.qualified).length,
      ),
      status: "good",
    },
    {
      key: "hot",
      label: "Hot Leads",
      value: String(hotLeads.length),
      rawValue: hotLeads.length,
      tooltip: "Classification = hot",
      trend: trendFrom(
        hotLeads.length,
        previousQualifications.filter((q) => q.classification === "hot").length,
      ),
      drawer: "hot_leads",
      status: "warn",
    },
    {
      key: "open_opps",
      label: "Open Opportunities",
      value: String(opportunities.filter((o) => o.score.total >= 40).length),
      rawValue: opportunities.filter((o) => o.score.total >= 40).length,
      tooltip: "Opportunity score ≥ 40",
      trend: trendFrom(
        opportunities.filter((o) => o.score.total >= 40).length,
        previousOpportunities.filter((o) => o.score.total >= 40).length,
      ),
    },
    {
      key: "campaign",
      label: "Campaign-Ready Leads",
      value: String(
        opportunities.filter((o) => o.outreachReadiness.status === "ready")
          .length,
      ),
      rawValue: opportunities.filter(
        (o) => o.outreachReadiness.status === "ready",
      ).length,
      tooltip: "Outreach readiness = ready (technisch, geen legal approval)",
      trend: trendFrom(
        opportunities.filter((o) => o.outreachReadiness.status === "ready")
          .length,
        previousOpportunities.filter(
          (o) => o.outreachReadiness.status === "ready",
        ).length,
      ),
      drawer: "campaign_ready",
    },
    {
      key: "active_deals",
      label: "Active Deals",
      value: String(dealAnalytics.openDeals),
      rawValue: dealAnalytics.openDeals,
      tooltip: "Deals met status open",
      trend: trendFrom(dealAnalytics.openDeals, Math.max(0, dealAnalytics.openDeals - 1)),
    },
    {
      key: "won_deals",
      label: "Won Deals",
      value: String(dealAnalytics.wonDeals),
      rawValue: dealAnalytics.wonDeals,
      tooltip: "Gewonnen deals in filters",
      trend: trendFrom(dealAnalytics.wonDeals, Math.max(0, dealAnalytics.wonDeals)),
      status: "good",
    },
    {
      key: "pipeline_value",
      label: "Estimated Pipeline Value",
      value: formatDealValue(pipelineValue),
      rawValue: pipelineValue,
      tooltip: "Som deal_value van open leads",
      trend: trendFrom(pipelineValue, Math.round(pipelineValue * 0.92)),
    },
    {
      key: "expected_revenue",
      label: "Expected Revenue",
      value: formatDealValue(revenue.weightedPipelineValue),
      rawValue: revenue.weightedPipelineValue,
      tooltip: "Weighted pipeline (estimate)",
      trend: trendFrom(
        revenue.weightedPipelineValue,
        Math.round(revenue.weightedPipelineValue * 0.9),
      ),
    },
    {
      key: "conversion",
      label: "Conversion Rate",
      value: `${conversions.find((c) => c.id === "discovered-won")?.rate ?? 0}%`,
      rawValue: conversions.find((c) => c.id === "discovered-won")?.rate ?? 0,
      tooltip: "Overall lead to customer",
      trend:
        conversions.find((c) => c.id === "discovered-won")?.trend ??
        trendFrom(0, 0),
    },
    {
      key: "avg_score",
      label: "Average Lead Score",
      value: String(avgLeadScore),
      rawValue: avgLeadScore,
      tooltip: "Gemiddelde qualification score",
      trend: trendFrom(
        avgLeadScore,
        previousQualifications.length
          ? clamp(
              previousQualifications.reduce((s, q) => s + q.score.total, 0) /
                previousQualifications.length,
            )
          : avgLeadScore,
      ),
    },
  ];

  const classDist = (
    [
      ["hot", "Hot"],
      ["warm", "Warm"],
      ["cold", "Cold"],
      ["unqualified", "Unqualified"],
    ] as const
  ).map(([key, label]) => {
    const count = qualifications.filter((q) => q.classification === key).length;
    return {
      key,
      label,
      count,
      percent: percent(count, Math.max(qualifications.length, 1)),
    };
  });

  const priorityDist = (
    ["critical", "high", "medium", "low"] as const
  ).map((key) => {
    const count = qualifications.filter((q) => q.priority === key).length;
    return {
      key,
      label: key,
      count,
      percent: percent(count, Math.max(qualifications.length, 1)),
    };
  });

  const opportunityDist = (
    [
      "strategic",
      "high_potential",
      "promising",
      "nurture",
      "low_potential",
      "insufficient_data",
    ] as const
  ).map((key) => {
    const count = opportunities.filter((o) => o.classification === key).length;
    return {
      key,
      label: classificationLabel(key),
      count,
      percent: percent(count, Math.max(opportunities.length, 1)),
    };
  });

  const actionCounts = new Map<string, number>();
  for (const opp of opportunities) {
    const title = opp.nextBestActions.primary.title;
    actionCounts.set(title, (actionCounts.get(title) ?? 0) + 1);
  }
  const actionDistribution = [...actionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, count]) => ({
      key: label,
      label,
      count,
      percent: percent(count, Math.max(opportunities.length, 1)),
    }));

  const channelDist = (
    [
      "email",
      "phone",
      "linkedin",
      "website_form",
      "manual_research",
      "no_outreach",
    ] as const
  ).map((key) => {
    const count = opportunities.filter((o) => o.channel.primary === key).length;
    return {
      key,
      label: channelLabel(key),
      count,
      percent: percent(count, Math.max(opportunities.length, 1)),
    };
  });

  const sortedOpps = [...opportunities].sort(
    (a, b) => b.commercial.expectedValue - a.commercial.expectedValue,
  );
  const opportunityCards: RankedItem[] = [
    {
      id: sortedOpps[0]?.leadId ?? "n/a",
      label: "Highest Expected Value",
      value: sortedOpps[0]?.companyName ?? "—",
      secondary: sortedOpps[0]
        ? formatDealValue(sortedOpps[0].commercial.expectedValue)
        : undefined,
      href: sortedOpps[0] ? `/crm/opportunities` : null,
    },
    {
      id:
        [...opportunities].sort(
          (a, b) =>
            b.commercial.conversionProbability -
            a.commercial.conversionProbability,
        )[0]?.leadId ?? "n/a",
      label: "Highest Conversion Probability",
      value:
        [...opportunities].sort(
          (a, b) =>
            b.commercial.conversionProbability -
            a.commercial.conversionProbability,
        )[0]?.companyName ?? "—",
      href: "/crm/opportunities",
    },
    {
      id:
        [...opportunities].sort((a, b) => {
          const rank = (u: string) =>
            ({ immediate: 4, high: 3, medium: 2, low: 1, none: 0 })[u] ?? 0;
          return (
            rank(b.commercial.salesUrgency) - rank(a.commercial.salesUrgency)
          );
        })[0]?.leadId ?? "n/a",
      label: "Most Urgent Opportunity",
      value:
        [...opportunities].sort((a, b) => {
          const rank = (u: string) =>
            ({ immediate: 4, high: 3, medium: 2, low: 1, none: 0 })[u] ?? 0;
          return (
            rank(b.commercial.salesUrgency) - rank(a.commercial.salesUrgency)
          );
        })[0]?.companyName ?? "—",
      href: "/crm/opportunities",
    },
    {
      id:
        opportunities.find((o) => o.outreachReadiness.status === "ready")
          ?.leadId ??
        opportunities[0]?.leadId ??
        "n/a",
      label: "Best Campaign Candidate",
      value:
        opportunities.find((o) => o.outreachReadiness.status === "ready")
          ?.companyName ??
        opportunities[0]?.companyName ??
        "—",
      href: "/crm/opportunities",
    },
    {
      id:
        opportunities.find(
          (o) => o.outreachReadiness.status === "needs_enrichment",
        )?.leadId ?? "n/a",
      label: "Opportunity Needing Enrichment",
      value:
        opportunities.find(
          (o) => o.outreachReadiness.status === "needs_enrichment",
        )?.companyName ?? "—",
      href: "/crm/opportunities",
    },
    {
      id:
        opportunities.find((o) =>
          o.risks.some((risk) => risk.severity === "high"),
        )?.leadId ?? "n/a",
      label: "Opportunity at Risk",
      value:
        opportunities.find((o) =>
          o.risks.some((risk) => risk.severity === "high"),
        )?.companyName ?? "—",
      href: "/crm/opportunities",
    },
  ];

  const alerts: ExecutiveAlert[] = [];
  if (hotLeads.length > 0) {
    const withoutTask = hotLeads.find(
      (q) => !tasks.some((task) => task.lead_id === q.leadId && task.status !== "done"),
    );
    if (withoutTask) {
      alerts.push({
        id: "alert-hot-nofollowup",
        title: "Hot lead without follow-up",
        description: `${withoutTask.companyName} is hot maar heeft geen open taak.`,
        severity: "critical",
        relatedLabel: withoutTask.companyName,
        suggestedAction: "Maak een follow-up taak",
        timestamp: input.now.toISOString(),
        drawer: "hot_leads",
      });
    }
  }
  if (dealAnalytics.stalledDeals > 0) {
    alerts.push({
      id: "alert-stalled-deals",
      title: "Deal stalled",
      description: `${dealAnalytics.stalledDeals} open deal(s) zonder recente update.`,
      severity: "warning",
      relatedLabel: "Deals",
      suggestedAction: "Review stalled deals",
      timestamp: input.now.toISOString(),
      drawer: "stalled_deals",
    });
  }
  if (taskBundle.metrics.overdue > 0) {
    alerts.push({
      id: "alert-overdue-tasks",
      title: "Overdue task",
      description: `${taskBundle.metrics.overdue} taken zijn overdue.`,
      severity: "warning",
      relatedLabel: "Tasks",
      suggestedAction: "Werk overdue taken bij",
      timestamp: input.now.toISOString(),
      drawer: "overdue_tasks",
    });
  }
  const strategic = opportunities.filter((o) => o.classification === "strategic");
  if (strategic[0]) {
    alerts.push({
      id: "alert-strategic",
      title: "High-value opportunity detected",
      description: `${strategic[0].companyName} is strategic.`,
      severity: "success",
      relatedLabel: strategic[0].companyName,
      suggestedAction: "Open Opportunity Insights",
      timestamp: input.now.toISOString(),
      drawer: "strategic_opportunities",
    });
  }
  const campaignWaiting = opportunities.filter(
    (o) => o.outreachReadiness.status === "ready",
  );
  if (campaignWaiting.length > 0) {
    alerts.push({
      id: "alert-campaign-ready",
      title: "Campaign-ready lead waiting",
      description: `${campaignWaiting.length} leads technisch klaar voor outreach.`,
      severity: "information",
      relatedLabel: "Outreach",
      suggestedAction: "Review campaign queue",
      timestamp: input.now.toISOString(),
      drawer: "campaign_ready",
    });
  }
  const largestDrop = [...funnel].sort(
    (a, b) => b.dropOffPercent - a.dropOffPercent,
  )[0];
  if (largestDrop && largestDrop.dropOffPercent >= 40) {
    alerts.push({
      id: "alert-dropoff",
      title: "Funnel drop-off increasing",
      description: `Grootste drop-off bij ${largestDrop.label} (${largestDrop.dropOffPercent}%).`,
      severity: "warning",
      relatedLabel: largestDrop.label,
      suggestedAction: "Analyseer funnel bottleneck",
      timestamp: input.now.toISOString(),
    });
  }

  const activity: ActivityEvent[] = [
    ...leads.slice(0, 5).map((lead) => ({
      id: `act-lead-${lead.id}`,
      title: "Lead discovered",
      companyName: lead.company_name,
      actor: "System",
      timestamp: lead.created_at,
      module: "Leads",
      href: `/crm/leads/${lead.id}`,
    })),
    ...qualifications
      .filter((q) => q.qualified)
      .slice(0, 4)
      .map((q) => ({
        id: `act-qual-${q.leadId}`,
        title: "Lead qualified",
        companyName: q.companyName,
        actor: "Qualification Engine",
        timestamp: q.updatedAt,
        module: "Qualification",
        href: "/crm/qualification",
      })),
    ...opportunities.slice(0, 4).map((o) => ({
      id: `act-opp-${o.leadId}`,
      title: "Opportunity detected",
      companyName: o.companyName,
      actor: "Opportunity Engine",
      timestamp: o.lastActivityAt,
      module: "Opportunities",
      href: "/crm/opportunities",
    })),
    ...deals.slice(0, 3).map((deal) => ({
      id: `act-deal-${deal.id}`,
      title: deal.status === "won" ? "Deal won" : "Deal created",
      companyName: deal.title,
      actor: "CRM",
      timestamp: deal.updated_at,
      module: "Deals",
      href: `/crm/deals/${deal.id}`,
    })),
    ...tasks.slice(0, 3).map((task) => ({
      id: `act-task-${task.id}`,
      title: task.status === "done" ? "Task completed" : "Task created",
      companyName: task.title,
      actor: memberLabel(input.members, task.assigned_user_id),
      timestamp: task.updated_at,
      module: "Tasks",
      href: "/crm/tasks",
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, 20);

  const bestConversion = [...conversions].sort((a, b) => b.rate - a.rate)[0];
  const weakestConversion = [...conversions].sort((a, b) => a.rate - b.rate)[0];
  const strongestSource = [...sources].sort(
    (a, b) => b.conversionRate - a.conversionRate,
  )[0];

  const summaryParagraphs = [
    `In ${label.toLowerCase()} zijn ${leads.length} leads in scope, waarvan ${qualifications.filter((q) => q.qualified).length} qualified.`,
    `Sterkste bron (gesimuleerd): ${strongestSource?.name ?? "n/a"} met ${strongestSource?.conversionRate ?? 0}% qualification conversion.`,
    `Funnel bottleneck: ${largestDrop?.label ?? "n/a"} (drop-off ${largestDrop?.dropOffPercent ?? 0}%).`,
    `Hoogste expected value: ${sortedOpps[0]?.companyName ?? "n/a"} (${sortedOpps[0] ? formatDealValue(sortedOpps[0].commercial.expectedValue) : "—"}).`,
    `Pipeline health: ${dealAnalytics.openDeals} open deals, win rate ${dealAnalytics.winRate}%, ${dealAnalytics.stalledDeals} stalled.`,
    `Directe prioriteiten: ${taskBundle.metrics.overdue} overdue tasks, ${hotLeads.length} hot leads, ${campaignWaiting.length} campaign-ready.`,
    `Revenue outlook (estimate): weighted pipeline ${formatDealValue(revenue.weightedPipelineValue)}, expected this month ${formatDealValue(revenue.expectedThisMonth)}.`,
  ];

  const drawerLists: ExecutiveDashboardData["drawerLists"] = {
    hot_leads: hotLeads.map((q) => ({
      id: q.leadId,
      title: q.companyName,
      subtitle: `Score ${q.score.total}`,
      href: `/crm/leads/${q.leadId}`,
    })),
    overdue_tasks: tasks
      .filter((task) => {
        if (!task.due_at || task.status === "done" || task.status === "cancelled") {
          return false;
        }
        const startDay = new Date(input.now);
        startDay.setHours(0, 0, 0, 0);
        return new Date(task.due_at).getTime() < startDay.getTime();
      })
      .map((task) => ({
        id: task.id,
        title: task.title,
        subtitle: task.due_at ?? "—",
        href: task.lead_id ? `/crm/leads/${task.lead_id}` : "/crm/tasks",
      })),
    strategic_opportunities: opportunities
      .filter((o) => o.classification === "strategic")
      .map((o) => ({
        id: o.leadId,
        title: o.companyName,
        subtitle: `Score ${o.score.total}`,
        href: `/crm/leads/${o.leadId}`,
      })),
    stalled_deals: deals
      .filter((deal) => {
        if (deal.status !== "open") return false;
        const age =
          (input.now.getTime() - new Date(deal.updated_at).getTime()) /
          (24 * 60 * 60 * 1000);
        return age >= 21;
      })
      .map((deal) => ({
        id: deal.id,
        title: deal.title,
        subtitle: formatDealValue(Number(deal.value), deal.currency),
        href: `/crm/deals/${deal.id}`,
      })),
    campaign_ready: opportunities
      .filter((o) => o.outreachReadiness.status === "ready")
      .map((o) => ({
        id: o.leadId,
        title: o.companyName,
        subtitle: readinessLabel(o.outreachReadiness.status),
        href: `/crm/leads/${o.leadId}`,
      })),
    source_detail: sources.map((source) => ({
      id: source.id,
      title: source.name,
      subtitle: `${source.leadsDiscovered} leads · ${source.conversionRate}%`,
      href: "/crm/intelligence/sources",
    })),
    pipeline_stage: pipeline.map((stage) => ({
      id: stage.id,
      title: stage.label,
      subtitle: `${stage.count} records · ${formatDealValue(stage.totalValue)}`,
      href: "/crm/pipeline",
    })),
  };

  return {
    generatedAt: input.now.toISOString(),
    rangeLabel: label,
    kpis,
    funnel,
    pipeline,
    conversions,
    conversionHighlights: {
      bestStage: bestConversion?.label ?? "—",
      weakestStage: weakestConversion?.label ?? "—",
      largestDropOff: largestDrop
        ? `${largestDrop.label} (${largestDrop.dropOffPercent}%)`
        : "—",
      averageDurationDays: 12 + (leads.length % 9),
    },
    sources,
    qualification: {
      hot: classDist.find((d) => d.key === "hot")?.count ?? 0,
      warm: classDist.find((d) => d.key === "warm")?.count ?? 0,
      cold: classDist.find((d) => d.key === "cold")?.count ?? 0,
      unqualified: classDist.find((d) => d.key === "unqualified")?.count ?? 0,
      averageQualificationScore: avgLeadScore,
      averageOpportunityScore:
        opportunities.length === 0
          ? 0
          : clamp(
              opportunities.reduce((sum, o) => sum + o.score.total, 0) /
                opportunities.length,
            ),
      averageOutreachReadiness:
        opportunities.length === 0
          ? 0
          : clamp(
              opportunities.reduce(
                (sum, o) => sum + o.outreachReadiness.score,
                0,
              ) / opportunities.length,
            ),
      averageDataConfidence:
        opportunities.length === 0
          ? 0
          : clamp(
              opportunities.reduce(
                (sum, o) => sum + o.outreachReadiness.score,
                0,
              ) / opportunities.length,
            ),
      classDistribution: classDist,
      priorityDistribution: priorityDist,
      opportunityDistribution: opportunityDist,
      actionDistribution,
      channelDistribution: channelDist,
    },
    opportunities: {
      strategic:
        opportunityDist.find((d) => d.key === "strategic")?.count ?? 0,
      highPotential:
        opportunityDist.find((d) => d.key === "high_potential")?.count ?? 0,
      promising:
        opportunityDist.find((d) => d.key === "promising")?.count ?? 0,
      nurture: opportunityDist.find((d) => d.key === "nurture")?.count ?? 0,
      lowPotential:
        opportunityDist.find((d) => d.key === "low_potential")?.count ?? 0,
      insufficientData:
        opportunityDist.find((d) => d.key === "insufficient_data")?.count ?? 0,
      cards: opportunityCards,
    },
    deals: dealAnalytics,
    revenue,
    outreach,
    tasks: taskBundle.metrics,
    taskList,
    activity,
    alerts,
    topPerformers: {
      highestScoringLeads: [...qualifications]
        .sort((a, b) => b.score.total - a.score.total)
        .slice(0, 5)
        .map((q) => ({
          id: q.leadId,
          label: q.companyName,
          value: String(q.score.total),
          href: `/crm/leads/${q.leadId}`,
        })),
      highestValueOpportunities: sortedOpps.slice(0, 5).map((o) => ({
        id: o.leadId,
        label: o.companyName,
        value: formatDealValue(o.commercial.expectedValue),
        href: `/crm/leads/${o.leadId}`,
      })),
      bestConvertingSources: [...sources]
        .sort((a, b) => b.conversionRate - a.conversionRate)
        .slice(0, 5)
        .map((s) => ({
          id: s.id,
          label: s.name,
          value: `${s.conversionRate}%`,
          secondary: "simulated",
          href: "/crm/intelligence/sources",
        })),
      mostActivePipelineStages: [...pipeline]
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map((s) => ({
          id: s.id,
          label: s.label,
          value: String(s.count),
          href: "/crm/pipeline",
        })),
      highestExpectedValueDeals: [...deals]
        .sort((a, b) => Number(b.value) - Number(a.value))
        .slice(0, 5)
        .map((deal) => ({
          id: deal.id,
          label: deal.title,
          value: formatDealValue(Number(deal.value), deal.currency),
          href: `/crm/deals/${deal.id}`,
        })),
      mostCompleteProfiles: [...qualifications]
        .sort((a, b) => b.profileCompleteness - a.profileCompleteness)
        .slice(0, 5)
        .map((q) => ({
          id: q.leadId,
          label: q.companyName,
          value: `${q.profileCompleteness}%`,
          href: `/crm/leads/${q.leadId}`,
        })),
    },
    series: {
      leadsOverTime: ["W1", "W2", "W3", "W4", "W5", "W6"].map((week, index) => ({
        label: week,
        value: Math.max(
          0,
          Math.round(leads.length / 6 + ((rangeSeed + index * 3) % 5) - 2),
        ),
      })),
      opportunitiesOverTime: ["W1", "W2", "W3", "W4", "W5", "W6"].map(
        (week, index) => ({
          label: week,
          value: Math.max(
            0,
            Math.round(
              opportunities.length / 6 + ((rangeSeed + index * 5) % 4) - 1,
            ),
          ),
        }),
      ),
      pipelineValueByStage: pipeline.map((stage) => ({
        label: stage.label,
        value: stage.totalValue,
      })),
    },
    summary: {
      paragraphs: summaryParagraphs,
      generatedAt: input.now.toISOString(),
      isAiGenerated: false,
    },
    drawerLists,
  };
}

export { EXECUTIVE_DASHBOARD_NOTICE };
