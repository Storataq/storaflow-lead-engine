import { NextResponse } from "next/server";

import { deliverWebhookAttempt } from "@/lib/platform-api/delivery";
import { createServiceClient } from "@/lib/supabase/admin";

/**
 * Process queued / retrying webhook deliveries.
 * Secured by PLATFORM_API_INTERNAL_SECRET.
 */
export async function POST(request: Request) {
  const secret = process.env.PLATFORM_API_INTERNAL_SECRET?.trim();
  const header = request.headers.get("x-storaflow-internal-secret");
  if (!secret || header !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const limit = Math.min(
    50,
    Number(new URL(request.url).searchParams.get("limit") ?? "20") || 20,
  );

  try {
    const supabase = createServiceClient();
    const now = new Date().toISOString();
    const { data: queued } = await supabase
      .from("platform_webhook_deliveries")
      .select("id, organization_id")
      .in("status", ["queued", "retrying"])
      .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
      .order("created_at", { ascending: true })
      .limit(limit);

    let delivered = 0;
    let failed = 0;
    for (const row of queued ?? []) {
      const result = await deliverWebhookAttempt({
        organizationId: row.organization_id,
        deliveryId: row.id,
      });
      if (result.ok) delivered += 1;
      else failed += 1;
    }

    return NextResponse.json({
      ok: true,
      processed: queued?.length ?? 0,
      delivered,
      failed,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Worker failed",
      },
      { status: 500 },
    );
  }
}
