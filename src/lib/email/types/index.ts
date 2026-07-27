/**
 * Automated Email Engine — shared domain types (foundation only).
 * No sending, scheduling execution, or provider SDKs in this phase.
 */

export type EmailCampaignStatus =
  | "draft"
  | "needs_review"
  | "ready"
  | "approved"
  | "scheduled"
  | "running"
  | "paused"
  | "completed"
  | "cancelled"
  | "archived"
  | "failed";

export type EmailSequenceStatus =
  | "draft"
  | "active"
  | "inactive"
  | "archived"
  | "deprecated";

export type EmailSequenceStepType =
  | "email"
  | "wait"
  | "manual_task"
  | "condition"
  | "end";

export type EmailTemplateStatus =
  | "draft"
  | "active"
  | "archived"
  | "deprecated";

export type EmailRecipientCampaignStatus =
  | "pending"
  | "enrolled"
  | "active"
  | "completed"
  | "paused"
  | "exited"
  | "suppressed"
  | "failed";

export type EmailRecipientSequenceStatus =
  | "not_started"
  | "in_progress"
  | "waiting"
  | "completed"
  | "stopped"
  | "bounced_out"
  | "unsubscribed";

export type EmailQueueStatus =
  | "queued"
  | "waiting"
  | "scheduled"
  | "sending"
  | "sent"
  | "delivered"
  | "delayed"
  | "opened"
  | "clicked"
  | "replied"
  | "bounced"
  | "complained"
  | "rejected"
  | "failed"
  | "cancelled";

export type EmailSuppressionStatus =
  | "active"
  | "suppressed"
  | "unsubscribed"
  | "complaint"
  | "invalid_email"
  | "manual_block";

export type EmailSuppressionReason =
  | "user_blocked"
  | "do_not_contact"
  | "unsubscribed"
  | "complaint"
  | "invalid_email"
  | "duplicate"
  | "legal_restriction"
  | "internal_exclusion"
  | "competitor"
  | "existing_customer"
  | "bounce_hard"
  | "manual"
  | "other";

export type EmailValidationStatus =
  | "unknown"
  | "syntax_valid"
  | "syntax_invalid"
  | "domain_valid"
  | "mx_available"
  | "risky"
  | "not_checked";

export type EmailEventType =
  | "email_queued"
  | "email_sent"
  | "email_delivered"
  | "email_opened"
  | "email_clicked"
  | "email_replied"
  | "email_bounced"
  | "complaint_received"
  | "recipient_unsubscribed";

export type EmailBounceType = "hard" | "soft" | "unknown";

export type EmailProviderCode =
  | "none"
  | "resend"
  | "postmark"
  | "sendgrid"
  | "ses"
  | "smtp"
  | "custom";

export type EmailCampaign = {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  status: EmailCampaignStatus;
  campaignType: string;
  objective: string | null;
  language: string;
  templateId: string | null;
  templateVersionId: string | null;
  audienceId: string | null;
  sequenceId: string | null;
  senderProfileId: string | null;
  ownerUserId: string | null;
  recipientCount: number;
  validRecipientCount: number;
  excludedRecipientCount: number;
  readinessScore: number;
  readinessClassification: string;
  locked: boolean;
  complianceAck: boolean;
  createdBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmailSequenceStep = {
  id: string;
  type: EmailSequenceStepType;
  order: number;
  templateId?: string | null;
  delayHours?: number | null;
  conditionKey?: string | null;
  label?: string | null;
};

export type EmailSequence = {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  status: EmailSequenceStatus;
  version: number;
  steps: EmailSequenceStep[];
  createdAt: string;
  updatedAt: string;
};

export type EmailTemplate = {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  subject: string;
  previewText: string | null;
  htmlBody: string;
  textBody: string | null;
  variables: string[];
  language: string;
  category: string | null;
  version: number;
  status: EmailTemplateStatus;
  tags: string[];
  folderId: string | null;
  createdBy: string | null;
  archivedAt: string | null;
  isLibraryPlaceholder: boolean;
  fallbacks: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

export type EmailAudience = {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  filterJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type EmailRecipient = {
  id: string;
  organizationId: string;
  campaignId: string | null;
  companyId: string | null;
  leadId: string | null;
  contactId: string | null;
  preferredEmail: string;
  preferredName: string | null;
  language: string | null;
  campaignStatus: EmailRecipientCampaignStatus;
  sequenceStatus: EmailRecipientSequenceStatus;
  suppressionStatus: EmailSuppressionStatus;
  validationStatus: EmailValidationStatus;
  personalizationJson: Record<string, string | null>;
  createdAt: string;
  updatedAt: string;
};

export type EmailQueueItem = {
  id: string;
  organizationId: string;
  campaignId: string | null;
  recipientId: string;
  sequenceId: string | null;
  stepId: string | null;
  templateId: string | null;
  status: EmailQueueStatus;
  scheduledAt: string | null;
  providerCode: EmailProviderCode;
  providerMessageId: string | null;
  attemptCount: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmailSuppressionRecord = {
  id: string;
  organizationId: string;
  emailNormalized: string;
  status: EmailSuppressionStatus;
  reason: EmailSuppressionReason;
  source: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmailDeliveryEvent = {
  id: string;
  organizationId: string;
  queueItemId: string | null;
  recipientId: string | null;
  campaignId: string | null;
  eventType: EmailEventType;
  bounceType: EmailBounceType | null;
  payloadJson: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
};

export type EmailAnalyticsSnapshot = {
  organizationId: string;
  campaignId: string | null;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
  complaints: number;
  unsubscribed: number;
  openRate: number | null;
  clickRate: number | null;
  replyRate: number | null;
  bounceRate: number | null;
  complaintRate: number | null;
  unsubscribeRate: number | null;
  ctr: number | null;
  ctor: number | null;
  calculatedAt: string;
};

export const EMAIL_ENGINE_PHASE = "sequence-engine" as const;

export const EMAIL_ENGINE_CAPABILITIES = {
  sending: true,
  schedulingExecution: true,
  openTracking: true,
  clickTracking: true,
  replyTracking: true,
  bounceProcessing: true,
  providerIntegrations: true,
  aiGeneration: true,
  campaignExecution: true,
} as const;

export const EMAIL_ENGINE_COMPLIANCE_NOTICE =
  "The Automated Email Engine foundation does not send messages. Campaign Ready and technical validation are not marketing consent. Users remain responsible for privacy and anti-spam compliance.";
