/**
 * Revenue Intelligence queries.
 */

import { ensureRevenueIntelligenceAgent } from "@/lib/revenue-intelligence/agent";
import {
  ensureRevenueSettings,
  getRevenueDashboard,
} from "@/lib/revenue-intelligence/engine";
import type {
  RevenueAlertRow,
  RevenueForecastRow,
  RevenueHistoryEventRow,
  RevenueInsightRow,
  RevenueRecommendationRow,
  RevenueReportRow,
  RevenueScenarioRow,
  RevenueSnapshotRow,
} from "@/lib/revenue-intelligence/types";
import { createClient } from "@/lib/supabase/server";

export async function bootstrapRevenueIntelligence(
  organizationId: string,
  userId?: string | null,
) {
  const [settings, agent] = await Promise.all([
    ensureRevenueSettings(organizationId),
    ensureRevenueIntelligenceAgent(organizationId, userId),
  ]);
  return { settings, agent };
}

export { getRevenueDashboard, ensureRevenueSettings };

export async function listRevenueSnapshots(organizationId: string, limit = 20) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("revenue_intel_snapshots")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as RevenueSnapshotRow[];
}

export async function listRevenueForecasts(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("revenue_intel_forecasts")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(24);
  return (data ?? []) as RevenueForecastRow[];
}

export async function listRevenueScenarios(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("revenue_intel_scenarios")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as RevenueScenarioRow[];
}

export async function listRevenueInsights(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("revenue_intel_insights")
    .select("*")
    .eq("organization_id", organizationId)
    .order("priority", { ascending: false })
    .limit(50);
  return (data ?? []) as RevenueInsightRow[];
}

export async function listRevenueRecommendations(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("revenue_intel_recommendations")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", "open")
    .order("priority", { ascending: false })
    .limit(50);
  return (data ?? []) as RevenueRecommendationRow[];
}

export async function listRevenueAlerts(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("revenue_intel_alerts")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as RevenueAlertRow[];
}

export async function listRevenueReports(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("revenue_intel_reports")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as RevenueReportRow[];
}

export async function listRevenueHistory(organizationId: string, limit = 100) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("revenue_intel_history_events")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as RevenueHistoryEventRow[];
}
