/* eslint-disable @typescript-eslint/no-explicit-any */

import { randomUUID } from "crypto";

import { createServiceClient } from "@/lib/supabase/admin";
import { buildTrackedReplyToAddress, createOpenTrackingToken } from "@/lib/email/tracking/tokens";

type SupabaseLike = any;

type TrackingPreparationInput = {
  organizationId: string;
  queueItemId: string;
  renderedMessageId: string;
  campaignExecutionId: string;
  enrollmentId: string;
  stepExecutionId: string;
  recipientId: string;
  campaignId: string | null;
  htmlBody: string;
  textBody: string | null;
  replyTo: string | null;
};

type TrackingPreparationResult = {
  htmlBody: string;
  textBody: string | null;
  replyTo: string | null;
};

function shouldTrackHref(url: string): boolean {
  const normalized = url.trim().toLowerCase();
  return !(
    !normalized ||
    normalized.startsWith("#") ||
    normalized.startsWith("mailto:") ||
    normalized.startsWith("tel:") ||
    normalized.startsWith("javascript:")
  );
}

function getBaseUrl(): string | null {
  return process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? null;
}

export async function prepareTrackedMessage(
  input: TrackingPreparationInput,
): Promise<TrackingPreparationResult> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    return {
      htmlBody: input.htmlBody,
      textBody: input.textBody,
      replyTo: input.replyTo,
    };
  }

  const supabase = createServiceClient() as SupabaseLike;
  const hrefPattern = /href=(["'])(.*?)\1/gi;
  const matches = Array.from(input.htmlBody.matchAll(hrefPattern));

  let htmlBody = input.htmlBody;
  let textBody = input.textBody;

  for (const [index, match] of matches.entries()) {
    const originalUrl = match[2] ?? "";
    if (!shouldTrackHref(originalUrl)) continue;

    const { data: existingLink } = await supabase
      .from("email_tracking_links")
      .select("*")
      .eq("rendered_message_id", input.renderedMessageId)
      .eq("link_order", index)
      .eq("normalized_url", originalUrl)
      .maybeSingle();

    const publicToken =
      existingLink?.public_token ?? randomUUID().replaceAll("-", "");

    if (!existingLink) {
      await supabase.from("email_tracking_links").insert({
        organization_id: input.organizationId,
        queue_item_id: input.queueItemId,
        rendered_message_id: input.renderedMessageId,
        campaign_execution_id: input.campaignExecutionId,
        enrollment_id: input.enrollmentId,
        step_execution_id: input.stepExecutionId,
        recipient_id: input.recipientId,
        public_token: publicToken,
        original_url: originalUrl,
        normalized_url: originalUrl,
        link_order: index,
      });
    }

    const trackedUrl = `${baseUrl}/api/email/click/${publicToken}`;
    htmlBody = htmlBody.replace(match[0], `href="${trackedUrl}"`);
    if (textBody?.includes(originalUrl)) {
      textBody = textBody.replace(originalUrl, trackedUrl);
    }
  }

  try {
    const openToken = createOpenTrackingToken({
      q: input.queueItemId,
      r: input.renderedMessageId,
    });
    htmlBody = `${htmlBody}<img src="${baseUrl}/api/email/open/${openToken}" alt="" width="1" height="1" style="display:none;max-height:0;max-width:0;overflow:hidden;" />`;
  } catch {
    // If tracking secret is missing, keep the email content valid and skip the pixel.
  }

  return {
    htmlBody,
    textBody,
    replyTo: buildTrackedReplyToAddress({
      queueItemId: input.queueItemId,
      fallbackReplyTo: input.replyTo,
    }),
  };
}

