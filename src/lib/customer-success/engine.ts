/**
 * Customer Success orchestration — load signals, analyze, persist.
 */

import { emitAiEvent } from "@/ai/events/bus";
import { ensureCustomerSuccessAgent } from "@/lib/customer-success/agent";
import { predictChurn } from "@/lib/customer-success/churn";
import { computeHealthScore, parseHealthWeights } from "@/lib/customer-success/health";
import { logCsEvent } from "@/lib/customer-success/history";
import {
  buildAlerts,
  buildCustomerRecommendations,
  buildInsights,
  detectCrossSell,
  detectUpsell,
} from "@/lib/customer-success/insights";
import {
  buildOnboardingChecklist,
  buildSuccessPlan,
} from "@/lib/customer-success/onboarding";
import { analyzeRenewal } from "@/lib/customer-success/renewal";
import type {
  CsDashboardStats,
  CsOrgSettingsRow,
  CustomerSignalInput,
} from "@/lib/customer-success/types";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

export async function ensureCsSettings(
  organizationId: string,
): Promise<CsOrgSettingsRow> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("customer_success_org_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (existing) return existing as CsOrgSettingsRow;

  const { data, error } = await supabase
    .from("customer_success_org_settings")
    .insert({ organization_id: organizationId })
    .select("*")
    .single();

  if (error || !data) {
    return {
      organization_id: organizationId,
      enabled: true,
      approval_mode: "semi_autonomous",
      provider: "openai",
      model: "gpt-4.1-mini",
      health_weights_json: {},
      churn_threshold: 55,
      renewal_window_days: 60,
      notification_rules_json: {},
      customer_segments_json: [],
      rate_limit_per_minute: 40,
      metadata_json: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
  return data as CsOrgSettingsRow;
}

function daysSince(iso: string | null | undefined): number {
  if (!iso) return 999;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 999;
  return Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000));
}

export async function loadCustomerSignals(
  organizationId: string,
  limit = 150,
): Promise<CustomerSignalInput[]> {
  const supabase = await createClient();

  const { data: companies } = await supabase
    .from("companies")
    .select(
      "id, company_name, status, industry, country, updated_at, created_at, last_checked_at, intelligence_score",
    )
    .eq("organization_id", organizationId)
    .eq("status", "customer")
    .order("updated_at", { ascending: false })
    .limit(limit);

  let companyRows = companies ?? [];

  // Fallback: include companies linked to won deals if no explicit customers
  if (companyRows.length === 0) {
    const { data: wonDeals } = await supabase
      .from("crm_deals")
      .select("lead_id")
      .eq("organization_id", organizationId)
      .eq("status", "won")
      .limit(80);

    const leadIds = [
      ...new Set((wonDeals ?? []).map((d) => d.lead_id).filter(Boolean)),
    ] as string[];

    if (leadIds.length > 0) {
      const { data: leads } = await supabase
        .from("crm_leads")
        .select("company_id")
        .eq("organization_id", organizationId)
        .in("id", leadIds);

      const companyIds = [
        ...new Set((leads ?? []).map((l) => l.company_id).filter(Boolean)),
      ] as string[];

      if (companyIds.length > 0) {
        const { data: fallback } = await supabase
          .from("companies")
          .select(
            "id, company_name, status, industry, country, updated_at, created_at, last_checked_at, intelligence_score",
          )
          .eq("organization_id", organizationId)
          .in("id", companyIds)
          .limit(limit);
        companyRows = fallback ?? [];
      }
    }
  }

  if (companyRows.length === 0) return [];

  const companyIds = companyRows.map((c) => c.id);

  const [
    { data: contacts },
    { data: leads },
    { data: subscription },
  ] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, company_id")
      .eq("organization_id", organizationId)
      .in("company_id", companyIds),
    supabase
      .from("crm_leads")
      .select("id, company_id")
      .eq("organization_id", organizationId)
      .in("company_id", companyIds),
    supabase
      .from("billing_subscriptions")
      .select("status, current_period_end, seats_purchased")
      .eq("organization_id", organizationId)
      .in("status", ["active", "trialing", "past_due", "unpaid"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const leadIds = (leads ?? []).map((l) => l.id);

  const [{ data: deals }, { data: tasks }, { data: notes }] = await Promise.all([
    leadIds.length
      ? supabase
          .from("crm_deals")
          .select("id, lead_id, value, status, expected_close_date, closed_at, updated_at")
          .eq("organization_id", organizationId)
          .in("lead_id", leadIds)
      : Promise.resolve({ data: [] as Array<{
          id: string;
          lead_id: string | null;
          value: number;
          status: string;
          expected_close_date: string | null;
          closed_at: string | null;
          updated_at: string;
        }> }),
    leadIds.length
      ? supabase
          .from("crm_tasks")
          .select("id, lead_id, status, due_at, updated_at")
          .eq("organization_id", organizationId)
          .in("lead_id", leadIds)
      : Promise.resolve({ data: [] as Array<{
          id: string;
          lead_id: string | null;
          status: string;
          due_at: string | null;
          updated_at: string;
        }> }),
    leadIds.length
      ? supabase
          .from("crm_notes")
          .select("id, lead_id, created_at")
          .eq("organization_id", organizationId)
          .in("lead_id", leadIds)
      : Promise.resolve({ data: [] as Array<{
          id: string;
          lead_id: string | null;
          created_at: string;
        }> }),
  ]);

  const contactCount = new Map<string, number>();
  for (const c of contacts ?? []) {
    contactCount.set(c.company_id, (contactCount.get(c.company_id) ?? 0) + 1);
  }

  const now = Date.now();
  const billingPastDue =
    subscription?.status === "past_due" || subscription?.status === "unpaid";

  return companyRows.map((company) => {
    const relatedLeadIds = (leads ?? [])
      .filter((l) => l.company_id === company.id)
      .map((l) => l.id);

    const companyDeals = (deals ?? []).filter(
      (d) => d.lead_id && relatedLeadIds.includes(d.lead_id),
    );
    const companyTasks = (tasks ?? []).filter(
      (t) => t.lead_id && relatedLeadIds.includes(t.lead_id),
    );
    const companyNotes = (notes ?? []).filter(
      (n) => n.lead_id && relatedLeadIds.includes(n.lead_id),
    );

    const openTasks = companyTasks.filter(
      (t) => t.status === "todo" || t.status === "in_progress",
    );
    const overdueTasks = openTasks.filter(
      (t) => t.due_at && new Date(t.due_at).getTime() < now,
    );

    const wonDealValue = companyDeals
      .filter((d) => d.status === "won")
      .reduce((s, d) => s + Number(d.value ?? 0), 0);
    const openDealValue = companyDeals
      .filter((d) => d.status === "open")
      .reduce((s, d) => s + Number(d.value ?? 0), 0);

    const latestWon = companyDeals
      .filter((d) => d.status === "won" && d.closed_at)
      .sort(
        (a, b) =>
          new Date(b.closed_at!).getTime() - new Date(a.closed_at!).getTime(),
      )[0];

    let contractEndsAt: string | null =
      companyDeals.find((d) => d.status === "open" && d.expected_close_date)
        ?.expected_close_date ?? null;

    if (!contractEndsAt && latestWon?.closed_at) {
      const end = new Date(latestWon.closed_at);
      end.setFullYear(end.getFullYear() + 1);
      contractEndsAt = end.toISOString().slice(0, 10);
    }

    if (!contractEndsAt && subscription?.current_period_end) {
      contractEndsAt = subscription.current_period_end.slice(0, 10);
    }

    const activityCandidates = [
      company.updated_at,
      company.last_checked_at,
      ...companyNotes.map((n) => n.created_at),
      ...companyTasks.map((t) => t.updated_at),
      ...companyDeals.map((d) => d.updated_at),
    ].filter(Boolean) as string[];

    const lastActivity = activityCandidates
      .map((iso) => new Date(iso).getTime())
      .filter((t) => !Number.isNaN(t))
      .sort((a, b) => b - a)[0];

    return {
      companyId: company.id,
      companyName: company.company_name,
      status: company.status,
      industry: company.industry,
      country: company.country,
      updatedAt: company.updated_at,
      createdAt: company.created_at,
      lastCheckedAt: company.last_checked_at,
      intelligenceScore: company.intelligence_score,
      openTasks: openTasks.length,
      overdueTasks: overdueTasks.length,
      noteCount: companyNotes.length,
      wonDealValue,
      openDealValue,
      daysSinceActivity:
        lastActivity != null
          ? Math.floor((now - lastActivity) / (24 * 60 * 60 * 1000))
          : daysSince(company.updated_at),
      contactCount: contactCount.get(company.id) ?? 0,
      billingPastDue: Boolean(billingPastDue),
      contractEndsAt,
      seatsPurchased: subscription?.seats_purchased ?? null,
      npsHint: null,
      csatHint: null,
    };
  });
}

export async function analyzeAndPersistCustomers(params: {
  organizationId: string;
  userId?: string | null;
  companyIds?: string[];
}): Promise<{ analyzed: number }> {
  const settings = await ensureCsSettings(params.organizationId);
  if (!settings.enabled) return { analyzed: 0 };

  await ensureCustomerSuccessAgent(params.organizationId, params.userId);
  const weights = parseHealthWeights(settings.health_weights_json);
  let signals = await loadCustomerSignals(params.organizationId);
  if (params.companyIds?.length) {
    const set = new Set(params.companyIds);
    signals = signals.filter((s) => set.has(s.companyId));
  }

  const supabase = await createClient();
  let analyzed = 0;

  // Clear open recs/alerts for re-generation batch scope
  if (!params.companyIds?.length) {
    await supabase
      .from("customer_success_recommendations")
      .delete()
      .eq("organization_id", params.organizationId)
      .eq("status", "open");
    await supabase
      .from("customer_success_alerts")
      .delete()
      .eq("organization_id", params.organizationId)
      .eq("status", "open");
  }

  for (const signal of signals) {
    const health = computeHealthScore(signal, weights);
    const churn = predictChurn(
      signal,
      health.healthScore,
      settings.churn_threshold,
    );
    const renewal = analyzeRenewal(
      signal,
      health.healthScore,
      churn.probability,
      settings.renewal_window_days,
    );
    const onboarding = buildOnboardingChecklist(signal);
    const upsell = detectUpsell(signal, health.healthScore);
    const crossSell = detectCrossSell(signal, health.healthScore);
    const insights = buildInsights(
      signal,
      health.healthScore,
      churn.probability,
      upsell,
    );
    const milestones = buildSuccessPlan({
      companyName: signal.companyName,
      healthScore: health.healthScore,
      onboardingProgress: onboarding.progressPercent,
    });
    const planProgress = Math.round(
      (milestones.filter((m) => m.done).length / Math.max(1, milestones.length)) *
        100,
    );

    const timeline = [
      {
        type: "analysis",
        at: new Date().toISOString(),
        summary: `Health ${health.healthScore} · churn ${Math.round(churn.probability * 100)}%`,
      },
      {
        type: "activity",
        at: signal.updatedAt,
        summary: `Laatste CRM activiteit (${signal.daysSinceActivity}d)`,
      },
      ...(signal.noteCount
        ? [
            {
              type: "notes",
              at: signal.updatedAt,
              summary: `${signal.noteCount} notities`,
            },
          ]
        : []),
    ];

    const { data: profile } = await supabase
      .from("customer_success_profiles")
      .upsert(
        {
          organization_id: params.organizationId,
          company_id: signal.companyId,
          health_score: health.healthScore,
          health_class: health.healthClass,
          churn_probability: churn.probability,
          churn_reason: churn.reason,
          churn_confidence: churn.confidence,
          adoption_score: health.adoptionScore,
          engagement_score: health.engagementScore,
          revenue_value: signal.wonDealValue,
          contract_ends_at: renewal.contractEndsAt,
          renewal_probability: renewal.probability,
          signals_json: signal as unknown as Json,
          insights_json: insights as unknown as Json,
          upsell_json: upsell as unknown as Json,
          cross_sell_json: crossSell as unknown as Json,
          feature_adoption_json: health.featureAdoption as unknown as Json,
          timeline_json: timeline as unknown as Json,
          ai_confidence: health.confidence,
          provider: settings.provider,
          model: settings.model,
          analyzed_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,company_id" },
      )
      .select("id")
      .single();

    if (profile?.id) {
      const { data: existingPlan } = await supabase
        .from("customer_success_plans")
        .select("id")
        .eq("organization_id", params.organizationId)
        .eq("company_id", signal.companyId)
        .in("status", ["active", "draft"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingPlan) {
        await supabase
          .from("customer_success_plans")
          .update({
            profile_id: profile.id,
            name: `Success plan — ${signal.companyName}`,
            status: planProgress >= 100 ? "completed" : "active",
            milestones_json: milestones as unknown as Json,
            progress_percent: planProgress,
          })
          .eq("id", existingPlan.id);
      } else {
        await supabase.from("customer_success_plans").insert({
          organization_id: params.organizationId,
          company_id: signal.companyId,
          profile_id: profile.id,
          name: `Success plan — ${signal.companyName}`,
          status: planProgress >= 100 ? "completed" : "active",
          milestones_json: milestones as unknown as Json,
          progress_percent: planProgress,
          created_by: params.userId ?? null,
        });
      }

      if (renewal.contractEndsAt) {
        await supabase.from("customer_success_renewals").upsert(
          {
            organization_id: params.organizationId,
            company_id: signal.companyId,
            profile_id: profile.id,
            contract_ends_at: renewal.contractEndsAt,
            renewal_probability: renewal.probability,
            risk_level: renewal.riskLevel,
            status: "upcoming",
            recommendations_json: renewal.recommendations as unknown as Json,
            tasks_json: renewal.tasks as unknown as Json,
            owner_user_id: params.userId ?? null,
          },
          { onConflict: "organization_id,company_id,contract_ends_at" },
        );
      }

      await supabase.from("customer_success_onboarding").upsert(
        {
          organization_id: params.organizationId,
          company_id: signal.companyId,
          profile_id: profile.id,
          status: onboarding.status,
          checklist_json: onboarding.items as unknown as Json,
          progress_percent: onboarding.progressPercent,
          started_at:
            onboarding.status === "not_started"
              ? null
              : new Date().toISOString(),
          completed_at:
            onboarding.status === "completed"
              ? new Date().toISOString()
              : null,
        },
        { onConflict: "organization_id,company_id" },
      );
    }

    const recs = buildCustomerRecommendations({
      companyId: signal.companyId,
      companyName: signal.companyName,
      healthScore: health.healthScore,
      churnProbability: churn.probability,
      onboardingProgress: onboarding.progressPercent,
      upsellCount: upsell.length,
      contractEndsAt: renewal.contractEndsAt,
    });

    if (recs.length) {
      await supabase.from("customer_success_recommendations").insert(
        recs.map((r) => ({
          organization_id: params.organizationId,
          company_id: signal.companyId,
          recommendation_type: r.type,
          title: r.title,
          rationale: r.rationale,
          priority: r.priority,
          status: "open",
          payload_json: (r.payload ?? {}) as Json,
        })),
      );
    }

    const alerts = buildAlerts({
      companyId: signal.companyId,
      companyName: signal.companyName,
      healthScore: health.healthScore,
      churnProbability: churn.probability,
      daysSinceActivity: signal.daysSinceActivity,
      overdueTasks: signal.overdueTasks,
      onboardingProgress: onboarding.progressPercent,
      contractEndsAt: renewal.contractEndsAt,
      billingPastDue: signal.billingPastDue,
    });

    if (alerts.length) {
      await supabase.from("customer_success_alerts").insert(
        alerts.map((a) => ({
          organization_id: params.organizationId,
          company_id: signal.companyId,
          alert_type: a.type,
          severity: a.severity,
          title: a.title,
          message: a.message,
          status: "open",
        })),
      );
    }

    analyzed += 1;
  }

  await logCsEvent({
    organizationId: params.organizationId,
    eventType: "customers.analyzed",
    summary: `Analyzed ${analyzed} customers`,
    actorUserId: params.userId,
    payload: { analyzed },
    provider: settings.provider,
    model: settings.model,
  });

  await emitAiEvent({
    organizationId: params.organizationId,
    eventType: "workflow.finished",
    payload: { kind: "customer_success_analysis", analyzed },
  });

  return { analyzed };
}

export async function getCsDashboard(
  organizationId: string,
): Promise<CsDashboardStats> {
  await ensureCsSettings(organizationId);
  const supabase = await createClient();

  const [
    { data: profiles },
    { count: renewalsSoon },
    { count: onboardingInProgress },
    { count: openRecs },
    { count: openAlerts },
    { data: recRows },
  ] = await Promise.all([
    supabase
      .from("customer_success_profiles")
      .select(
        "health_score, health_class, churn_probability, upsell_json, contract_ends_at",
      )
      .eq("organization_id", organizationId)
      .limit(300),
    supabase
      .from("customer_success_renewals")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "upcoming"),
    supabase
      .from("customer_success_onboarding")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "in_progress"),
    supabase
      .from("customer_success_recommendations")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "open"),
    supabase
      .from("customer_success_alerts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "open"),
    supabase
      .from("customer_success_recommendations")
      .select("recommendation_type, title, rationale, priority, company_id")
      .eq("organization_id", organizationId)
      .eq("status", "open")
      .order("priority", { ascending: false })
      .limit(8),
  ]);

  const list = profiles ?? [];
  const avgHealth =
    list.length === 0
      ? 0
      : Math.round(
          list.reduce((s, p) => s + p.health_score, 0) / list.length,
        );

  const upsellOpportunities = list.reduce((sum, p) => {
    return sum + (Array.isArray(p.upsell_json) ? p.upsell_json.length : 0);
  }, 0);

  return {
    customerCount: list.length,
    avgHealth,
    atRiskCount: list.filter(
      (p) =>
        p.health_class === "at_risk" ||
        p.health_class === "critical" ||
        p.health_class === "needs_attention",
    ).length,
    highChurnCount: list.filter((p) => Number(p.churn_probability) >= 0.45)
      .length,
    renewalsSoon: renewalsSoon ?? 0,
    onboardingInProgress: onboardingInProgress ?? 0,
    upsellOpportunities,
    openRecommendations: openRecs ?? 0,
    openAlerts: openAlerts ?? 0,
    recentRecommendations: (recRows ?? []).map((r) => ({
      type: r.recommendation_type as CsDashboardStats["recentRecommendations"][number]["type"],
      title: r.title,
      rationale: r.rationale,
      priority: r.priority,
      companyId: r.company_id ?? undefined,
    })),
  };
}
