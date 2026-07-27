import { NextResponse } from "next/server";
import { z } from "zod";

import { buildEmailOpsOverview } from "@/lib/email/ops/health";
import { timingSafeStringEqual } from "@/lib/email/ops/security";

function authorize(req: Request): boolean {
  const secret = process.env.EMAIL_HEALTH_SECRET?.trim();
  const provided =
    req.headers.get("x-email-health-secret") ??
    req.headers.get("x-email-execution-secret");
  if (!secret || !provided) return false;
  return timingSafeStringEqual(provided, secret);
}

const querySchema = z.object({
  organizationId: z.string().uuid(),
});

export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    organizationId: url.searchParams.get("organizationId"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "organizationId required" }, { status: 400 });
  }

  const overview = await buildEmailOpsOverview(parsed.data.organizationId);

  return NextResponse.json(
    {
      overall: overview.overall,
      queue: overview.queue,
      components: overview.components.map((c) => ({
        component: c.component,
        status: c.status,
        warningSummary: c.warningSummary,
        errorSummary: c.errorSummary,
      })),
      openIncidents: overview.openIncidents,
      workerHeartbeatAt: overview.workerHeartbeatAt,
      emergencyStop: overview.controls.emergency_stop,
      testMode: overview.controls.test_mode,
      providerDispatchEnabled: overview.controls.provider_dispatch_enabled,
      checkedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" }, status: overview.overall === "unhealthy" ? 503 : 200 },
  );
}
