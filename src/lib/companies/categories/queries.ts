import { createClient } from "@/lib/supabase/server";
import { ensureDefaultCompanyCategories } from "@/lib/companies/categories/bootstrap";
import type {
  CompanyCategoryRow,
  CompanyCategoryWithCount,
} from "@/lib/companies/categories/types";

export type {
  CompanyCategoryRow,
  CompanyCategoryWithCount,
  CategoryFilterMode,
} from "@/lib/companies/categories/types";

export async function listCompanyCategories(
  organizationId: string,
  options?: { activeOnly?: boolean },
): Promise<CompanyCategoryRow[]> {
  const supabase = await createClient();
  await ensureDefaultCompanyCategories(supabase, organizationId).catch(() => {
    // Table may not exist yet before migration; callers handle empty/error.
  });

  let query = supabase
    .from("company_categories")
    .select("*")
    .eq("organization_id", organizationId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (options?.activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listCompanyCategoriesWithCounts(
  organizationId: string,
): Promise<CompanyCategoryWithCount[]> {
  const supabase = await createClient();
  await ensureDefaultCompanyCategories(supabase, organizationId).catch(() => undefined);

  const [{ data: categories, error: catError }, { data: companies, error: coError }] =
    await Promise.all([
      supabase
        .from("company_categories")
        .select("*")
        .eq("organization_id", organizationId)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("companies")
        .select("company_category_id")
        .eq("organization_id", organizationId),
    ]);

  if (catError) throw new Error(catError.message);
  if (coError) throw new Error(coError.message);

  const counts = new Map<string, number>();
  for (const row of companies ?? []) {
    if (!row.company_category_id) continue;
    counts.set(
      row.company_category_id,
      (counts.get(row.company_category_id) ?? 0) + 1,
    );
  }

  return (categories ?? []).map((category) => ({
    ...category,
    companyCount: counts.get(category.id) ?? 0,
  }));
}

export async function getCompanyCategory(
  organizationId: string,
  categoryId: string,
): Promise<CompanyCategoryRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_categories")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", categoryId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function findCompanyCategoryByName(
  organizationId: string,
  name: string,
): Promise<CompanyCategoryRow | null> {
  const supabase = await createClient();
  const normalized = name.trim();
  if (!normalized) return null;

  const { data, error } = await supabase
    .from("company_categories")
    .select("*")
    .eq("organization_id", organizationId)
    .ilike("name", normalized)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function countCompaniesByCategory(
  organizationId: string,
): Promise<Array<{ categoryId: string | null; name: string; color: string | null; count: number }>> {
  const supabase = await createClient();
  await ensureDefaultCompanyCategories(supabase, organizationId).catch(() => undefined);

  const [{ data: categories }, { data: companies, error }] = await Promise.all([
    supabase
      .from("company_categories")
      .select("id, name, color, is_active")
      .eq("organization_id", organizationId),
    supabase
      .from("companies")
      .select("company_category_id")
      .eq("organization_id", organizationId),
  ]);

  if (error) throw new Error(error.message);

  const byId = new Map((categories ?? []).map((c) => [c.id, c]));
  const counts = new Map<string | null, number>();

  for (const row of companies ?? []) {
    const key = row.company_category_id;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const rows: Array<{
    categoryId: string | null;
    name: string;
    color: string | null;
    count: number;
  }> = [];

  for (const [categoryId, count] of counts) {
    if (!categoryId) {
      rows.push({
        categoryId: null,
        name: "No category",
        color: "#94A3B8",
        count,
      });
      continue;
    }
    const cat = byId.get(categoryId);
    rows.push({
      categoryId,
      name: cat?.name ?? "Unknown",
      color: cat?.color ?? "#64748B",
      count,
    });
  }

  return rows.sort((a, b) => b.count - a.count);
}
