import type { CrmDealStatus, CrmLeadStatus, CrmTaskPriority, CrmTaskStatus } from "@/types/database";
import { formatCurrency } from "@/lib/ui/format";

export const DEFAULT_PIPELINE_DEFS = [
  {
    name: "Sales",
    slug: "sales",
    description: "Standaard sales pipeline",
    color: "#2563eb",
    isDefault: true,
    sortOrder: 0,
  },
  {
    name: "Enterprise",
    slug: "enterprise",
    description: "Enterprise sales",
    color: "#7c3aed",
    isDefault: false,
    sortOrder: 1,
  },
  {
    name: "Partners",
    slug: "partners",
    description: "Partnertrajecten",
    color: "#ca8a04",
    isDefault: false,
    sortOrder: 2,
  },
  {
    name: "Renewals",
    slug: "renewals",
    description: "Contract renewals",
    color: "#0d9488",
    isDefault: false,
    sortOrder: 3,
  },
  {
    name: "Customer Success",
    slug: "customer-success",
    description: "Customer success & expansion",
    color: "#16a34a",
    isDefault: false,
    sortOrder: 4,
  },
  {
    name: "Onboarding",
    slug: "onboarding",
    description: "Klant onboarding",
    color: "#0891b2",
    isDefault: false,
    sortOrder: 5,
  },
  {
    name: "Support",
    slug: "support",
    description: "Support & retentie",
    color: "#dc2626",
    isDefault: false,
    sortOrder: 6,
  },
] as const;

export const DEFAULT_STAGE_DEFS = [
  { name: "Nieuw", slug: "nieuw", color: "#64748b", sortOrder: 0, probability: 10 },
  {
    name: "Gekwalificeerd",
    slug: "gekwalificeerd",
    color: "#2563eb",
    sortOrder: 1,
    probability: 25,
  },
  {
    name: "Discovery",
    slug: "discovery",
    color: "#0891b2",
    sortOrder: 2,
    probability: 40,
  },
  {
    name: "Proposal",
    slug: "proposal",
    color: "#0d9488",
    sortOrder: 3,
    probability: 55,
  },
  {
    name: "Negotiation",
    slug: "negotiation",
    color: "#ea580c",
    sortOrder: 4,
    probability: 75,
  },
  {
    name: "Contact gepland",
    slug: "contact-gepland",
    color: "#0891b2",
    sortOrder: 5,
    probability: 35,
  },
  {
    name: "Eerste e-mail",
    slug: "eerste-email",
    color: "#0d9488",
    sortOrder: 6,
    probability: 40,
  },
  {
    name: "Follow-up",
    slug: "follow-up",
    color: "#65a30d",
    sortOrder: 7,
    probability: 50,
  },
  {
    name: "Demo gepland",
    slug: "demo-gepland",
    color: "#ca8a04",
    sortOrder: 8,
    probability: 60,
  },
  {
    name: "Onderhandeling",
    slug: "onderhandeling",
    color: "#ea580c",
    sortOrder: 9,
    probability: 75,
  },
  {
    name: "Gewonnen",
    slug: "gewonnen",
    color: "#16a34a",
    sortOrder: 10,
    isWon: true,
    probability: 100,
  },
  {
    name: "Verloren",
    slug: "verloren",
    color: "#dc2626",
    sortOrder: 11,
    isLost: true,
    probability: 0,
  },
  {
    name: "Archived",
    slug: "archived",
    color: "#94a3b8",
    sortOrder: 12,
    probability: 0,
  },
] as const;

export const CRM_LEAD_STATUSES: { value: CrmLeadStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "won", label: "Gewonnen" },
  { value: "lost", label: "Verloren" },
  { value: "archived", label: "Gearchiveerd" },
];

export const CRM_DEAL_STATUSES: { value: CrmDealStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "won", label: "Gewonnen" },
  { value: "lost", label: "Verloren" },
];

export const CRM_TASK_PRIORITIES: { value: CrmTaskPriority; label: string }[] = [
  { value: "low", label: "Laag" },
  { value: "normal", label: "Normaal" },
  { value: "high", label: "Hoog" },
  { value: "urgent", label: "Urgent" },
];

export const CRM_TASK_STATUSES: { value: CrmTaskStatus; label: string }[] = [
  { value: "todo", label: "Te doen" },
  { value: "in_progress", label: "Bezig" },
  { value: "done", label: "Afgerond" },
  { value: "cancelled", label: "Geannuleerd" },
];

export function slugifyCrmName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function formatDealValue(value: number, currency = "EUR"): string {
  return formatCurrency(value, currency, { fallback: "€ 0" });
}
