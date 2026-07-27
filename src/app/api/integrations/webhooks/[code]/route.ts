import { NextResponse } from "next/server";

import { verifyWebhookSignature } from "@/lib/integrations/webhooks";
import { createServiceClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/supabase";

type RouteContext = {
  params: Promise<{ code: string }>;
};

/**
 * Incoming webhook receiver scaffolding.
 * Signature validation + delivery log; provider-specific handlers register later.
 */
export async function POST(request: Request, context: RouteContext) {
  const { code } = await context.params;
  const rawBody = await request.text();
  const signature =
    request.headers.get("x-storaflow-signature") ??
    request.headers.get("x-hub-signature-256") ??
    "";

  const organizationId =
    request.headers.get("x-storaflow-organization-id") ?? "";

  if (!organizationId) {
    return NextResponse.json(
      { ok: false, error: "Missing organization context" },
      { status: 400 },
    );
  }

  try {
    const secret = process.env.INTEGRATIONS_WEBHOOK_SECRET?.trim();
    let signatureValid: boolean | null = null;
    if (secret && signature) {
      signatureValid = verifyWebhookSignature({
        secret,
        body: rawBody,
        signatureHeader: signature,
      });
      if (!signatureValid) {
        return NextResponse.json(
          { ok: false, error: "Invalid signature" },
          { status: 401 },
        );
      }
    }

    const supabase = createServiceClient();
    const { data: webhook } = await supabase
      .from("integration_webhooks")
      .select("id, status")
      .eq("organization_id", organizationId)
      .eq("direction", "incoming")
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (webhook) {
      await supabase.from("integration_webhook_deliveries").insert({
        organization_id: organizationId,
        webhook_id: webhook.id,
        status: "delivered",
        http_status: 200,
        attempt_count: 1,
        payload_json: {
          integrationCode: code,
          receivedAt: new Date().toISOString(),
          bodyPreview: rawBody.slice(0, 2000),
        } as Json,
        signature_valid: signatureValid,
        delivered_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      ok: true,
      integration: code,
      persisted: Boolean(webhook),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
