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
    name: "Onboarding",
    slug: "onboarding",
    description: "Klant onboarding",
    color: "#0d9488",
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
    name: "Support",
    slug: "support",
    description: "Support & retentie",
    color: "#dc2626",
    isDefault: false,
    sortOrder: 3,
  },
] as const;

export const DEFAULT_STAGE_DEFS = [
  { name: "Nieuw", slug: "nieuw", color: "#64748b", sortOrder: 0 },
  { name: "Gekwalificeerd", slug: "gekwalificeerd", color: "#2563eb", sortOrder: 1 },
  { name: "Contact gepland", slug: "contact-gepland", color: "#0891b2", sortOrder: 2 },
  { name: "Eerste e-mail", slug: "eerste-email", color: "#0d9488", sortOrder: 3 },
  { name: "Follow-up", slug: "follow-up", color: "#65a30d", sortOrder: 4 },
  { name: "Demo gepland", slug: "demo-gepland", color: "#ca8a04", sortOrder: 5 },
  { name: "Onderhandeling", slug: "onderhandeling", color: "#ea580c", sortOrder: 6 },
  {
    name: "Gewonnen",
    slug: "gewonnen",
    color: "#16a34a",
    sortOrder: 7,
    isWon: true,
  },
  {
    name: "Verloren",
    slug: "verloren",
    color: "#dc2626",
    sortOrder: 8,
    isLost: true,
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
