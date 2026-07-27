/**
 * Audience builder — filter evaluation against Campaign Ready / CRM (Phase 21C).
 * Reuses existing CRM records; does not create a parallel CRM database.
 */

import { isValidEmailSyntax } from "@/lib/email/validators";
import { normalizeSuppressionEmail } from "@/lib/email/suppression";
import type { AudienceFilter } from "@/lib/email/audience";

export type AudienceFilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "does_not_contain"
  | "in"
  | "not_in"
  | "greater_than"
  | "less_than"
  | "between"
  | "is_empty"
  | "is_not_empty";

export type AudienceRule = {
  field: string;
  operator: AudienceFilterOperator;
  value?: string | number | string[] | [number, number] | null;
};

export type AudienceGroup = {
  logic: "and" | "or";
  rules: AudienceRule[];
};

/** Extended filter stored in campaign.audience_definition_json */
export type CampaignAudienceDefinition = AudienceFilter & {
  source?:
    | "campaign_ready"
    | "selected_leads"
    | "selected_companies"
    | "selected_contacts"
    | "crm_filters"
    | "company_category"
    | "manual";
  selectedLeadIds?: string[];
  selectedCompanyIds?: string[];
  selectedContactIds?: string[];
  /** Phase 23C — filter Campaign Ready candidates by company category */
  companyCategoryIds?: string[];
  pipelineStageIds?: string[];
  qualificationMin?: number;
  opportunityMin?: number;
  opportunityMax?: number;
  /** Phase 25E — minimum AI / CRM lead score */
  leadScoreMin?: number;
  industries?: string[];
  countries?: string[];
  cities?: string[];
  tags?: string[];
  languages?: string[];
  groups?: AudienceGroup[];
};

export type AudienceCandidate = {
  leadId: string;
  companyId: string | null;
  companyCategoryId?: string | null;
  contactId: string | null;
  companyName: string;
  preferredEmail: string | null;
  preferredName: string | null;
  language: string | null;
  ownerUserId: string | null;
  source: string | null;
  readinessStatus: string;
  approvalStatus: string;
  salesPriority: string;
  personalizationStatus: string;
  qualificationScore: number;
  opportunityScore: number;
  priorityScore: number;
  leadScore: number;
  industry: string | null;
  city: string | null;
  country: string | null;
  tags: string[];
  personalization: Record<string, string | null>;
};

export type AudienceStatistics = {
  totalMatching: number;
  validRecipients: number;
  missingEmail: number;
  invalidEmail: number;
  suppressed: number;
  duplicate: number;
  needsReview: number;
  roleAddresses: number;
  namedContacts: number;
  generalContacts: number;
  languageDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
  ownerDistribution: Record<string, number>;
};

export type AudienceExclusion = {
  leadId: string;
  email: string | null;
  reason: string;
  code: string;
};

export type AudiencePreview = {
  candidates: AudienceCandidate[];
  statistics: AudienceStatistics;
  exclusions: AudienceExclusion[];
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CampaignAudienceResult = {
  definition: CampaignAudienceDefinition;
  preview: AudiencePreview;
};

const ROLE_LOCAL_PARTS = new Set([
  "info",
  "contact",
  "sales",
  "support",
  "hello",
  "admin",
  "office",
  "team",
  "mail",
]);

function isRoleAddress(email: string | null): boolean {
  if (!email) return false;
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  return ROLE_LOCAL_PARTS.has(local);
}

function applyRule(
  candidate: AudienceCandidate,
  rule: AudienceRule,
): boolean {
  const raw = (() => {
    switch (rule.field) {
      case "salesPriority":
        return candidate.salesPriority;
      case "approvalStatus":
        return candidate.approvalStatus;
      case "readinessStatus":
        return candidate.readinessStatus;
      case "ownerUserId":
        return candidate.ownerUserId ?? "";
      case "source":
        return candidate.source ?? "";
      case "industry":
        return candidate.industry ?? "";
      case "country":
        return candidate.country ?? "";
      case "city":
        return candidate.city ?? "";
      case "language":
        return candidate.language ?? "";
      case "qualificationScore":
        return candidate.qualificationScore;
      case "leadScore":
        return candidate.leadScore;
      case "opportunityScore":
        return candidate.opportunityScore;
      case "preferredEmail":
        return candidate.preferredEmail ?? "";
      case "companyName":
        return candidate.companyName;
      case "tags":
        return candidate.tags.join(",");
      default:
        return "";
    }
  })();

  const op = rule.operator;
  const value = rule.value;

  if (op === "is_empty") {
    return raw === "" || raw === null || raw === undefined;
  }
  if (op === "is_not_empty") {
    return !(raw === "" || raw === null || raw === undefined);
  }

  if (typeof raw === "number") {
    if (op === "greater_than" && typeof value === "number") return raw > value;
    if (op === "less_than" && typeof value === "number") return raw < value;
    if (op === "between" && Array.isArray(value) && value.length === 2) {
      return raw >= Number(value[0]) && raw <= Number(value[1]);
    }
    if (op === "equals") return raw === Number(value);
    if (op === "not_equals") return raw !== Number(value);
  }

  const text = String(raw).toLowerCase();
  if (op === "equals") return text === String(value ?? "").toLowerCase();
  if (op === "not_equals") return text !== String(value ?? "").toLowerCase();
  if (op === "contains")
    return text.includes(String(value ?? "").toLowerCase());
  if (op === "does_not_contain")
    return !text.includes(String(value ?? "").toLowerCase());
  if (op === "in" && Array.isArray(value)) {
    return value.map(String).map((v) => v.toLowerCase()).includes(text);
  }
  if (op === "not_in" && Array.isArray(value)) {
    return !value.map(String).map((v) => v.toLowerCase()).includes(text);
  }
  return true;
}

export function matchesAudienceDefinition(
  candidate: AudienceCandidate,
  definition: CampaignAudienceDefinition,
): boolean {
  if (definition.campaignReadyOnly !== false) {
    const ok =
      candidate.readinessStatus === "ready" ||
      candidate.readinessStatus === "ready_with_review";
    if (!ok) return false;
  }

  if (definition.approvalStatus?.length) {
    if (!definition.approvalStatus.includes(candidate.approvalStatus)) {
      return false;
    }
  }

  if (definition.salesPriorities?.length) {
    if (!definition.salesPriorities.includes(candidate.salesPriority)) {
      return false;
    }
  }

  if (definition.ownerUserIds?.length) {
    if (
      !candidate.ownerUserId ||
      !definition.ownerUserIds.includes(candidate.ownerUserId)
    ) {
      return false;
    }
  }

  if (definition.sourceTags?.length) {
    const hay = [
      candidate.source ?? "",
      ...candidate.tags,
    ].join(" ").toLowerCase();
    if (
      !definition.sourceTags.some((tag) =>
        hay.includes(tag.toLowerCase()),
      )
    ) {
      return false;
    }
  }

  if (definition.selectedLeadIds?.length) {
    if (!definition.selectedLeadIds.includes(candidate.leadId)) return false;
  }
  if (definition.selectedCompanyIds?.length) {
    if (
      !candidate.companyId ||
      !definition.selectedCompanyIds.includes(candidate.companyId)
    ) {
      return false;
    }
  }
  if (definition.companyCategoryIds?.length) {
    if (
      !candidate.companyCategoryId ||
      !definition.companyCategoryIds.includes(candidate.companyCategoryId)
    ) {
      return false;
    }
  }
  if (definition.industries?.length) {
    if (
      !candidate.industry ||
      !definition.industries
        .map((i) => i.toLowerCase())
        .includes(candidate.industry.toLowerCase())
    ) {
      return false;
    }
  }
  if (definition.countries?.length) {
    if (
      !candidate.country ||
      !definition.countries
        .map((c) => c.toLowerCase())
        .includes(candidate.country.toLowerCase())
    ) {
      return false;
    }
  }
  if (definition.cities?.length) {
    if (
      !candidate.city ||
      !definition.cities
        .map((c) => c.toLowerCase())
        .includes(candidate.city.toLowerCase())
    ) {
      return false;
    }
  }
  if (definition.languages?.length) {
    if (
      !candidate.language ||
      !definition.languages.includes(candidate.language)
    ) {
      return false;
    }
  }
  if (typeof definition.qualificationMin === "number") {
    if (candidate.qualificationScore < definition.qualificationMin) {
      return false;
    }
  }
  if (typeof definition.opportunityMin === "number") {
    if (candidate.opportunityScore < definition.opportunityMin) return false;
  }
  if (typeof definition.opportunityMax === "number") {
    if (candidate.opportunityScore > definition.opportunityMax) return false;
  }
  if (typeof definition.leadScoreMin === "number") {
    if (candidate.leadScore < definition.leadScoreMin) return false;
  }

  // AND groups (OR prepared for future)
  for (const group of definition.groups ?? []) {
    if (group.logic === "and") {
      if (!group.rules.every((rule) => applyRule(candidate, rule))) {
        return false;
      }
    } else {
      if (
        group.rules.length > 0 &&
        !group.rules.some((rule) => applyRule(candidate, rule))
      ) {
        return false;
      }
    }
  }

  return true;
}

export function buildEmptyAudienceStatistics(): AudienceStatistics {
  return {
    totalMatching: 0,
    validRecipients: 0,
    missingEmail: 0,
    invalidEmail: 0,
    suppressed: 0,
    duplicate: 0,
    needsReview: 0,
    roleAddresses: 0,
    namedContacts: 0,
    generalContacts: 0,
    languageDistribution: {},
    priorityDistribution: {},
    ownerDistribution: {},
  };
}

export function summarizeAudienceCandidates(input: {
  candidates: AudienceCandidate[];
  suppressedEmails: Set<string>;
  duplicateEmails: Set<string>;
}): { statistics: AudienceStatistics; exclusions: AudienceExclusion[] } {
  const statistics = buildEmptyAudienceStatistics();
  const exclusions: AudienceExclusion[] = [];
  statistics.totalMatching = input.candidates.length;

  for (const candidate of input.candidates) {
    const email = candidate.preferredEmail?.trim() || null;
    const normalized = email ? normalizeSuppressionEmail(email) : null;

    statistics.priorityDistribution[candidate.salesPriority] =
      (statistics.priorityDistribution[candidate.salesPriority] ?? 0) + 1;
    const lang = candidate.language || "unknown";
    statistics.languageDistribution[lang] =
      (statistics.languageDistribution[lang] ?? 0) + 1;
    const owner = candidate.ownerUserId || "unassigned";
    statistics.ownerDistribution[owner] =
      (statistics.ownerDistribution[owner] ?? 0) + 1;

    if (candidate.preferredName?.trim()) statistics.namedContacts += 1;
    else statistics.generalContacts += 1;

    if (isRoleAddress(email)) statistics.roleAddresses += 1;

    if (
      candidate.readinessStatus === "ready_with_review" ||
      candidate.approvalStatus === "pending_review"
    ) {
      statistics.needsReview += 1;
    }

    if (!email) {
      statistics.missingEmail += 1;
      exclusions.push({
        leadId: candidate.leadId,
        email: null,
        reason: "Missing preferred email",
        code: "missing_email",
      });
      continue;
    }
    if (!isValidEmailSyntax(email)) {
      statistics.invalidEmail += 1;
      exclusions.push({
        leadId: candidate.leadId,
        email,
        reason: "Invalid email syntax",
        code: "invalid_email",
      });
      continue;
    }
    if (normalized && input.suppressedEmails.has(normalized)) {
      statistics.suppressed += 1;
      exclusions.push({
        leadId: candidate.leadId,
        email,
        reason: "Suppressed — must not be campaign eligible",
        code: "suppressed",
      });
      continue;
    }
    if (normalized && input.duplicateEmails.has(normalized)) {
      statistics.duplicate += 1;
      exclusions.push({
        leadId: candidate.leadId,
        email,
        reason: "Duplicate normalized email within audience",
        code: "duplicate",
      });
      continue;
    }

    statistics.validRecipients += 1;
  }

  return { statistics, exclusions };
}

export function paginateAudiencePreview(input: {
  candidates: AudienceCandidate[];
  exclusions: AudienceExclusion[];
  statistics: AudienceStatistics;
  page?: number;
  pageSize?: number;
}): AudiencePreview {
  const pageSize = Math.min(Math.max(input.pageSize ?? 25, 1), 100);
  const page = Math.max(input.page ?? 1, 1);
  const totalPages = Math.max(1, Math.ceil(input.candidates.length / pageSize));
  const start = (page - 1) * pageSize;
  return {
    candidates: input.candidates.slice(start, start + pageSize),
    statistics: input.statistics,
    exclusions: input.exclusions.slice(0, 200),
    page,
    pageSize,
    totalPages,
  };
}

export { isRoleAddress };
