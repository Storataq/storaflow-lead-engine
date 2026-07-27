import type { ConfidenceBand } from "@/lib/companies/classification/constants";
import type { Database } from "@/types/supabase";

export type CompanyClassificationRow =
  Database["public"]["Tables"]["company_category_classifications"]["Row"];

export type CompanyClassificationHistoryRow =
  Database["public"]["Tables"]["company_category_classification_history"]["Row"];

export type ClassificationSource =
  | "scrape"
  | "search"
  | "enrichment"
  | "csv_import"
  | "manual_create"
  | "manual_reclassify"
  | "bulk"
  | "reset_automatic";

export type ClassificationAlternative = {
  categoryId: string;
  name: string;
  slug: string;
  confidence: number;
};

export type ClassificationSignals = {
  companyName?: string | null;
  websiteUrl?: string | null;
  industry?: string | null;
  description?: string | null;
  notes?: string | null;
  city?: string | null;
  country?: string | null;
  websiteTitle?: string | null;
  metaDescription?: string | null;
  aboutText?: string | null;
  homepageText?: string | null;
  keywords?: string[] | null;
  googleCategories?: string[] | null;
  linkedinIndustry?: string | null;
  products?: string[] | null;
  services?: string[] | null;
  technologies?: string[] | null;
};

export type ClassificationResult = {
  suggestedCategoryId: string | null;
  suggestedCategoryName: string | null;
  suggestedCategorySlug: string | null;
  confidence: number;
  confidenceBand: ConfidenceBand;
  reason: string;
  keywordsFound: string[];
  alternatives: ClassificationAlternative[];
  classifiedBy: "automatic" | "hybrid";
  provider: string | null;
  model: string | null;
  inputSummary: Record<string, unknown>;
};

export type ApplyClassificationInput = {
  organizationId: string;
  companyId: string;
  result: ClassificationResult;
  source: ClassificationSource;
  actorUserId?: string | null;
  /** Force apply even when manual override is set. */
  force?: boolean;
  /** When true, clear manual override (reset automatic). */
  resetManualOverride?: boolean;
};
