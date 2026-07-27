/**
 * Phase 25G — assemble executive analytics bundle from live modules.
 */

import { formatDealValue } from "@/lib/crm/constants";
import {
  average,
  buildFunnelMetrics,
  comparePeriods,
  distributionCounts,
  groupByCurrency,
  overallFunnelConversion,
} from "@/lib/crm/executive-analytics/calculations";
import { DEFAULT_EXEC_FILTERS } from "@/lib/crm/executive-analytics/constants";
import {
  resolveExecDateRange,
  inDateRange,
} from "@/lib/crm/executive-analytics/date-range";
import {
  loadExecutiveRawSnapshot,
  weightedOpenByCurrency,
} from "@/lib/crm/executive-analytics/queries";
import { buildGroundedExecutiveSummary } from "@/lib/crm/executive-analytics/summary";
import type {
  AttentionItem,
  ExecutiveAnalyticsBundle,
  ExecutiveFilters,
  KpiCardMetric,
  RecommendationItem,
} from "@/lib/crm/executive-analytics/types";
import { buildAutomationDashboard } from "@/lib/crm/automation/queries";
import { buildLeadScoringLeaderboards } from "@/lib/crm/lead-scoring/queries";
import { buildEmailAnalyticsDashboard } from "@/lib/email/analytics/service";
import type { EmailAnalyticsDashboard } from "@/lib/email/analytics/service";

function emailKpi(
  dash: EmailAnalyticsDashboard | null,
  code: string,
): { value: number | null; previous: number | null } {
  const row = dash?.kpis.find((k) => k.code === code);
  return { value: row?.value ?? null, previous: row?.previous ?? null };
}

function mapEmailRangeKey(
  key: ExecutiveFilters["dateRange"],
):
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "month_to_date"
  | "previous_month"
  | "quarter_to_date"
  | "year_to_date"
  | "custom" {
  switch (key) {
    case "today":
    case "yesterday":
    case "last_7_days":
    case "last_30_days":
    case "custom":
      return key;
    case "this_month":
      return "month_to_date";
    case "last_month":
      return "previous_month";
    case "this_quarter":
      return "quarter_to_date";
    case "this_year":
      return "year_to_date";
    default:
      return "last_30_days";
  }
}

function formatKpiValue(
  value: number | null,
  opts?: { currency?: string; percent?: boolean },
): string {
  if (value == null) return "—";
  if (opts?.percent) return `${value}%`;
  if (opts?.currency) return formatDealValue(value, opts.currency);
  return new Intl.NumberFormat("nl-NL").format(value);
}

function kpi(
  partial: Omit<KpiCardMetric, "status"> & { status?: KpiCardMetric["status"] },
): KpiCardMetric {
  return { status: "neutral", ...partial };
}

export async function buildExecutiveAnalyticsDashboard(input: {
  organizationId: string;
  organizationName: string;
  role: string;
  filters?: Partial<ExecutiveFilters>;
}): Promise<ExecutiveAnalyticsBundle> {
  const filters: ExecutiveFilters = {
    ...DEFAULT_EXEC_FILTERS,
    ...input.filters,
  };
  const range = resolveExecDateRange({
    key: filters.dateRange,
    customFrom: filters.customFrom,
    customTo: filters.customTo,
  });

  const canViewOrgRevenue =
    input.role === "owner" ||
    input.role === "admin" ||
    input.role === "member";
  const canManageReports =
    input.role === "owner" || input.role === "admin";

  const notices: string[] = [];
  const availability: ExecutiveAnalyticsBundle["availability"] = {};

  const [raw, automationDash, scoringBoards, emailDash] = await Promise.all([
    loadExecutiveRawSnapshot(input.organizationId, filters, range),
    buildAutomationDashboard(input.organizationId).catch(() => null),
    buildLeadScoringLeaderboards(input.organizationId).catch(() => null),
    buildEmailAnalyticsDashboard({
      organizationId: input.organizationId,
      rangeKey: mapEmailRangeKey(filters.dateRange),
      customFrom: filters.customFrom,
      customTo: filters.customTo,
      campaignId: filters.campaignId,
      includeRevenue: canViewOrgRevenue,
    }).catch(() => null),
  ]);

  availability.crm = raw.dealsError || raw.leadsError ? "partial" : "live";
  availability.automations = automationDash ? "live" : "unavailable";
  availability.leadScoring = scoringBoards ? "live" : "unavailable";
  availability.email = emailDash ? "live" : "unavailable";
  availability.reports = raw.reportsError ? "unavailable" : "live";
  availability.activity = raw.activityError ? "unavailable" : "live";

  if (raw.dealsError) notices.push("Deal analytics partially unavailable.");
  if (raw.leadsError) notices.push("Lead analytics partially unavailable.");
  if (!automationDash)
    notices.push("Automation metrics unavailable — apply automation migration if needed.");
  if (!emailDash)
    notices.push("Campaign email metrics unavailable for this period.");
  if (raw.reportsError)
    notices.push(
      "Saved reports unavailable — apply migration 20260726000032_executive_analytics_dashboard.sql.",
    );

  const openDeals = raw.deals.filter((d) => d.status === "open");
  const wonInRange = raw.deals.filter(
    (d) =>
      d.status === "won" && inDateRange(d.closedAt, range.from, range.to),
  );
  const lostInRange = raw.deals.filter(
    (d) =>
      d.status === "lost" && inDateRange(d.closedAt, range.from, range.to),
  );
  const wonPrev = raw.deals.filter(
    (d) =>
      d.status === "won" &&
      inDateRange(d.closedAt, range.previousFrom, range.previousTo),
  );

  const pipelineByCurrency = groupByCurrency(
    openDeals.map((d) => ({ value: d.value, currency: d.currency })),
  );
  const weightedByCurrency = groupByCurrency(weightedOpenByCurrency(raw.deals));
  const wonByCurrency = groupByCurrency(
    wonInRange.map((d) => ({ value: d.value, currency: d.currency })),
  );
  const lostByCurrency = groupByCurrency(
    lostInRange.map((d) => ({ value: d.value, currency: d.currency })),
  );
  const multiCurrency = pipelineByCurrency.length > 1;

  const primaryCurrency = filters.currency
    ? filters.currency.toUpperCase()
    : pipelineByCurrency[0]?.currency ?? "EUR";

  const pipelinePrimary =
    pipelineByCurrency.find((b) => b.currency === primaryCurrency)?.total ??
    (multiCurrency ? null : pipelineByCurrency[0]?.total ?? 0);
  const weightedPrimary =
    weightedByCurrency.find((b) => b.currency === primaryCurrency)?.total ??
    (multiCurrency ? null : weightedByCurrency[0]?.total ?? 0);
  const wonPrimary =
    wonByCurrency.find((b) => b.currency === primaryCurrency)?.total ??
    (multiCurrency ? null : wonByCurrency[0]?.total ?? 0);

  const closedCount = wonInRange.length + lostInRange.length;
  const winRate =
    closedCount === 0
      ? null
      : Math.round((wonInRange.length / closedCount) * 1000) / 10;

  const avgDeal =
    openDeals.length === 0
      ? null
      : average(openDeals.map((d) => d.value));

  const cycles = wonInRange
    .map((d) => {
      if (!d.closedAt) return null;
      return (
        (new Date(d.closedAt).getTime() - new Date(d.createdAt).getTime()) /
        (1000 * 60 * 60 * 24)
      );
    })
    .filter((n): n is number => n != null && n >= 0);
  const avgCycle = average(cycles);

  const scored = raw.leads.filter((l) => l.aiLeadScore != null);
  const hot = scored.filter((l) => l.scoreClassification === "hot").length;
  const veryHot = scored.filter(
    (l) => l.scoreClassification === "very_hot",
  ).length;
  const qualified = scored.filter(
    (l) =>
      l.scoreClassification === "hot" ||
      l.scoreClassification === "very_hot" ||
      l.scoreClassification === "warm",
  ).length;
  const avgScore = average(scored.map((l) => Number(l.aiLeadScore)));

  const classDist = distributionCounts(
    scored.map((l) => l.scoreClassification ?? "unscored"),
  );

  const salesFunnel = buildFunnelMetrics([
    {
      id: "companies",
      label: "Companies found",
      count: raw.companiesTotal ?? 0,
    },
    {
      id: "contacts",
      label: "Contacts identified",
      count: raw.contactsTotal ?? 0,
    },
    { id: "qualified", label: "Qualified leads", count: qualified },
    { id: "deals", label: "Deals created", count: raw.deals.length },
    { id: "won", label: "Deals won", count: raw.deals.filter((d) => d.status === "won").length },
  ]);

  const sentKpi = emailKpi(emailDash, "messages_sent");
  const deliveredKpi = emailKpi(emailDash, "messages_delivered");
  const replyRateKpi = emailKpi(emailDash, "human_reply_rate");
  const repliesKpi = emailKpi(emailDash, "human_replies");
  const opens = emailDash?.engagement.uniqueOpens ?? 0;
  const clicks = emailDash?.engagement.uniqueClicks ?? 0;
  const bounced =
    (emailDash?.delivery.hardBounces ?? 0) +
    (emailDash?.delivery.softBounces ?? 0);
  const openRate =
    (deliveredKpi.value ?? 0) > 0
      ? Math.round((opens / (deliveredKpi.value as number)) * 1000) / 10
      : null;
  const bounceRate =
    (sentKpi.value ?? 0) > 0
      ? Math.round((bounced / (sentKpi.value as number)) * 1000) / 10
      : null;

  const emailFunnel = buildFunnelMetrics([
    { id: "sent", label: "Email sent", count: sentKpi.value ?? 0 },
    {
      id: "delivered",
      label: "Email delivered",
      count: deliveredKpi.value ?? 0,
    },
    { id: "opened", label: "Email opened", count: opens },
    { id: "clicked", label: "Email clicked", count: clicks },
    {
      id: "replied",
      label: "Reply received",
      count: repliesKpi.value ?? 0,
    },
  ]);

  const stageGroups = new Map<
    string,
    { stageId: string; stageName: string; deals: typeof openDeals }
  >();
  for (const d of openDeals) {
    const g = stageGroups.get(d.stageId) ?? {
      stageId: d.stageId,
      stageName: d.stageName,
      deals: [],
    };
    g.deals.push(d);
    stageGroups.set(d.stageId, g);
  }

  const kpis: KpiCardMetric[] = [
    kpi({
      key: "companies_total",
      label: "Total companies",
      rawValue: raw.companiesTotal,
      value: formatKpiValue(raw.companiesTotal),
      tooltip: "All companies in this organization",
      href: "/companies",
      trend: comparePeriods(raw.companiesTotal ?? 0, raw.companiesTotal),
    }),
    kpi({
      key: "companies_new",
      label: "New companies",
      rawValue: raw.companiesNew,
      value: formatKpiValue(raw.companiesNew),
      tooltip: "Companies created in the selected period",
      href: "/companies",
      trend: comparePeriods(raw.companiesNew ?? 0, raw.previousCompaniesNew),
      status: "good",
    }),
    kpi({
      key: "contacts_total",
      label: "Total contacts",
      rawValue: raw.contactsTotal,
      value: formatKpiValue(raw.contactsTotal),
      tooltip: "CRM lead contacts",
      href: "/crm/contacts",
      trend: comparePeriods(raw.contactsTotal ?? 0, raw.contactsTotal),
    }),
    kpi({
      key: "contacts_new",
      label: "New contacts",
      rawValue: raw.contactsNew,
      value: formatKpiValue(raw.contactsNew),
      tooltip: "Contacts created in the selected period",
      href: "/crm/contacts",
      trend: comparePeriods(raw.contactsNew ?? 0, raw.previousContactsNew),
    }),
    kpi({
      key: "qualified_leads",
      label: "Qualified leads",
      rawValue: qualified,
      value: formatKpiValue(qualified),
      tooltip: "Warm + hot + very hot scored leads",
      href: "/crm/scoring",
      trend: comparePeriods(qualified, null),
    }),
    kpi({
      key: "hot_leads",
      label: "Hot leads",
      rawValue: hot + veryHot,
      value: formatKpiValue(hot + veryHot),
      tooltip: "Hot and very hot AI lead classifications",
      href: "/crm/scoring",
      trend: comparePeriods(hot + veryHot, null),
      status: hot + veryHot > 0 ? "good" : "neutral",
    }),
    kpi({
      key: "active_deals",
      label: "Active deals",
      rawValue: openDeals.length,
      value: formatKpiValue(openDeals.length),
      tooltip: "Open deals in scope",
      href: "/crm/deals",
      trend: comparePeriods(openDeals.length, null),
    }),
    kpi({
      key: "pipeline_value",
      label: "Pipeline value",
      rawValue: pipelinePrimary,
      value: formatKpiValue(pipelinePrimary, { currency: primaryCurrency }),
      tooltip: multiCurrency
        ? "Primary currency only — see pipeline by currency below"
        : "Sum of open deal values",
      href: "/crm/analytics",
      trend: comparePeriods(pipelinePrimary ?? 0, null),
      currency: primaryCurrency,
      unavailableReason: multiCurrency && !filters.currency
        ? "Multiple currencies — filtered to primary"
        : null,
    }),
    kpi({
      key: "weighted_pipeline",
      label: "Weighted pipeline",
      rawValue: weightedPrimary,
      value: formatKpiValue(weightedPrimary, { currency: primaryCurrency }),
      tooltip: "Open value × win probability",
      href: "/crm/analytics",
      trend: comparePeriods(weightedPrimary ?? 0, null),
      currency: primaryCurrency,
    }),
    kpi({
      key: "won_revenue",
      label: "Won revenue",
      rawValue: wonPrimary,
      value: formatKpiValue(wonPrimary, { currency: primaryCurrency }),
      tooltip: "Won deals closed in period (by currency)",
      href: "/crm/deals",
      trend: comparePeriods(
        wonPrimary ?? 0,
        groupByCurrency(
          wonPrev.map((d) => ({ value: d.value, currency: d.currency })),
        ).find((b) => b.currency === primaryCurrency)?.total ?? null,
      ),
      currency: primaryCurrency,
      status: "good",
    }),
    kpi({
      key: "conversion_rate",
      label: "Conversion rate",
      rawValue: winRate,
      value: formatKpiValue(winRate, { percent: true }),
      tooltip: "Won / (won + lost) in period",
      href: "/crm/analytics",
      trend: comparePeriods(winRate ?? 0, null),
    }),
    kpi({
      key: "avg_deal",
      label: "Average deal size",
      rawValue: avgDeal,
      value: formatKpiValue(avgDeal, { currency: primaryCurrency }),
      tooltip: "Average open deal value (mixed currencies not combined)",
      href: "/crm/deals",
      trend: comparePeriods(avgDeal ?? 0, null),
      currency: primaryCurrency,
    }),
    kpi({
      key: "avg_cycle",
      label: "Average sales cycle",
      rawValue: avgCycle,
      value: avgCycle == null ? "—" : `${avgCycle}d`,
      tooltip: "Average days from deal create to win in period",
      href: "/crm/deals",
      trend: comparePeriods(avgCycle ?? 0, null),
    }),
    kpi({
      key: "emails_sent",
      label: "Emails sent",
      rawValue: sentKpi.value,
      value: formatKpiValue(sentKpi.value),
      tooltip: "Tracked email deliveries in period",
      href: "/email/analytics",
      trend: comparePeriods(sentKpi.value ?? 0, sentKpi.previous),
    }),
    kpi({
      key: "reply_rate",
      label: "Reply rate",
      rawValue: replyRateKpi.value,
      value: formatKpiValue(replyRateKpi.value, {
        percent: true,
      }),
      tooltip: "Replies / delivered (null when denominator is zero)",
      href: "/email/analytics",
      trend: comparePeriods(
        replyRateKpi.value ?? 0,
        replyRateKpi.previous,
      ),
    }),
    kpi({
      key: "active_automations",
      label: "Active automations",
      rawValue: automationDash?.totals.active ?? null,
      value: formatKpiValue(automationDash?.totals.active ?? null),
      tooltip: "Enabled active sales automations",
      href: "/crm/automations",
      trend: comparePeriods(automationDash?.totals.active ?? 0, null),
    }),
    kpi({
      key: "tasks_overdue",
      label: "Tasks overdue",
      rawValue: raw.overdueTasks,
      value: formatKpiValue(raw.overdueTasks),
      tooltip: "Open tasks past due date",
      href: "/crm/tasks",
      trend: comparePeriods(raw.overdueTasks, null),
      status: raw.overdueTasks > 0 ? "warn" : "good",
    }),
  ];

  const attention: AttentionItem[] = [];
  if (raw.overdueTasks > 0) {
    attention.push({
      id: "overdue_tasks",
      title: `${raw.overdueTasks} overdue task(s)`,
      description: "Tasks past their due date need follow-up.",
      priority: raw.overdueTasks >= 10 ? "critical" : "high",
      href: "/crm/tasks",
      count: raw.overdueTasks,
    });
  }
  if (raw.staleLeads > 0) {
    attention.push({
      id: "stale_leads",
      title: `${raw.staleLeads} stale open lead(s)`,
      description: "Open leads without updates in 30+ days.",
      priority: "medium",
      href: "/crm/leads",
      count: raw.staleLeads,
    });
  }
  if ((automationDash?.totals.failedToday ?? 0) > 0) {
    attention.push({
      id: "failed_automations",
      title: `${automationDash!.totals.failedToday} failed automation(s) today`,
      description: "Review run logs and retry or disable failing workflows.",
      priority: "high",
      href: "/crm/automations",
      count: automationDash!.totals.failedToday,
    });
  }
  if ((raw.contactsMissingEmail ?? 0) > 5) {
    attention.push({
      id: "missing_emails",
      title: "Contacts missing email",
      description: `${raw.contactsMissingEmail} contacts lack an email address.`,
      priority: "medium",
      href: "/crm/contacts",
      count: raw.contactsMissingEmail ?? 0,
    });
  }
  if ((scoringBoards?.totals.hot ?? 0) > 0) {
    // opportunity, not always attention
  }
  const highRisk = (scoringBoards?.highestRisk ?? []).filter(
    (l) => Number(l.risk_score ?? 0) >= 60,
  );
  if (highRisk.length > 0) {
    attention.push({
      id: "high_risk_leads",
      title: `${highRisk.length} high-risk lead(s)`,
      description: "Leads with elevated risk scores need review.",
      priority: "high",
      href: "/crm/scoring",
      count: highRisk.length,
    });
  }
  if ((bounceRate ?? 0) >= 5) {
    attention.push({
      id: "high_bounce",
      title: "Elevated bounce rate",
      description: `Bounce rate is ${bounceRate}% in this period.`,
      priority: "high",
      href: "/email/analytics",
    });
  }

  const recommendations: RecommendationItem[] = [];
  if (hot + veryHot > 0) {
    recommendations.push({
      id: "follow_hot",
      title: `Follow up with ${hot + veryHot} hot lead(s)`,
      rationale: "Highest scoring leads are ready for outreach.",
      href: "/crm/scoring",
    });
  }
  if (raw.overdueTasks > 0) {
    recommendations.push({
      id: "clear_tasks",
      title: `Clear ${raw.overdueTasks} overdue task(s)`,
      rationale: "Overdue work slows pipeline velocity.",
      href: "/crm/tasks",
    });
  }
  if ((raw.companiesWithoutWebsite ?? 0) > 0) {
    recommendations.push({
      id: "enrich_websites",
      title: `Enrich ${raw.companiesWithoutWebsite} companies without websites`,
      rationale: "Website enrichment improves scoring and campaigns.",
      href: "/companies",
    });
  }
  if ((automationDash?.totals.failedToday ?? 0) > 0) {
    recommendations.push({
      id: "fix_automations",
      title: "Investigate failing automations",
      rationale: "Repeated failures waste queue capacity.",
      href: "/crm/automations",
    });
  }
  if ((raw.decisionMakers ?? 0) === 0 && (raw.contactsTotal ?? 0) > 0) {
    recommendations.push({
      id: "mark_dms",
      title: "Identify decision makers",
      rationale: "No decision makers flagged — contact intelligence can help.",
      href: "/crm/contacts",
    });
  }

  const sourceDist = distributionCounts(
    raw.leads.map((l) => l.source),
    "Unknown",
  );
  const attributionAvailable = sourceDist.some(
    (s) => s.key !== "Unknown" && s.count > 0,
  );

  const avgDuration =
    automationDash?.recentRuns && automationDash.recentRuns.length
      ? average(
          automationDash.recentRuns
            .map((r) => r.duration_ms)
            .filter((n): n is number => n != null),
        )
      : null;

  const failingMap = new Map<string, { id: string; name: string; count: number }>();
  for (const run of automationDash?.recentRuns ?? []) {
    if (run.status !== "failed") continue;
    const auto = automationDash?.automations.find(
      (a) => a.id === run.automation_id,
    );
    const prev = failingMap.get(run.automation_id) ?? {
      id: run.automation_id,
      name: auto?.name ?? "Automation",
      count: 0,
    };
    prev.count += 1;
    failingMap.set(run.automation_id, prev);
  }

  const industryScores = new Map<string, number[]>();
  for (const l of scored) {
    const key = l.industry?.trim() || "Unknown";
    const arr = industryScores.get(key) ?? [];
    arr.push(Number(l.aiLeadScore));
    industryScores.set(key, arr);
  }

  const bundleBase: Omit<ExecutiveAnalyticsBundle, "aiSummary"> = {
    generatedAt: new Date().toISOString(),
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    rangeLabel: range.label,
    filters,
    role: {
      canViewOrgRevenue,
      canManageReports,
      canExport: canManageReports || input.role === "member",
    },
    availability,
    notices,
    kpis,
    revenue: {
      pipelineByCurrency,
      weightedByCurrency,
      wonByCurrency,
      lostByCurrency,
      dealsByStage: [...stageGroups.values()].map((g) => ({
        stageId: g.stageId,
        stageName: g.stageName,
        count: g.deals.length,
        valueByCurrency: groupByCurrency(
          g.deals.map((d) => ({ value: d.value, currency: d.currency })),
        ),
      })),
      openDeals: openDeals.length,
      wonDeals: wonInRange.length,
      lostDeals: lostInRange.length,
      winRate,
      averageDealSizeByCurrency: groupByCurrency(
        openDeals.map((d) => ({ value: d.value, currency: d.currency })),
      ),
      averageSalesCycleDays: avgCycle,
      multiCurrency,
    },
    funnels: {
      sales: salesFunnel,
      email: emailFunnel,
      salesOverallConversion: overallFunnelConversion(salesFunnel),
      emailOverallConversion: overallFunnelConversion(emailFunnel),
    },
    leadQuality: {
      distribution: classDist,
      averageScore: avgScore,
      hotCount: hot,
      veryHotCount: veryHot,
      scoredCount: scored.length,
      fastestImproving: (scoringBoards?.fastestGrowing ?? [])
        .slice(0, 5)
        .map((l) => ({
          id: l.id,
          label: l.company_name,
          score: Number(l.ai_lead_score ?? 0),
          delta: Number(l.score_delta ?? 0),
          href: `/crm/leads/${l.id}`,
        })),
      highestRisk: (scoringBoards?.highestRisk ?? []).slice(0, 5).map((l) => ({
        id: l.id,
        label: l.company_name,
        risk: Number(l.risk_score ?? 0),
        href: `/crm/leads/${l.id}`,
      })),
      highestOpportunity: (scoringBoards?.biggestOpportunities ?? [])
        .slice(0, 5)
        .map((l) => ({
          id: l.id,
          label: l.company_name,
          band: l.opportunity_band ?? "unknown",
          href: `/crm/leads/${l.id}`,
        })),
      byIndustry: distributionCounts(raw.leads.map((l) => l.industry)).slice(
        0,
        8,
      ),
      byCountry: distributionCounts(raw.leads.map((l) => l.country)).slice(
        0,
        8,
      ),
    },
    intelligence: {
      decisionMakers: raw.decisionMakers ?? 0,
      contactsMissingEmail: raw.contactsMissingEmail ?? 0,
      contactsMissingRole: raw.contactsMissingRole ?? 0,
      companiesWithoutWebsite: raw.companiesWithoutWebsite,
      companiesWithoutContacts: null,
      notes: [
        "Company completeness aggregates use live counts where available.",
        "Companies without contacts requires a join aggregate — shown when available in a later pass.",
      ],
    },
    campaigns: {
      active: emailDash?.campaigns.filter((c) =>
        ["active", "running", "scheduled"].includes(c.status),
      ).length ?? 0,
      completed: emailDash?.campaigns.filter((c) =>
        ["completed", "finished", "ended", "archived"].includes(c.status),
      ).length ?? 0,
      sent: sentKpi.value ?? 0,
      delivered: deliveredKpi.value ?? 0,
      opened: opens,
      clicked: clicks,
      replied: repliesKpi.value ?? 0,
      bounced,
      unsubscribed: (emailDash?.campaigns ?? []).reduce(
        (s, c) => s + c.unsubscribes,
        0,
      ),
      spamComplaints: emailDash?.delivery.complaints ?? 0,
      openRate,
      replyRate: replyRateKpi.value,
      bounceRate,
      privacyNote:
        "Open/click rates may under-count when privacy protection blocks tracking pixels.",
      topCampaigns: (emailDash?.campaigns ?? []).slice(0, 5).map((c) => ({
        id: c.campaignId,
        name: c.name,
        sent: c.sent,
        openRate:
          c.delivered > 0
            ? Math.round((c.uniqueOpens / c.delivered) * 1000) / 10
            : null,
        href: `/email/campaigns/${c.campaignId}`,
      })),
    },
    automations: {
      active: automationDash?.totals.active ?? 0,
      executionsToday:
        (automationDash?.totals.completedToday ?? 0) +
        (automationDash?.totals.failedToday ?? 0) +
        (automationDash?.totals.running ?? 0),
      successfulToday: automationDash?.totals.completedToday ?? 0,
      failedToday: automationDash?.totals.failedToday ?? 0,
      successRate: automationDash?.totals.successRate ?? null,
      averageDurationMs: avgDuration,
      mostUsed: (automationDash?.mostUsed ?? [])
        .slice(0, 5)
        .map((m) => ({
          id: m.automation?.id ?? "unknown",
          name: m.automation?.name ?? "Unknown",
          count: m.count,
          href: m.automation
            ? `/crm/automations/${m.automation.id}`
            : "/crm/automations",
        })),
      mostFailing: [...failingMap.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map((m) => ({
          ...m,
          href: `/crm/automations/${m.id}`,
        })),
    },
    geo: {
      companiesByCountry: distributionCounts(
        raw.leads.map((l) => l.country),
      ).slice(0, 10),
      leadsByCountry: distributionCounts(raw.leads.map((l) => l.country)).slice(
        0,
        10,
      ),
      dealsByCountry: [],
    },
    industry: {
      companiesByCategory: (raw.categories ?? []).slice(0, 10).map((c) => ({
        key: c.id,
        label: c.name,
        count: 0,
      })),
      leadsByIndustry: distributionCounts(raw.leads.map((l) => l.industry)).slice(
        0,
        10,
      ),
      avgScoreByIndustry: [...industryScores.entries()]
        .map(([key, vals]) => ({
          key,
          label: key,
          avg: average(vals) ?? 0,
          count: vals.length,
        }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 8),
    },
    sources: {
      rows: sourceDist.slice(0, 12).map((s) => ({
        key: s.key,
        label: s.label,
        leads: s.count,
        note:
          s.key === "Unknown"
            ? "Source was not recorded on the lead"
            : "From crm_leads.source",
      })),
      attributionAvailable,
    },
    activity: {
      recent: (raw.activity ?? []).slice(0, 15).map((a) => ({
        id: a.id,
        title: a.description || a.event_type,
        module: a.entity_type ?? a.event_type,
        timestamp: a.created_at,
        href:
          a.entity_type === "lead" && a.entity_id
            ? `/crm/leads/${a.entity_id}`
            : null,
      })),
      overdueTasks: raw.overdueTasks,
      staleLeads: raw.staleLeads,
    },
    attention,
    recommendations,
    reports: (raw.reports ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      isFavorite: r.is_favorite,
      isDefault: r.is_default,
      updatedAt: r.updated_at,
    })),
  };

  const aiSummary = buildGroundedExecutiveSummary(bundleBase);

  return { ...bundleBase, aiSummary };
}
