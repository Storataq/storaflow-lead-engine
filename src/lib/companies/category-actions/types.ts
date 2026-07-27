import type { CategoryActionType } from "@/lib/companies/category-actions/constants";
import type { Database } from "@/types/supabase";

export type CategoryActionRunRow =
  Database["public"]["Tables"]["company_category_action_runs"]["Row"];

export type CategoryActionPermission =
  | "view"
  | "crm"
  | "funnels"
  | "campaigns"
  | "bulk"
  | "tasks"
  | "ai";

/**
 * RBAC matrix prepared for future roles.
 * Today only owner | admin exist — both map to full action access.
 */
export function categoryActionPermissionsForRole(
  role: string,
): Set<CategoryActionPermission> {
  if (role === "owner" || role === "admin") {
    return new Set([
      "view",
      "crm",
      "funnels",
      "campaigns",
      "bulk",
      "tasks",
      "ai",
    ]);
  }
  // Future: marketing → campaigns/funnels/bulk/tasks
  // Future: manager → crm/funnels/tasks
  // Future: member → view (+ limited)
  return new Set(["view"]);
}

export function canRunCategoryAction(
  role: string,
  action: CategoryActionType,
): boolean {
  const perms = categoryActionPermissionsForRole(role);
  switch (action) {
    case "add_to_funnel":
      return perms.has("funnels") && perms.has("bulk");
    case "create_email_campaign":
    case "create_email_sequence":
      return perms.has("campaigns");
    case "generate_ai_email":
      return perms.has("ai");
    case "create_crm_tasks":
    case "follow_up_plan":
      return perms.has("tasks") && perms.has("bulk");
    case "add_tags":
    case "assign_owner":
    case "bulk_edit":
      return perms.has("crm") && perms.has("bulk");
    case "export_companies":
    case "export_contacts":
      return perms.has("view");
    default:
      return false;
  }
}

export type CategoryOverviewStats = {
  companies: number;
  contacts: number;
  qualifiedLeads: number;
  campaignReady: number;
  emailCampaigns: number;
  funnelsActivated: number;
  openTasks: number;
  lastActivityAt: string | null;
};

export type CategoryInsights = {
  companies: number;
  contacts: number;
  campaigns: number;
  funnels: number;
  conversionEstimate: number | null;
  openRate: number | null;
  replyRate: number | null;
  meetings: number;
  wonDeals: number;
};

export type CategoryActivityItem = {
  id: string;
  kind:
    | "import"
    | "email"
    | "campaign"
    | "crm"
    | "note"
    | "task"
    | "funnel"
    | "category_action";
  title: string;
  description: string;
  at: string;
};

export type CategoryCompanyListItem = {
  id: string;
  company_name: string;
  website_url: string | null;
  city: string | null;
  country: string | null;
  status: string;
  industry: string | null;
  first_found_at: string;
  category_confidence: number | null;
  category_needs_review: boolean;
  leadId: string | null;
  leadStatus: string | null;
  ownerUserId: string | null;
  tags: string[];
  campaignReady: boolean;
  campaignReadyStatus: string | null;
};
