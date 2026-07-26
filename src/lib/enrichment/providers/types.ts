/**
 * Future provider interfaces for enrichment (Phase 20C readiness).
 * No vendor is wired in this phase.
 */

export type EmailVerificationStatus =
  | "deliverable"
  | "undeliverable"
  | "risky"
  | "catch_all"
  | "unknown"
  | "blocked"
  | "not_checked";

export type EmailVerificationRequest = {
  email: string;
  organizationId: string;
};

export type EmailVerificationResult = {
  email: string;
  status: EmailVerificationStatus;
  provider: string;
  raw?: Record<string, unknown>;
};

export interface EmailVerificationProvider {
  readonly code: string;
  verify(request: EmailVerificationRequest): Promise<EmailVerificationResult>;
}

export type PhoneVerificationRequest = {
  phone: string;
  organizationId: string;
};

export type PhoneVerificationResult = {
  phone: string;
  status: "valid" | "invalid" | "unknown" | "not_checked";
  provider: string;
};

export interface PhoneVerificationProvider {
  readonly code: string;
  verify(request: PhoneVerificationRequest): Promise<PhoneVerificationResult>;
}

export type BrowserRenderRequest = {
  url: string;
  timeoutMs: number;
};

export type BrowserRenderResult = {
  html: string | null;
  finalUrl: string | null;
  status: "ok" | "unsupported" | "blocked" | "error";
  message: string;
};

export interface BrowserRenderingProvider {
  readonly code: string;
  render(request: BrowserRenderRequest): Promise<BrowserRenderResult>;
}

export type CompanyEnrichmentProviderRequest = {
  companyName: string;
  website?: string | null;
  organizationId: string;
};

export type CompanyEnrichmentProviderResult = {
  provider: string;
  fields: Record<string, string | null>;
  confidence: number;
};

export interface ExternalCompanyEnrichmentProvider {
  readonly code: string;
  enrich(
    request: CompanyEnrichmentProviderRequest,
  ): Promise<CompanyEnrichmentProviderResult>;
}

/** Default no-op mailbox verification — never claims deliverability. */
export class NotCheckedEmailVerificationProvider
  implements EmailVerificationProvider
{
  readonly code = "not_checked";

  async verify(
    request: EmailVerificationRequest,
  ): Promise<EmailVerificationResult> {
    return {
      email: request.email,
      status: "not_checked",
      provider: this.code,
    };
  }
}
