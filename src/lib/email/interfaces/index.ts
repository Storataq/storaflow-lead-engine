/**
 * Provider / engine interfaces — no vendor SDKs wired.
 */

import type {
  EmailAnalyticsSnapshot,
  EmailCampaign,
  EmailDeliveryEvent,
  EmailEventType,
  EmailProviderCode,
  EmailQueueItem,
  EmailQueueStatus,
  EmailRecipient,
  EmailSequence,
  EmailSuppressionRecord,
  EmailTemplate,
} from "@/lib/email/types";

export type SendEmailRequest = {
  organizationId: string;
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string | null;
  fromEmail?: string | null;
  fromName?: string | null;
  replyTo?: string | null;
  idempotencyKey?: string | null;
  headers?: Record<string, string>;
  metadata?: Record<string, string>;
};

export type SendEmailResult = {
  success: boolean;
  providerCode: EmailProviderCode;
  providerMessageId: string | null;
  status: Extract<EmailQueueStatus, "sent" | "failed" | "cancelled">;
  errorMessage?: string | null;
  providerStatus?: string | null;
  providerPayload?: Record<string, unknown> | null;
};

export interface EmailSendingProvider {
  readonly code: EmailProviderCode;
  readonly displayName: string;
  isConfigured(): Promise<boolean>;
  /** Not implemented in foundation — must throw or return not-configured. */
  send(request: SendEmailRequest): Promise<SendEmailResult>;
}

export type ScheduleSendRequest = {
  organizationId: string;
  queueItemId: string;
  mode: "send_now" | "future_date" | "business_hours";
  scheduledAt?: string | null;
  timezone?: string | null;
};

export type ScheduleSendResult = {
  accepted: boolean;
  queueItemId: string;
  scheduledAt: string | null;
  message: string;
};

export interface EmailScheduler {
  schedule(request: ScheduleSendRequest): Promise<ScheduleSendResult>;
  cancel(organizationId: string, queueItemId: string): Promise<boolean>;
}

export interface EmailQueueService {
  enqueue(
    item: Omit<EmailQueueItem, "id" | "createdAt" | "updatedAt" | "attemptCount">,
  ): Promise<EmailQueueItem>;
  updateStatus(
    organizationId: string,
    queueItemId: string,
    status: EmailQueueStatus,
  ): Promise<void>;
}

export interface EmailEventBus {
  publish(event: Omit<EmailDeliveryEvent, "id" | "createdAt">): Promise<void>;
  list(
    organizationId: string,
    filters?: { eventType?: EmailEventType; campaignId?: string },
  ): Promise<EmailDeliveryEvent[]>;
}

export interface EmailSuppressionService {
  isSuppressed(organizationId: string, email: string): Promise<boolean>;
  upsert(record: Omit<EmailSuppressionRecord, "id" | "createdAt" | "updatedAt">): Promise<void>;
}

export interface EmailAnalyticsService {
  summarize(
    organizationId: string,
    campaignId?: string | null,
  ): Promise<EmailAnalyticsSnapshot>;
}

export interface EmailCampaignService {
  get(organizationId: string, campaignId: string): Promise<EmailCampaign | null>;
  list(organizationId: string): Promise<EmailCampaign[]>;
}

export interface EmailSequenceService {
  get(organizationId: string, sequenceId: string): Promise<EmailSequence | null>;
}

export interface EmailTemplateService {
  get(organizationId: string, templateId: string): Promise<EmailTemplate | null>;
  render(
    template: EmailTemplate,
    variables: Record<string, string | null | undefined>,
  ): { subject: string; htmlBody: string; textBody: string | null };
}

export interface EmailRecipientService {
  listForCampaign(
    organizationId: string,
    campaignId: string,
  ): Promise<EmailRecipient[]>;
}

export type PersonalizationContext = {
  companyName?: string | null;
  contactFirstName?: string | null;
  contactLastName?: string | null;
  jobTitle?: string | null;
  industry?: string | null;
  city?: string | null;
  country?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  ownerName?: string | null;
  currentDate?: string | null;
  unsubscribeLink?: string | null;
  companyDescription?: string | null;
  [key: string]: string | null | undefined;
};

export interface PersonalizationEngine {
  buildContext(input: PersonalizationContext): Record<string, string>;
  apply(template: string, context: Record<string, string>): string;
  listKnownVariables(): string[];
}
