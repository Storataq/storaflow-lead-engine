/**
 * Deterministic company & contact eligibility for funnel activation.
 */

import type { CompanyRow } from "@/lib/companies/queries";
import type {
  CompanyEligibilityStatus,
  ContactabilityClass,
  FunnelActivationPolicy,
} from "@/lib/crm/funnel-activation/types";

export type CompanyEligibilityResult = {
  status: CompanyEligibilityStatus;
  reasons: string[];
  blocked: boolean;
};

export type ContactSignalInput = {
  emails: Array<{
    value: string;
    verification?: string | null;
    personName?: string | null;
  }>;
  phones: Array<{ value: string }>;
  leadEmail?: string | null;
  leadPhone?: string | null;
  leadContactName?: string | null;
  suppressedEmails: Set<string>;
  suppressedDomains: Set<string>;
  suppressedCompanies: Set<string>;
};

export type ContactEligibilityResult = {
  contactability: ContactabilityClass;
  reasons: string[];
  hasValidEmail: boolean;
  hasPhone: boolean;
  hasNamedContact: boolean;
  hasGeneralInbox: boolean;
  suppressed: boolean;
};

const BLOCKED_COMPANY_STATUSES = new Set(["blocked", "not_relevant"]);

export function evaluateCompanyEligibility(input: {
  company: CompanyRow;
  openLeadExists: boolean;
  recentlyActivated: boolean;
  suppressed: boolean;
  policy: FunnelActivationPolicy;
  force?: boolean;
}): CompanyEligibilityResult {
  const reasons: string[] = [];
  const { company } = input;

  if (input.suppressed) {
    return {
      status: "suppressed",
      reasons: ["Company matches organization exclusion list"],
      blocked: true,
    };
  }

  if (!company.company_name?.trim()) {
    return {
      status: "missing_information",
      reasons: ["Company name is required"],
      blocked: true,
    };
  }

  if (BLOCKED_COMPANY_STATUSES.has(company.status)) {
    return {
      status: "not_eligible",
      reasons: [`Company status is ${company.status}`],
      blocked: true,
    };
  }

  if (input.recentlyActivated && !input.force) {
    return {
      status: "already_activated",
      reasons: [
        `Activated within the last ${input.policy.skipRecentActivationHours} hours`,
      ],
      blocked: false,
    };
  }

  const hasWebsite = Boolean(company.website_url?.trim());
  const hasPhone = Boolean(company.phone?.trim());
  if (!hasWebsite && !hasPhone) {
    reasons.push("No website or phone on company record");
    return {
      status: "missing_information",
      reasons,
      blocked: true,
    };
  }

  if (!hasWebsite) reasons.push("Website missing — contact-only path");
  if (input.openLeadExists) {
    reasons.push("Open lead already exists — will reuse");
  } else {
    reasons.push("Eligible for lead creation");
  }

  if (company.status === "new" && !hasWebsite) {
    return {
      status: "needs_review",
      reasons: [...reasons, "New company without website needs review"],
      blocked: false,
    };
  }

  return {
    status: "eligible",
    reasons,
    blocked: false,
  };
}

function isLikelyRoleEmail(email: string): boolean {
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  return [
    "info",
    "sales",
    "contact",
    "support",
    "hello",
    "office",
    "admin",
    "administratie",
    "klantenservice",
  ].includes(local);
}

function emailLooksValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function evaluateContactEligibility(
  input: ContactSignalInput,
  policy: FunnelActivationPolicy,
): ContactEligibilityResult {
  const reasons: string[] = [];
  const emails = [
    ...input.emails.map((e) => e.value.trim().toLowerCase()),
    ...(input.leadEmail ? [input.leadEmail.trim().toLowerCase()] : []),
  ].filter(Boolean);

  const uniqueEmails = [...new Set(emails)].filter(emailLooksValid);
  const phones = [
    ...input.phones.map((p) => p.value.trim()),
    ...(input.leadPhone ? [input.leadPhone.trim()] : []),
  ].filter(Boolean);

  const suppressed = uniqueEmails.some(
    (email) =>
      input.suppressedEmails.has(email) ||
      input.suppressedDomains.has(email.split("@")[1] ?? ""),
  );

  if (suppressed) {
    return {
      contactability: "suppressed",
      reasons: ["Contact matches exclusion / suppression list"],
      hasValidEmail: false,
      hasPhone: phones.length > 0,
      hasNamedContact: Boolean(input.leadContactName?.trim()),
      hasGeneralInbox: false,
      suppressed: true,
    };
  }

  const hasNamedContact = Boolean(
    input.leadContactName?.trim() ||
      input.emails.some((e) => e.personName?.trim()),
  );
  const hasGeneralInbox = uniqueEmails.some(isLikelyRoleEmail);
  const hasValidEmail = uniqueEmails.length > 0;
  const hasPhone = phones.length > 0;

  if (policy.requireNamedContact && !hasNamedContact) {
    reasons.push("Named contact required by organization policy");
  }
  if (!policy.allowRoleEmails && hasGeneralInbox && !hasNamedContact) {
    reasons.push("Role-based emails are disabled by policy");
  }
  if (!hasValidEmail && !hasPhone) {
    return {
      contactability: "missing_contact_data",
      reasons: ["No usable email or phone"],
      hasValidEmail: false,
      hasPhone: false,
      hasNamedContact,
      hasGeneralInbox,
      suppressed: false,
    };
  }

  if (hasValidEmail && hasPhone) {
    reasons.push("Email and phone available");
    return {
      contactability: "multi_channel_ready",
      reasons,
      hasValidEmail,
      hasPhone,
      hasNamedContact,
      hasGeneralInbox,
      suppressed: false,
    };
  }
  if (hasValidEmail && hasNamedContact) {
    reasons.push("Named contact with email");
    return {
      contactability: "email_ready",
      reasons,
      hasValidEmail,
      hasPhone,
      hasNamedContact,
      hasGeneralInbox,
      suppressed: false,
    };
  }
  if (hasValidEmail && hasGeneralInbox) {
    reasons.push("General business inbox available");
    return {
      contactability: "general_contact_only",
      reasons,
      hasValidEmail,
      hasPhone,
      hasNamedContact,
      hasGeneralInbox,
      suppressed: false,
    };
  }
  if (hasValidEmail) {
    reasons.push("Email available — review recommended");
    return {
      contactability: "needs_review",
      reasons,
      hasValidEmail,
      hasPhone,
      hasNamedContact,
      hasGeneralInbox,
      suppressed: false,
    };
  }
  if (hasPhone) {
    reasons.push("Phone only");
    return {
      contactability: "phone_ready",
      reasons,
      hasValidEmail,
      hasPhone,
      hasNamedContact,
      hasGeneralInbox,
      suppressed: false,
    };
  }

  return {
    contactability: "missing_contact_data",
    reasons: ["Insufficient contact data"],
    hasValidEmail: false,
    hasPhone: false,
    hasNamedContact,
    hasGeneralInbox,
    suppressed: false,
  };
}
