import type { SupabaseClient } from "@supabase/supabase-js";

import type { CategoryActionType } from "@/lib/companies/category-actions/constants";
import type { Json, Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

export async function recordCategoryActionRun(
  supabase: Client,
  input: {
    organizationId: string;
    categoryId: string;
    actionType: CategoryActionType | string;
    companyIds: string[];
    actorUserId: string | null;
    confirmed?: boolean;
    status?: "pending" | "running" | "completed" | "failed" | "cancelled";
    resultSummary?: Record<string, unknown>;
    errorMessage?: string | null;
  },
): Promise<string | null> {
  const { data, error } = await supabase
    .from("company_category_action_runs")
    .insert({
      organization_id: input.organizationId,
      company_category_id: input.categoryId,
      action_type: input.actionType,
      status: input.status ?? "completed",
      company_ids: input.companyIds as unknown as Json,
      company_count: input.companyIds.length,
      result_summary: (input.resultSummary ?? {}) as Json,
      error_message: input.errorMessage ?? null,
      actor_user_id: input.actorUserId,
      confirmed: Boolean(input.confirmed),
      completed_at:
        (input.status ?? "completed") === "completed" ||
        (input.status ?? "completed") === "failed"
          ? new Date().toISOString()
          : null,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    // Table may not exist until migration 000025 — non-blocking.
    return null;
  }
  return data?.id ?? null;
}
