import type { CrmLeadContactRow, CrmLeadWithRelations, LeadCompanyEnrichment } from "@/lib/crm/queries";
import { computeLeadScore } from "@/lib/crm/lead-score";

export type CompanyVerificationBadge = "verified" | "needs_review" | "incomplete";

export type EnrichmentStepStatus = "pending" | "running" | "completed";

export type EnrichmentStep = {
  id: string;
  label: string;
  status: EnrichmentStepStatus;
};

export type HealthMetric = {
  id: string;
  label: string;
  score: number;
};

export type IntelligenceScores = {
  leadScore: number;
  intentScore: number;
  fitScore: number;
  opportunityScore: number;
  priority: "Low" | "Medium" | "High" | "Critical";
};

export type ContactSummary = {
  contactCount: number;
  primaryName: string | null;
  emailCount: number;
  phoneCount: number;
  hasLinkedIn: boolean;
  hasWebsite: boolean;
};

export type CompanyActivityItem = {
  id: string;
  kind:
    | "lead_created"
    | "contact_added"
    | "task_created"
    | "deal_created"
    | "note_created"
    | "enrichment_placeholder";
  label: string;
  description: string;
  createdAt: string;
};

export function verificationBadge(
  lead: Pick<CrmLeadWithRelations, "website" | "email" | "phone" | "industry" | "city">,
  enrichment: LeadCompanyEnrichment,
): CompanyVerificationBadge {
  const filled = [
    lead.website || enrichment.website,
    lead.email,
    lead.phone || enrichment.phone,
    lead.industry || enrichment.industry,
    lead.city || enrichment.city,
    enrichment.linkedinUrl,
  ].filter((value) => Boolean(value?.toString().trim())).length;

  if (filled >= 5) return "verified";
  if (filled <= 2) return "incomplete";
  return "needs_review";
}

export function verificationLabel(badge: CompanyVerificationBadge): string {
  switch (badge) {
    case "verified":
      return "Verified";
    case "needs_review":
      return "Needs Review";
    default:
      return "Incomplete";
  }
}

export function computeContactSummary(
  lead: Pick<CrmLeadWithRelations, "email" | "phone" | "website" | "contact_name">,
  enrichment: LeadCompanyEnrichment,
  contacts: CrmLeadContactRow[],
): ContactSummary {
  const emails = new Set<string>();
  const phones = new Set<string>();

  if (lead.email?.trim()) emails.add(lead.email.trim().toLowerCase());
  if (lead.phone?.trim()) phones.add(lead.phone.trim());

  for (const contact of contacts) {
    if (contact.email?.trim()) emails.add(contact.email.trim().toLowerCase());
    if (contact.phone?.trim()) phones.add(contact.phone.trim());
  }

  const primary =
    contacts.find((contact) => contact.is_primary) ?? contacts[0] ?? null;
  const primaryName = primary
    ? `${primary.first_name} ${primary.last_name}`.trim() || null
    : lead.contact_name;

  return {
    contactCount: contacts.length || (lead.contact_name ? 1 : 0),
    primaryName,
    emailCount: emails.size,
    phoneCount: phones.size,
    hasLinkedIn: Boolean(
      enrichment.linkedinUrl?.trim() ||
        contacts.some((contact) => contact.linkedin_url?.trim()),
    ),
    hasWebsite: Boolean(lead.website?.trim() || enrichment.website?.trim()),
  };
}

export function computeCompanyHealth(
  lead: CrmLeadWithRelations,
  enrichment: LeadCompanyEnrichment,
  contacts: CrmLeadContactRow[],
): HealthMetric[] {
  const summary = computeContactSummary(lead, enrichment, contacts);
  const leadScore = computeLeadScore({
    ...lead,
    linkedinUrl: enrichment.linkedinUrl,
    companySize: enrichment.companySize,
  }).score;

  const profileFields = [
    lead.company_name,
    lead.website || enrichment.website,
    lead.email,
    lead.phone || enrichment.phone,
    lead.industry || enrichment.industry,
    lead.city || enrichment.city,
    lead.country || enrichment.country,
    enrichment.region,
    enrichment.postalCode,
    enrichment.linkedinUrl,
    enrichment.facebookUrl,
    enrichment.instagramUrl,
  ];
  const profileFilled = profileFields.filter((value) =>
    Boolean(value?.toString().trim()),
  ).length;
  const profileCompleteness = Math.round(
    (profileFilled / profileFields.length) * 100,
  );

  const websiteQuality = lead.website || enrichment.website ? 78 : 22;
  const contactAvailability = Math.min(
    100,
    summary.emailCount * 25 +
      summary.phoneCount * 25 +
      (summary.hasLinkedIn ? 25 : 0) +
      (summary.contactCount > 0 ? 25 : 0),
  );
  const trustScore = Math.round(
    (websiteQuality + profileCompleteness + leadScore) / 3,
  );

  return [
    { id: "website", label: "Website Quality", score: websiteQuality },
    {
      id: "profile",
      label: "Profile Completeness",
      score: profileCompleteness,
    },
    { id: "lead", label: "Lead Quality", score: leadScore },
    {
      id: "contacts",
      label: "Contact Availability",
      score: contactAvailability,
    },
    { id: "trust", label: "Trust Score", score: trustScore },
  ];
}

export function computeIntelligenceScores(
  lead: CrmLeadWithRelations,
  enrichment: LeadCompanyEnrichment,
  openDeals: number,
  openTasks: number,
): IntelligenceScores {
  const leadScore = computeLeadScore({
    ...lead,
    linkedinUrl: enrichment.linkedinUrl,
    companySize: enrichment.companySize,
  }).score;

  const intentScore = Math.min(
    100,
    Math.round(
      leadScore * 0.45 +
        (openTasks > 0 ? 20 : 0) +
        (openDeals > 0 ? 25 : 0) +
        (lead.email ? 10 : 0),
    ),
  );
  const fitScore = Math.min(
    100,
    Math.round(
      (lead.industry || enrichment.industry ? 30 : 5) +
        (lead.website || enrichment.website ? 25 : 5) +
        (enrichment.linkedinUrl ? 20 : 5) +
        (lead.city || enrichment.city ? 15 : 5) +
        (enrichment.companySize ? 10 : 0),
    ),
  );
  const opportunityScore = Math.min(
    100,
    Math.round(
      Number(lead.deal_value) > 0
        ? Math.min(40, Number(lead.deal_value) / 250)
        : 15 + openDeals * 20 + intentScore * 0.35,
    ),
  );

  const average = (leadScore + intentScore + fitScore + opportunityScore) / 4;
  let priority: IntelligenceScores["priority"] = "Low";
  if (average >= 80) priority = "Critical";
  else if (average >= 60) priority = "High";
  else if (average >= 40) priority = "Medium";

  return {
    leadScore,
    intentScore,
    fitScore,
    opportunityScore,
    priority,
  };
}

export function enrichmentSteps(
  lead: CrmLeadWithRelations,
  enrichment: LeadCompanyEnrichment,
  contacts: CrmLeadContactRow[],
): EnrichmentStep[] {
  const hasWebsite = Boolean(lead.website || enrichment.website);
  const hasSocial = Boolean(
    enrichment.linkedinUrl ||
      enrichment.facebookUrl ||
      enrichment.instagramUrl,
  );
  const hasContacts = contacts.length > 0 || Boolean(lead.contact_name);
  const hasEmail = Boolean(lead.email || contacts.some((c) => c.email));

  return [
    {
      id: "website_scan",
      label: "Website scan",
      status: hasWebsite ? "completed" : "pending",
    },
    {
      id: "business_profile",
      label: "Business profile",
      status: enrichment.description ? "completed" : "pending",
    },
    {
      id: "contacts",
      label: "Contacts",
      status: hasContacts ? "completed" : "pending",
    },
    {
      id: "social_media",
      label: "Social media",
      status: hasSocial ? "completed" : "pending",
    },
    {
      id: "email_discovery",
      label: "Email discovery",
      status: hasEmail ? "completed" : "pending",
    },
    {
      id: "ai_analysis",
      label: "AI Analysis",
      status: "pending",
    },
  ];
}

export function buildCompanyActivityTimeline(input: {
  leadCreatedAt: string;
  activities: { id: string; event_type: string; description: string; created_at: string }[];
  contacts: CrmLeadContactRow[];
  tasksCreatedHints: { id: string; title: string; created_at: string }[];
  deals: { id: string; title: string; created_at: string }[];
  notes: { id: string; created_at: string }[];
}): CompanyActivityItem[] {
  const items: CompanyActivityItem[] = [
    {
      id: `lead-${input.leadCreatedAt}`,
      kind: "lead_created",
      label: "Lead created",
      description: "Lead aangemaakt in CRM",
      createdAt: input.leadCreatedAt,
    },
    {
      id: "enrichment-placeholder",
      kind: "enrichment_placeholder",
      label: "Placeholder enrichment",
      description: "Company enrichment staat klaar (nog geen backend)",
      createdAt: input.leadCreatedAt,
    },
  ];

  for (const contact of input.contacts) {
    items.push({
      id: `contact-${contact.id}`,
      kind: "contact_added",
      label: "Contact added",
      description: `${contact.first_name} ${contact.last_name}`.trim(),
      createdAt: contact.created_at,
    });
  }

  for (const task of input.tasksCreatedHints) {
    items.push({
      id: `task-${task.id}`,
      kind: "task_created",
      label: "Task created",
      description: task.title,
      createdAt: task.created_at,
    });
  }

  for (const deal of input.deals) {
    items.push({
      id: `deal-${deal.id}`,
      kind: "deal_created",
      label: "Deal created",
      description: deal.title,
      createdAt: deal.created_at,
    });
  }

  for (const note of input.notes) {
    items.push({
      id: `note-${note.id}`,
      kind: "note_created",
      label: "Note created",
      description: "Notitie toegevoegd",
      createdAt: note.created_at,
    });
  }

  for (const activity of input.activities) {
    if (activity.event_type.includes("lead.created")) continue;
    items.push({
      id: `activity-${activity.id}`,
      kind: activity.event_type.includes("deal")
        ? "deal_created"
        : activity.event_type.includes("task")
          ? "task_created"
          : activity.event_type.includes("note")
            ? "note_created"
            : activity.event_type.includes("contact")
              ? "contact_added"
              : "lead_created",
      label: activity.event_type.includes("deal")
        ? "Deal created"
        : activity.event_type.includes("task")
          ? "Task created"
          : activity.event_type.includes("note")
            ? "Note created"
            : activity.event_type.includes("contact")
              ? "Contact added"
              : "Lead created",
      description: activity.description,
      createdAt: activity.created_at,
    });
  }

  return items.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function scoreTone(score: number): "green" | "orange" | "red" {
  if (score >= 70) return "green";
  if (score >= 40) return "orange";
  return "red";
}
