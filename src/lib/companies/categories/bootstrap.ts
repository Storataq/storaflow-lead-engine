import type { SupabaseClient } from "@supabase/supabase-js";

import { DEFAULT_COMPANY_CATEGORIES } from "@/lib/companies/categories/constants";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

/**
 * Ensures default company categories exist for an organization.
 * Safe to call repeatedly (idempotent by slug).
 */
export async function ensureDefaultCompanyCategories(
  supabase: Client,
  organizationId: string,
  createdBy?: string | null,
): Promise<void> {
  const { data: existing, error } = await supabase
    .from("company_categories")
    .select("id, slug")
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(error.message);
  }

  const existingSlugs = new Set((existing ?? []).map((row) => row.slug));
  const missing = DEFAULT_COMPANY_CATEGORIES.filter(
    (def) => !existingSlugs.has(def.slug),
  );

  if (missing.length === 0) return;

  const { error: insertError } = await supabase.from("company_categories").insert(
    missing.map((def) => ({
      organization_id: organizationId,
      name: def.name,
      slug: def.slug,
      description: def.description ?? null,
      icon: def.icon,
      color: def.color,
      sort_order: def.sortOrder,
      is_active: true,
      is_system_default: true,
      created_by: createdBy ?? null,
    })),
  );

  if (insertError) {
    throw new Error(insertError.message);
  }
}
