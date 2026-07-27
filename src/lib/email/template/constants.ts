/**
 * Template categories, statuses, folders — Phase 21B constants.
 */

export const EMAIL_TEMPLATE_CATEGORIES = [
  "cold_outreach",
  "follow_up",
  "welcome",
  "introduction",
  "reminder",
  "appointment",
  "partnership",
  "newsletter",
  "sales",
  "marketing",
  "support",
  "announcement",
  "seasonal",
  "custom",
  "future",
] as const;

export type EmailTemplateCategory = (typeof EMAIL_TEMPLATE_CATEGORIES)[number];

export const EMAIL_TEMPLATE_CATEGORY_LABELS: Record<EmailTemplateCategory, string> = {
  cold_outreach: "Cold Outreach",
  follow_up: "Follow-up",
  welcome: "Welcome",
  introduction: "Introduction",
  reminder: "Reminder",
  appointment: "Appointment",
  partnership: "Partnership",
  newsletter: "Newsletter",
  sales: "Sales",
  marketing: "Marketing",
  support: "Support",
  announcement: "Announcement",
  seasonal: "Seasonal",
  custom: "Custom",
  future: "Future Categories",
};

export const EMAIL_TEMPLATE_STATUSES = [
  "draft",
  "active",
  "archived",
  "deprecated",
] as const;

export type EmailTemplateStatusExtended =
  (typeof EMAIL_TEMPLATE_STATUSES)[number];

export const EMAIL_TEMPLATE_STATUS_LABELS: Record<
  EmailTemplateStatusExtended,
  string
> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
  deprecated: "Deprecated",
};

export const DEFAULT_TEMPLATE_FOLDER_DEFS = [
  { name: "Sales", slug: "sales", sortOrder: 0 },
  { name: "Marketing", slug: "marketing", sortOrder: 1 },
  { name: "Support", slug: "support", sortOrder: 2 },
  { name: "Internal", slug: "internal", sortOrder: 3 },
  { name: "Archive", slug: "archive", sortOrder: 4 },
] as const;

export const SUGGESTED_TEMPLATE_TAGS = [
  "Sales",
  "Retail",
  "Hospitality",
  "Pilot",
  "VIP",
  "Newsletter",
  "General",
] as const;

export const DEFAULT_VARIABLE_FALLBACKS: Record<string, string> = {
  contactFirstName: "there",
  contactLastName: "",
  jobTitle: "team",
  companyName: "your company",
  industry: "your industry",
  city: "",
  country: "",
  website: "",
  phone: "",
  email: "",
  ownerName: "our team",
  companyDescription: "",
  unsubscribeLink: "#",
};
