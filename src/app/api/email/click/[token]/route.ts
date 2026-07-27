import { NextResponse } from "next/server";

import {
  getTrackingLinkByToken,
  recordEngagementEvent,
} from "@/lib/email/tracking/process";
import { isSafeHttpUrl } from "@/lib/email/ops/security";
import { ensureEmergencyControls } from "@/lib/email/ops/controls";
import { envFlag } from "@/lib/email/ops/security";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  if (!envFlag("EMAIL_TRACKING_ENABLED", true)) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  const trackingLink = await getTrackingLinkByToken(token);

  if (!trackingLink?.original_url) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  if (trackingLink.organization_id) {
    const controls = await ensureEmergencyControls(trackingLink.organization_id);
    if (!controls.tracking_enabled) {
      return NextResponse.redirect(new URL("/", request.url), 302);
    }
  }

  if (!isSafeHttpUrl(trackingLink.original_url)) {
    return NextResponse.json(
      { ok: false, error: "Unsafe destination URL" },
      { status: 400 },
    );
  }

  await recordEngagementEvent({
    queueRow: trackingLink,
    eventType: "clicked",
    trackingLinkId: trackingLink.tracking_link_id,
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
    referer: request.headers.get("referer"),
    targetUrl: trackingLink.original_url,
  });

  return NextResponse.redirect(trackingLink.original_url, 307);
}
