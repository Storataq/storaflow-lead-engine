import { NextResponse } from "next/server";
import { z } from "zod";

import { runExecutionWorker } from "@/lib/email/execution/worker";
import { upsertWorkerHeartbeat } from "@/lib/email/ops/health";
import { timingSafeStringEqual, createCorrelationId } from "@/lib/email/ops/security";
import { envFlag } from "@/lib/email/ops/security";
import { ensureEmergencyControls } from "@/lib/email/ops/controls";

const bodySchema = z.object({
  organizationId: z.string().uuid(),
  workerId: z.string().min(1).optional(),
  batchSize: z.number().int().min(1).max(200).optional(),
  live: z.boolean().optional(),
});

export async function POST(req: Request) {
  const secret = process.env.EMAIL_EXECUTION_INTERNAL_SECRET;
  const provided = req.headers.get("x-email-execution-secret");
  if (!secret || !provided || !timingSafeStringEqual(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!envFlag("EMAIL_WORKER_ENABLED", true)) {
    return NextResponse.json(
      { error: "Worker disabled", code: "worker_disabled" },
      { status: 503 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const controls = await ensureEmergencyControls(parsed.data.organizationId);
  if (controls.emergency_stop || !controls.worker_enabled) {
    return NextResponse.json(
      {
        error: "Worker blocked by emergency controls",
        code: "emergency_stop",
      },
      { status: 503 },
    );
  }

  const nowIso = new Date().toISOString();
  const workerId =
    parsed.data.workerId ?? process.env.EMAIL_WORKER_ID ?? "worker";
  const correlationId = createCorrelationId("worker");

  await upsertWorkerHeartbeat({
    organizationId: parsed.data.organizationId,
    workerId,
    status: "running",
  });

  // Live dispatch requires explicit env + org control. Body.live alone is insufficient.
  const simulation = !(
    parsed.data.live === true &&
    envFlag("EMAIL_PROVIDER_DISPATCH_ENABLED") &&
    controls.provider_dispatch_enabled &&
    !controls.emergency_stop
  );

  console.info("[email_ops] worker_run", {
    correlationId,
    organizationId: parsed.data.organizationId,
    workerId,
    simulation,
  });

  const result = await runExecutionWorker({
    organizationId: parsed.data.organizationId,
    workerId,
    batchSize: parsed.data.batchSize ?? 25,
    leaseSeconds: 120,
    nowIso,
    simulation,
  });

  await upsertWorkerHeartbeat({
    organizationId: parsed.data.organizationId,
    workerId,
    status: "idle",
  });

  return NextResponse.json({ ...result, correlationId, simulation });
}
