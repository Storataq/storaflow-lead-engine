import { NextResponse } from "next/server";

import { validateEmailEnvironment } from "@/lib/email/ops/env";
import { timingSafeStringEqual, envFlag } from "@/lib/email/ops/security";

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

  const env = validateEmailEnvironment({
    production: envFlag("EMAIL_PRODUCTION_MODE"),
  });

  const live = env.ready;
  const body = {
    status: live ? "ok" : "degraded",
    liveness: "ok",
    readiness: live ? "ready" : "not_ready",
    checkedAt: new Date().toISOString(),
    blockingErrors: env.blockingErrors.map((e) => ({
      key: e.key,
      message: e.message,
    })),
    warnings: env.warnings.map((w) => ({ key: w.key, message: w.message })),
  };

  return NextResponse.json(body, {
    status: live ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
