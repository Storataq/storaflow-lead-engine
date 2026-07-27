import { Resend } from "resend";

import type {
  EmailSendingProvider,
  SendEmailRequest,
  SendEmailResult,
} from "@/lib/email/interfaces";

function buildFromAddress(input: {
  fromEmail?: string | null;
  fromName?: string | null;
}): string | null {
  const email = input.fromEmail?.trim() ?? "";
  if (!email) return null;
  const name = input.fromName?.trim();
  return name ? `${name} <${email}>` : email;
}

export class ResendEmailProvider implements EmailSendingProvider {
  readonly code = "resend" as const;
  readonly displayName = "Resend";

  private readonly apiKey: string | null;

  constructor(apiKey = process.env.RESEND_API_KEY ?? null) {
    this.apiKey = apiKey?.trim() || null;
  }

  async isConfigured(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  async send(request: SendEmailRequest): Promise<SendEmailResult> {
    if (!this.apiKey) {
      return {
        success: false,
        providerCode: this.code,
        providerMessageId: null,
        status: "cancelled",
        errorMessage: "RESEND_API_KEY is not configured.",
        providerStatus: "not_configured",
      };
    }

    const from = buildFromAddress({
      fromEmail: request.fromEmail,
      fromName: request.fromName,
    });

    if (!from) {
      return {
        success: false,
        providerCode: this.code,
        providerMessageId: null,
        status: "failed",
        errorMessage: "Missing from address for Resend dispatch.",
        providerStatus: "invalid_from",
      };
    }

    const resend = new Resend(this.apiKey);

    const { data, error } = await resend.emails.send(
      {
        from,
        to: [request.to],
        subject: request.subject,
        html: request.htmlBody,
        text: request.textBody ?? undefined,
        replyTo: request.replyTo ?? undefined,
        headers: request.headers,
        tags: Object.entries(request.metadata ?? {}).map(([name, value]) => ({
          name,
          value,
        })),
      },
      request.idempotencyKey
        ? {
            idempotencyKey: request.idempotencyKey,
          }
        : undefined,
    );

    if (error || !data?.id) {
      return {
        success: false,
        providerCode: this.code,
        providerMessageId: null,
        status: "failed",
        errorMessage: error?.message ?? "Unknown Resend send error",
        providerStatus: "failed",
        providerPayload: error
          ? {
              message: error.message,
              name: error.name,
            }
          : null,
      };
    }

    return {
      success: true,
      providerCode: this.code,
      providerMessageId: data.id,
      status: "sent",
      providerStatus: "accepted",
      providerPayload: {
        id: data.id,
      },
    };
  }
}

