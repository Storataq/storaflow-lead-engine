import { NextResponse } from "next/server";
import { z } from "zod";

import { runExecutionScheduler } from "@/lib/email/execution/scheduler";
import {
  timingSafeStringEqual,
  createCorrelationId,
  envFlag,
} from "@/lib/email/ops/security";
import { ensureEmergencyControls } from "@/lib/email/ops/controls";

const bodySchema = z.object({
  organizationId: z.string().uuid(),
  workerId: z.string().min(1).optional(),
  dueLimit: z.number().int().min(1).max(500).optional(),
});

export async function POST(req: Request) {
  const secret = process.env.EMAIL_EXECUTION_INTERNAL_SECRET;
  const provided = req.headers.get("x-email-execution-secret");
  if (!secret || !provided || !timingSafeStringEqual(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!envFlag("EMAIL_SCHEDULER_ENABLED", true)) {
    return NextResponse.json(
      { error: "Scheduler disabled", code: "scheduler_disabled" },
      { status: 503 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const controls = await ensureEmergencyControls(parsed.data.organizationId);
  if (controls.emergency_stop || !controls.scheduler_enabled) {
    return NextResponse.json(
      { error: "Scheduler blocked", code: "emergency_stop" },
      { status: 503 },
    );
  }

  const correlationId = createCorrelationId("scheduler");
  const workerId =
    parsed.data.workerId ?? process.env.EMAIL_WORKER_ID ?? "scheduler";

  console.info("[email_ops] scheduler_run", {
    correlationId,
    organizationId: parsed.data.organizationId,
  });

  const result = await runExecutionScheduler({
    organizationId: parsed.data.organizationId,
    workerId,
    nowIso: new Date().toISOString(),
    dueLimit: parsed.data.dueLimit ?? 100,
  });

  return NextResponse.json({ ...result, correlationId });
}
