/**
 * Company Enrichment Engine (mock).
 *
 * Later replace MockCompanyEnrichmentService with connector-backed
 * implementations (Google Maps, Search, LinkedIn, Facebook, OpenCorporates, OpenAI)
 * without changing UI contracts.
 */

import type {
  CrmLeadContactRow,
  CrmLeadWithRelations,
  LeadCompanyEnrichment,
} from "@/lib/crm/queries";

export type EnrichmentFieldStatus =
  | "verified"
  | "missing"
  | "estimated"
  | "placeholder"
  | "mock";

export type CompanyScoreLabel = "Excellent" | "Good" | "Average" | "Poor";

export type EnrichmentCardKind =
  | "company_score"
  | "website"
  | "contact"
  | "social"
  | "business"
  | "google"
  | "technology"
  | "trust";

export interface EnrichmentField<T = string | number | boolean | null> {
  key: string;
  label: string;
  status: EnrichmentFieldStatus;
  value: T;
  confidence: number;
  lastUpdated: string;
  source: string;
}

export interface EnrichmentScoreBreakdownItem {
  key: string;
  label: string;
  points: number;
  awarded: boolean;
}

export interface EnrichmentScore {
  total: number;
  label: CompanyScoreLabel;
  breakdown: EnrichmentScoreBreakdownItem[];
  lastUpdated: string;
  source: string;
}

export interface EnrichmentTimelineEvent {
  id: string;
  label: string;
  description: string;
  status: EnrichmentFieldStatus;
  occurredAt: string;
  source: string;
}

export interface EnrichmentSourceRef {
  id: string;
  name: string;
  type: string;
  description: string;
}

export interface EnrichmentCardItem {
  key: string;
  label: string;
  value: string;
  status: EnrichmentFieldStatus;
  confidence: number;
  source: string;
  lastUpdated: string;
}

export interface EnrichmentCard {
  kind: EnrichmentCardKind;
  title: string;
  description: string;
  status: EnrichmentFieldStatus;
  confidence: number;
  source: string;
  lastUpdated: string;
  items: EnrichmentCardItem[];
}

export interface CompanyEnrichmentResult {
  leadId: string;
  companyId: string | null;
  companyName: string;
  score: EnrichmentScore;
  fields: {
    websitePresent: EnrichmentField<boolean>;
    sslPresent: EnrichmentField<boolean>;
    emailFound: EnrichmentField<string | null>;
    phoneFound: EnrichmentField<string | null>;
    linkedin: EnrichmentField<string | null>;
    facebook: EnrichmentField<string | null>;
    instagram: EnrichmentField<string | null>;
    googleBusiness: EnrichmentField<string | null>;
    kvk: EnrichmentField<string | null>;
    employees: EnrichmentField<string | null>;
    revenue: EnrichmentField<string | null>;
    founded: EnrichmentField<string | null>;
  };
  cards: EnrichmentCard[];
  timeline: EnrichmentTimelineEvent[];
  sources: EnrichmentSourceRef[];
}

export interface CompanyEnrichmentInput {
  lead: CrmLeadWithRelations;
  enrichment: LeadCompanyEnrichment;
  contacts?: CrmLeadContactRow[];
  /** Optional seed for stable mock values per company/lead */
  now?: Date;
}

export interface CompanyEnrichmentService {
  build(input: CompanyEnrichmentInput): CompanyEnrichmentResult;
  recalculateScore(result: CompanyEnrichmentResult): EnrichmentScore;
}

const SCORE_WEIGHTS = [
  { key: "website", label: "Website", points: 10 },
  { key: "ssl", label: "SSL", points: 10 },
  { key: "email", label: "Email", points: 10 },
  { key: "phone", label: "Phone", points: 10 },
  { key: "linkedin", label: "LinkedIn", points: 10 },
  { key: "facebook", label: "Facebook", points: 5 },
  { key: "instagram", label: "Instagram", points: 5 },
  { key: "google_business", label: "Google Business", points: 15 },
  { key: "employees", label: "Employees bekend", points: 10 },
  { key: "revenue", label: "Revenue bekend", points: 10 },
  { key: "founded", label: "Founded bekend", points: 5 },
] as const;

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function scoreLabelFromTotal(total: number): CompanyScoreLabel {
  if (total >= 80) return "Excellent";
  if (total >= 60) return "Good";
  if (total >= 40) return "Average";
  return "Poor";
}

export function enrichmentStatusLabel(status: EnrichmentFieldStatus): string {
  switch (status) {
    case "verified":
      return "Verified";
    case "missing":
      return "Missing";
    case "estimated":
      return "Estimated";
    case "placeholder":
      return "Placeholder";
    case "mock":
      return "Mock";
  }
}

function iso(date: Date): string {
  return date.toISOString();
}

function minutesAgo(base: Date, minutes: number): string {
  return iso(new Date(base.getTime() - minutes * 60_000));
}

function display(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Ja" : "Nee";
  return String(value);
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function pickEmail(
  lead: CrmLeadWithRelations,
  contacts: CrmLeadContactRow[],
): string | null {
  if (hasText(lead.email)) return lead.email!.trim();
  const fromContact = contacts.find((c) => hasText(c.email));
  return fromContact?.email?.trim() ?? null;
}

function pickPhone(
  lead: CrmLeadWithRelations,
  enrichment: LeadCompanyEnrichment,
  contacts: CrmLeadContactRow[],
): string | null {
  if (hasText(lead.phone)) return lead.phone!.trim();
  if (hasText(enrichment.phone)) return enrichment.phone!.trim();
  const fromContact = contacts.find((c) => hasText(c.phone));
  return fromContact?.phone?.trim() ?? null;
}

function websiteUrl(
  lead: CrmLeadWithRelations,
  enrichment: LeadCompanyEnrichment,
): string | null {
  const raw = lead.website?.trim() || enrichment.website?.trim() || null;
  return raw;
}

function inferSsl(url: string | null): boolean {
  if (!url) return false;
  const normalized = url.toLowerCase();
  if (normalized.startsWith("https://")) return true;
  if (normalized.startsWith("http://")) return false;
  // Mock assumption for bare domains — replace with real SSL probe later
  return true;
}

function stableMockSuffix(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 10_000;
  }
  return Math.abs(hash);
}

function buildField<T>(
  key: string,
  label: string,
  value: T,
  status: EnrichmentFieldStatus,
  confidence: number,
  lastUpdated: string,
  source: string,
): EnrichmentField<T> {
  return {
    key,
    label,
    value,
    status,
    confidence: clampScore(confidence),
    lastUpdated,
    source,
  };
}

function aggregateStatus(
  statuses: EnrichmentFieldStatus[],
): EnrichmentFieldStatus {
  if (statuses.every((s) => s === "missing")) return "missing";
  if (statuses.some((s) => s === "verified")) return "verified";
  if (statuses.some((s) => s === "estimated")) return "estimated";
  if (statuses.some((s) => s === "mock")) return "mock";
  if (statuses.some((s) => s === "placeholder")) return "placeholder";
  return "missing";
}

function averageConfidence(values: number[]): number {
  if (values.length === 0) return 0;
  return clampScore(values.reduce((sum, n) => sum + n, 0) / values.length);
}

function latestTimestamp(values: string[]): string {
  if (values.length === 0) return new Date(0).toISOString();
  return values.reduce((latest, current) =>
    current > latest ? current : latest,
  );
}

export function calculateEnrichmentScore(flags: {
  website: boolean;
  ssl: boolean;
  email: boolean;
  phone: boolean;
  linkedin: boolean;
  facebook: boolean;
  instagram: boolean;
  googleBusiness: boolean;
  employees: boolean;
  revenue: boolean;
  founded: boolean;
  lastUpdated: string;
}): EnrichmentScore {
  const map: Record<string, boolean> = {
    website: flags.website,
    ssl: flags.ssl,
    email: flags.email,
    phone: flags.phone,
    linkedin: flags.linkedin,
    facebook: flags.facebook,
    instagram: flags.instagram,
    google_business: flags.googleBusiness,
    employees: flags.employees,
    revenue: flags.revenue,
    founded: flags.founded,
  };

  const breakdown = SCORE_WEIGHTS.map((item) => ({
    key: item.key,
    label: item.label,
    points: item.points,
    awarded: Boolean(map[item.key]),
  }));

  const total = clampScore(
    breakdown.reduce((sum, item) => sum + (item.awarded ? item.points : 0), 0),
  );

  return {
    total,
    label: scoreLabelFromTotal(total),
    breakdown,
    lastUpdated: flags.lastUpdated,
    source: "enrichment_score_engine",
  };
}

/**
 * Mock enrichment service — swap implementation later for live connectors.
 */
export class MockCompanyEnrichmentService implements CompanyEnrichmentService {
  build(input: CompanyEnrichmentInput): CompanyEnrichmentResult {
    const now = input.now ?? new Date();
    const { lead, enrichment } = input;
    const contacts = input.contacts ?? [];
    const seed = lead.company_id ?? lead.id;
    const mockN = stableMockSuffix(seed);

    const website = websiteUrl(lead, enrichment);
    const websitePresent = Boolean(website);
    const ssl = inferSsl(website);
    const email = pickEmail(lead, contacts);
    const phone = pickPhone(lead, enrichment, contacts);
    const linkedin = enrichment.linkedinUrl?.trim() || null;
    const facebook = enrichment.facebookUrl?.trim() || null;
    const instagram = enrichment.instagramUrl?.trim() || null;

    // Mock connector placeholders — replace with Google Maps / Search later
    const googleBusiness =
      websitePresent || hasText(lead.city)
        ? `${lead.company_name} · Google Business (mock)`
        : null;
    const kvk = `KVK-${String(10000000 + (mockN % 89999999)).padStart(8, "0")}`;
    const employees =
      enrichment.companySize?.trim() ||
      (["1-10", "11-50", "51-200", "201-500"][mockN % 4] ?? "11-50");
    const revenueBands = ["€100k–€500k", "€500k–€2M", "€2M–€10M", "€10M+"];
    const revenue = revenueBands[mockN % revenueBands.length] ?? "€500k–€2M";
    const foundedYear = 1995 + (mockN % 28);

    const updatedLead = minutesAgo(now, 5);
    const updatedCompany = minutesAgo(now, 12);
    const updatedMock = minutesAgo(now, 2);

    const fields = {
      websitePresent: buildField(
        "website_present",
        "Website aanwezig",
        websitePresent,
        websitePresent ? "verified" : "missing",
        websitePresent ? 95 : 0,
        websitePresent ? updatedLead : updatedMock,
        websitePresent ? "crm_lead|company_record" : "mock_connector",
      ),
      sslPresent: buildField(
        "ssl_present",
        "SSL aanwezig",
        ssl,
        websitePresent ? (ssl ? "estimated" : "missing") : "missing",
        websitePresent ? (ssl ? 70 : 40) : 0,
        updatedMock,
        "mock_ssl_probe",
      ),
      emailFound: buildField(
        "email_found",
        "Email gevonden",
        email,
        email ? "verified" : "missing",
        email ? 90 : 0,
        email ? updatedLead : updatedMock,
        email ? "crm_lead|crm_lead_contacts" : "mock_connector",
      ),
      phoneFound: buildField(
        "phone_found",
        "Telefoon gevonden",
        phone,
        phone ? "verified" : "missing",
        phone ? 88 : 0,
        phone ? updatedLead : updatedMock,
        phone ? "crm_lead|company_record" : "mock_connector",
      ),
      linkedin: buildField(
        "linkedin",
        "LinkedIn",
        linkedin,
        linkedin ? "verified" : "missing",
        linkedin ? 85 : 0,
        linkedin ? updatedCompany : updatedMock,
        linkedin ? "company_record" : "mock_linkedin_connector",
      ),
      facebook: buildField(
        "facebook",
        "Facebook",
        facebook,
        facebook ? "verified" : "missing",
        facebook ? 80 : 0,
        facebook ? updatedCompany : updatedMock,
        facebook ? "company_record" : "mock_facebook_connector",
      ),
      instagram: buildField(
        "instagram",
        "Instagram",
        instagram,
        instagram ? "verified" : "missing",
        instagram ? 80 : 0,
        instagram ? updatedCompany : updatedMock,
        instagram ? "company_record" : "mock_instagram_connector",
      ),
      googleBusiness: buildField(
        "google_business",
        "Google Business",
        googleBusiness,
        googleBusiness ? "mock" : "missing",
        googleBusiness ? 55 : 0,
        updatedMock,
        "mock_google_maps_connector",
      ),
      kvk: buildField(
        "kvk",
        "KvK",
        kvk,
        "placeholder",
        35,
        updatedMock,
        "mock_opencorporates",
      ),
      employees: buildField(
        "employees",
        "Employees",
        employees,
        enrichment.companySize ? "estimated" : "placeholder",
        enrichment.companySize ? 60 : 30,
        updatedMock,
        enrichment.companySize ? "company_record" : "mock_business_details",
      ),
      revenue: buildField(
        "revenue",
        "Revenue",
        revenue,
        "placeholder",
        25,
        updatedMock,
        "mock_business_details",
      ),
      founded: buildField(
        "founded",
        "Founded",
        String(foundedYear),
        "placeholder",
        25,
        updatedMock,
        "mock_business_details",
      ),
    };

    const score = calculateEnrichmentScore({
      website: fields.websitePresent.value,
      ssl: fields.sslPresent.value,
      email: Boolean(fields.emailFound.value),
      phone: Boolean(fields.phoneFound.value),
      linkedin: Boolean(fields.linkedin.value),
      facebook: Boolean(fields.facebook.value),
      instagram: Boolean(fields.instagram.value),
      googleBusiness: Boolean(fields.googleBusiness.value),
      employees: Boolean(fields.employees.value),
      revenue: Boolean(fields.revenue.value),
      founded: Boolean(fields.founded.value),
      lastUpdated: updatedMock,
    });

    const cards = this.buildCards(fields, score, website);
    const timeline = this.buildTimeline(fields, now);
    const sources = this.buildSources();

    return {
      leadId: lead.id,
      companyId: lead.company_id,
      companyName: lead.company_name,
      score,
      fields,
      cards,
      timeline,
      sources,
    };
  }

  recalculateScore(result: CompanyEnrichmentResult): EnrichmentScore {
    return calculateEnrichmentScore({
      website: result.fields.websitePresent.value,
      ssl: result.fields.sslPresent.value,
      email: Boolean(result.fields.emailFound.value),
      phone: Boolean(result.fields.phoneFound.value),
      linkedin: Boolean(result.fields.linkedin.value),
      facebook: Boolean(result.fields.facebook.value),
      instagram: Boolean(result.fields.instagram.value),
      googleBusiness: Boolean(result.fields.googleBusiness.value),
      employees: Boolean(result.fields.employees.value),
      revenue: Boolean(result.fields.revenue.value),
      founded: Boolean(result.fields.founded.value),
      lastUpdated: new Date().toISOString(),
    });
  }

  private buildCards(
    fields: CompanyEnrichmentResult["fields"],
    score: EnrichmentScore,
    website: string | null,
  ): EnrichmentCard[] {
    const websiteItems: EnrichmentCardItem[] = [
      {
        key: "website",
        label: "Website",
        value: website ?? "—",
        status: fields.websitePresent.status,
        confidence: fields.websitePresent.confidence,
        source: fields.websitePresent.source,
        lastUpdated: fields.websitePresent.lastUpdated,
      },
      {
        key: "ssl",
        label: "SSL",
        value: display(fields.sslPresent.value),
        status: fields.sslPresent.status,
        confidence: fields.sslPresent.confidence,
        source: fields.sslPresent.source,
        lastUpdated: fields.sslPresent.lastUpdated,
      },
    ];

    const contactItems: EnrichmentCardItem[] = [
      toItem(fields.emailFound),
      toItem(fields.phoneFound),
    ];

    const socialItems: EnrichmentCardItem[] = [
      toItem(fields.linkedin),
      toItem(fields.facebook),
      toItem(fields.instagram),
    ];

    const businessItems: EnrichmentCardItem[] = [
      toItem(fields.kvk),
      toItem(fields.employees),
      toItem(fields.revenue),
      toItem(fields.founded),
    ];

    const googleItems: EnrichmentCardItem[] = [toItem(fields.googleBusiness)];

    const technologyItems: EnrichmentCardItem[] = [
      {
        key: "stack",
        label: "Detected stack",
        value: "Mock — Next/CMS unknown",
        status: "mock",
        confidence: 20,
        source: "mock_tech_detector",
        lastUpdated: score.lastUpdated,
      },
      {
        key: "analytics",
        label: "Analytics",
        value: "Placeholder",
        status: "placeholder",
        confidence: 15,
        source: "mock_tech_detector",
        lastUpdated: score.lastUpdated,
      },
    ];

    const trustItems: EnrichmentCardItem[] = [
      {
        key: "ssl_trust",
        label: "SSL trust",
        value: fields.sslPresent.value ? "HTTPS ok (mock)" : "Niet geverifieerd",
        status: fields.sslPresent.status,
        confidence: fields.sslPresent.confidence,
        source: fields.sslPresent.source,
        lastUpdated: fields.sslPresent.lastUpdated,
      },
      {
        key: "identity",
        label: "Business identity",
        value: fields.kvk.value ? `KvK mock ${fields.kvk.value}` : "—",
        status: fields.kvk.status,
        confidence: fields.kvk.confidence,
        source: fields.kvk.source,
        lastUpdated: fields.kvk.lastUpdated,
      },
    ];

    return [
      cardFrom(
        "company_score",
        "Company Score",
        "Gewogen enrichment score 0–100",
        [
          {
            key: "total",
            label: "Score",
            value: `${score.total} · ${score.label}`,
            status: "mock",
            confidence: 100,
            source: score.source,
            lastUpdated: score.lastUpdated,
          },
          ...score.breakdown.map((item) => ({
            key: item.key,
            label: item.label,
            value: item.awarded ? `+${item.points}` : "0",
            status: (item.awarded ? "verified" : "missing") as EnrichmentFieldStatus,
            confidence: item.awarded ? 90 : 0,
            source: score.source,
            lastUpdated: score.lastUpdated,
          })),
        ],
      ),
      cardFrom("website", "Website", "Domein & SSL", websiteItems),
      cardFrom(
        "contact",
        "Contact Information",
        "E-mail en telefoon",
        contactItems,
      ),
      cardFrom("social", "Social Presence", "Sociale profielen", socialItems),
      cardFrom(
        "business",
        "Business Details",
        "KvK, size, revenue, founded",
        businessItems,
      ),
      cardFrom(
        "google",
        "Google Presence",
        "Google Business (mock connector)",
        googleItems,
      ),
      cardFrom(
        "technology",
        "Technology",
        "Tech signals (mock)",
        technologyItems,
      ),
      cardFrom(
        "trust",
        "Trust Indicators",
        "Vertrouwenssignalen",
        trustItems,
      ),
    ];
  }

  private buildTimeline(
    fields: CompanyEnrichmentResult["fields"],
    now: Date,
  ): EnrichmentTimelineEvent[] {
    const events: EnrichmentTimelineEvent[] = [];

    if (fields.websitePresent.value) {
      events.push({
        id: "website-found",
        label: "Website gevonden",
        description: display(fields.websitePresent.value),
        status: fields.websitePresent.status,
        occurredAt: fields.websitePresent.lastUpdated,
        source: fields.websitePresent.source,
      });
    }

    if (fields.sslPresent.value) {
      events.push({
        id: "ssl-checked",
        label: "SSL gecontroleerd",
        description: "HTTPS aanwezig (mock probe)",
        status: fields.sslPresent.status,
        occurredAt: fields.sslPresent.lastUpdated,
        source: fields.sslPresent.source,
      });
    }

    if (fields.emailFound.value) {
      events.push({
        id: "email-found",
        label: "Email gevonden",
        description: fields.emailFound.value,
        status: fields.emailFound.status,
        occurredAt: fields.emailFound.lastUpdated,
        source: fields.emailFound.source,
      });
    }

    if (fields.linkedin.value) {
      events.push({
        id: "linkedin-found",
        label: "LinkedIn gevonden",
        description: fields.linkedin.value,
        status: fields.linkedin.status,
        occurredAt: fields.linkedin.lastUpdated,
        source: fields.linkedin.source,
      });
    }

    if (fields.googleBusiness.value) {
      events.push({
        id: "google-business-found",
        label: "Google Business gevonden",
        description: fields.googleBusiness.value,
        status: fields.googleBusiness.status,
        occurredAt: fields.googleBusiness.lastUpdated,
        source: fields.googleBusiness.source,
      });
    }

    events.push({
      id: "enrichment-pass",
      label: "Enrichment pass voltooid",
      description: "Mock enrichment engine run",
      status: "mock",
      occurredAt: iso(now),
      source: "mock_company_enrichment_service",
    });

    return events.sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );
  }

  private buildSources(): EnrichmentSourceRef[] {
    return [
      {
        id: "crm_lead",
        name: "CRM Lead",
        type: "internal",
        description: "Bestaande leadvelden in Storaflow CRM",
      },
      {
        id: "company_record",
        name: "Company Record",
        type: "internal",
        description: "Gekoppeld company-record uit de database",
      },
      {
        id: "mock_ssl_probe",
        name: "SSL Probe",
        type: "mock",
        description: "Vervangbaar door echte SSL/HTTP check",
      },
      {
        id: "mock_google_maps_connector",
        name: "Google Maps Connector",
        type: "mock",
        description: "Placeholder voor Google Business enrichment",
      },
      {
        id: "mock_linkedin_connector",
        name: "LinkedIn Connector",
        type: "mock",
        description: "Placeholder voor LinkedIn enrichment",
      },
      {
        id: "mock_facebook_connector",
        name: "Facebook Connector",
        type: "mock",
        description: "Placeholder voor Facebook enrichment",
      },
      {
        id: "mock_opencorporates",
        name: "OpenCorporates",
        type: "mock",
        description: "Placeholder voor KvK / company registry",
      },
      {
        id: "mock_business_details",
        name: "Business Details Mock",
        type: "mock",
        description: "Employees / revenue / founded placeholders",
      },
    ];
  }
}

function toItem(
  field: EnrichmentField<string | number | boolean | null>,
): EnrichmentCardItem {
  return {
    key: field.key,
    label: field.label,
    value: display(field.value),
    status: field.status,
    confidence: field.confidence,
    source: field.source,
    lastUpdated: field.lastUpdated,
  };
}

function cardFrom(
  kind: EnrichmentCardKind,
  title: string,
  description: string,
  items: EnrichmentCardItem[],
): EnrichmentCard {
  const statuses = items.map((item) => item.status);
  const confidences = items.map((item) => item.confidence);
  const timestamps = items.map((item) => item.lastUpdated);
  const sources = [...new Set(items.map((item) => item.source))];

  return {
    kind,
    title,
    description,
    status: aggregateStatus(statuses),
    confidence: averageConfidence(confidences),
    source: sources.join(" · ") || "mock",
    lastUpdated: latestTimestamp(timestamps),
    items,
  };
}

/** Singleton mock service — swap for connector-backed service later */
export const companyEnrichmentService: CompanyEnrichmentService =
  new MockCompanyEnrichmentService();
