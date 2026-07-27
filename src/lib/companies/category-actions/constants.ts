/**
 * Phase 23C — Category action registry (extension points).
 * Future modules register here without redesigning CRM/email/funnels.
 */

export const CATEGORY_ACTION_TYPES = [
  "add_to_funnel",
  "create_email_campaign",
  "create_email_sequence",
  "generate_ai_email",
  "create_crm_tasks",
  "add_tags",
  "assign_owner",
  "export_companies",
  "export_contacts",
  "follow_up_plan",
  "bulk_edit",
] as const;

export type CategoryActionType = (typeof CATEGORY_ACTION_TYPES)[number];

export const CATEGORY_ACTION_LABELS: Record<CategoryActionType, string> = {
  add_to_funnel: "Add to Funnel",
  create_email_campaign: "Start Email Campaign",
  create_email_sequence: "Create Email Sequence",
  generate_ai_email: "Generate AI Email",
  create_crm_tasks: "Create CRM Task",
  add_tags: "Add Tag",
  assign_owner: "Assign Owner",
  export_companies: "Export Companies",
  export_contacts: "Export Contacts",
  follow_up_plan: "Create Follow-up Plan",
  bulk_edit: "Bulk Edit",
};

/** Soft cap for server-side category bulk loops (safety). */
export const CATEGORY_ACTION_BULK_MAX = 100;

/**
 * Future capability keys — reserved for marketplace / plugins.
 * Do not implement handlers for these in Phase 23C.
 */
export const FUTURE_CATEGORY_CAPABILITIES = [
  "ai_qualification",
  "sales_automation",
  "whatsapp_campaigns",
  "sms",
  "webhooks",
  "marketplace",
] as const;
