import { createClient } from "@/lib/supabase/server";
import type {
  CompanyClassificationHistoryRow,
  CompanyClassificationRow,
} from "@/lib/companies/classification/types";

export type {
  CompanyClassificationHistoryRow,
  CompanyClassificationRow,
} from "@/lib/companies/classification/types";

export async function getCompanyClassification(
  organizationId: string,
  companyId: string,
): Promise<CompanyClassificationRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_category_classifications")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function listCompanyClassificationHistory(
  organizationId: string,
  companyId: string,
  limit = 20,
): Promise<CompanyClassificationHistoryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_category_classification_history")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getClassificationDashboardStats(organizationId: string) {
  const supabase = await createClient();
  const { data: companies, error } = await supabase
    .from("companies")
    .select(
      "company_category_id, category_needs_review, category_confidence, category_manual_override, suggested_company_category_id",
    )
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);

  const rows = companies ?? [];
  const needingReview = rows.filter((r) => r.category_needs_review).length;
  const unknown = rows.filter(
    (r) =>
      !r.company_category_id &&
      (r.category_confidence == null || Number(r.category_confidence) < 50),
  ).length;
  const withConfidence = rows.filter((r) => r.category_confidence != null);
  const avgConfidence =
    withConfidence.length === 0
      ? null
      : Math.round(
          (withConfidence.reduce(
            (sum, r) => sum + Number(r.category_confidence ?? 0),
            0,
          ) /
            withConfidence.length) *
            10,
        ) / 10;

  const suggestedCounts = new Map<string, number>();
  for (const row of rows) {
    if (!row.suggested_company_category_id) continue;
    suggestedCounts.set(
      row.suggested_company_category_id,
      (suggestedCounts.get(row.suggested_company_category_id) ?? 0) + 1,
    );
  }

  const { data: categories } = await supabase
    .from("company_categories")
    .select("id, name, color")
    .eq("organization_id", organizationId);

  const byId = new Map((categories ?? []).map((c) => [c.id, c]));
  const topDetected = Array.from(suggestedCounts.entries())
    .map(([id, count]) => ({
      categoryId: id,
      name: byId.get(id)?.name ?? "Unknown",
      color: byId.get(id)?.color ?? "#64748B",
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    needingReview,
    unknown,
    avgConfidence,
    topDetected,
    total: rows.length,
    manualOverrides: rows.filter((r) => r.category_manual_override).length,
  };
}
