import { NextResponse } from "next/server";

import {
  markTokenUsed,
  processUnsubscribe,
  resolvePreferenceToken,
  hashPreferenceMeta,
} from "@/lib/email/preferences";
import { checkRateLimit } from "@/lib/email/ops/rate-limit";

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rl = checkRateLimit({ key: `oneclick:${ip}:${token.slice(0, 12)}` });
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfterSec),
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const resolved = await resolvePreferenceToken(token);

  if (!resolved || resolved.tokenRow.purpose !== "one_click_unsubscribe") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const storeIp = process.env.EMAIL_PREFERENCE_STORE_IP === "true";
  const result = await processUnsubscribe({
    organizationId: resolved.tokenRow.organization_id,
    emailNormalized: resolved.tokenRow.email_normalized,
    scope: "organization",
    source: "one_click_unsubscribe",
    relatedQueueItemId: resolved.tokenRow.related_queue_item_id,
    campaignId: resolved.tokenRow.related_campaign_id,
    categoryCode: resolved.tokenRow.related_category_code,
    idempotencyKey: `oneclick:${resolved.tokenRow.id}`,
    leadId: resolved.preference?.lead_id ?? null,
    contactId: resolved.preference?.contact_id ?? null,
    ipHash: hashPreferenceMeta(storeIp ? ip : null),
    userAgentHash: hashPreferenceMeta(request.headers.get("user-agent")),
  });

  if (resolved.tokenRow.single_use) {
    await markTokenUsed(resolved.tokenRow.id);
  }

  return NextResponse.json(
    { ok: result.success },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
