/**
 * Provider abstraction — Resend first, other providers later.
 */

import type {
  EmailSendingProvider,
  SendEmailRequest,
  SendEmailResult,
} from "@/lib/email/interfaces";
import type { EmailProviderCode } from "@/lib/email/types";
import { ResendEmailProvider } from "@/lib/email/provider/resend";

export const SUPPORTED_PROVIDER_CODES: readonly EmailProviderCode[] = [
  "none",
  "resend",
  "postmark",
  "sendgrid",
  "ses",
  "smtp",
  "custom",
] as const;

export class NotConfiguredEmailProvider implements EmailSendingProvider {
  readonly code: EmailProviderCode = "none";
  readonly displayName = "Not configured";

  async isConfigured(): Promise<boolean> {
    return false;
  }

  async send(request: SendEmailRequest): Promise<SendEmailResult> {
    void request;
    return {
      success: false,
      providerCode: this.code,
      providerMessageId: null,
      status: "cancelled",
      errorMessage:
        "No email provider configured. Foundation phase does not send mail.",
    };
  }
}

export function createDefaultEmailProvider(): EmailSendingProvider {
  if (process.env.RESEND_API_KEY?.trim()) {
    return new ResendEmailProvider(process.env.RESEND_API_KEY);
  }
  return new NotConfiguredEmailProvider();
}

export function createEmailProvider(
  providerCode?: EmailProviderCode | null,
): EmailSendingProvider {
  if (providerCode === "resend" || (!providerCode && process.env.RESEND_API_KEY?.trim())) {
    return new ResendEmailProvider(process.env.RESEND_API_KEY);
  }
  return new NotConfiguredEmailProvider();
}

export function getEmailProviderDiagnostics() {
  const hasResendKey = Boolean(process.env.RESEND_API_KEY?.trim());
  const defaultProvider: EmailProviderCode = hasResendKey ? "resend" : "none";
  return {
    defaultProvider,
    hasResendKey,
    configuredProviders: hasResendKey ? (["resend"] as const) : ([] as const),
  };
}

export const PROVIDER_INTEGRATION_NOTES = [
  "Resend is the first wired provider; others stay behind EmailSendingProvider",
  "Never call providers from client components",
  "Organization secrets stay server-side only",
  "Respect suppression + rate limits before send()",
] as const;

export { ResendEmailProvider } from "@/lib/email/provider/resend";
export {
  getDeliveryOverview,
  listRecentProviderEvents,
} from "@/lib/email/provider/queries";
