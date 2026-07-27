import { NextResponse } from "next/server";

import { getEmailProviderDiagnostics } from "@/lib/email/provider";
import { timingSafeStringEqual, redactSecret, envFlag } from "@/lib/email/ops/security";

function authorize(req: Request): boolean {
  const secret = process.env.EMAIL_HEALTH_SECRET?.trim();
  const provided =
    req.headers.get("x-email-health-secret") ??
    req.headers.get("x-email-execution-secret");
  if (!secret || !provided) return false;
  return timingSafeStringEqual(provided, secret);
}

export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const diag = getEmailProviderDiagnostics();
  const dispatchEnabled = envFlag("EMAIL_PROVIDER_DISPATCH_ENABLED");

  return NextResponse.json(
    {
      provider: "resend",
      apiKeyConfigured: diag.hasResendKey,
      apiKeyHint: diag.hasResendKey
        ? redactSecret(process.env.RESEND_API_KEY)
        : "(unset)",
      webhookSecretConfigured: Boolean(process.env.RESEND_WEBHOOK_SECRET?.trim()),
      dispatchEnabled,
      checkedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
