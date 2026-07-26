import { createClient } from "@/lib/supabase/server";
import type { SearchSortOption } from "@/lib/searches/constants";
import type { SearchCriteriaStatus } from "@/types/database";
import type { Database } from "@/types/supabase";

export type SearchQueryRow =
  Database["public"]["Tables"]["search_queries"]["Row"];

export type ListSearchQueriesInput = {
  organizationId: string;
  q?: string;
  status?: SearchCriteriaStatus | "all";
  sort?: SearchSortOption;
};

export async function listSearchQueries(
  input: ListSearchQueriesInput,
): Promise<SearchQueryRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("search_queries")
    .select("*")
    .eq("organization_id", input.organizationId);

  if (input.status && input.status !== "all") {
    query = query.eq("status", input.status);
  }

  if (input.q && input.q.trim()) {
    query = query.ilike("name", `%${input.q.trim()}%`);
  }

  switch (input.sort) {
    case "oldest":
      query = query.order("updated_at", { ascending: true });
      break;
    case "name_asc":
      query = query.order("name", { ascending: true });
      break;
    case "name_desc":
      query = query.order("name", { ascending: false });
      break;
    case "newest":
    default:
      query = query.order("updated_at", { ascending: false });
      break;
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getSearchQuery(
  organizationId: string,
  id: string,
): Promise<SearchQueryRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("search_queries")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
