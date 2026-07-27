import type { Database } from "@/types/supabase";

export type CompanyCategoryRow =
  Database["public"]["Tables"]["company_categories"]["Row"];

export type CompanyCategoryWithCount = CompanyCategoryRow & {
  companyCount: number;
};

export type CategoryFilterMode =
  | "all"
  | "active"
  | "inactive"
  | "none"
  | "selected";
