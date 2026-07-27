/**
 * Email event catalog — foundation constants (no processors).
 */

import type { EmailEventType } from "@/lib/email/types";

export const EMAIL_EVENT_TYPES: readonly EmailEventType[] = [
  "email_queued",
  "email_sent",
  "email_delivered",
  "email_opened",
  "email_clicked",
  "email_replied",
  "email_bounced",
  "complaint_received",
  "recipient_unsubscribed",
] as const;

export const EMAIL_EVENT_LABELS: Record<EmailEventType, string> = {
  email_queued: "Email queued",
  email_sent: "Email sent",
  email_delivered: "Email delivered",
  email_opened: "Email opened",
  email_clicked: "Email clicked",
  email_replied: "Email replied",
  email_bounced: "Email bounced",
  complaint_received: "Complaint received",
  recipient_unsubscribed: "Recipient unsubscribed",
};

export function isEmailEventType(value: string): value is EmailEventType {
  return (EMAIL_EVENT_TYPES as readonly string[]).includes(value);
}
