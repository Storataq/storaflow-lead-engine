import { NextResponse } from "next/server";
import { z } from "zod";

import { runAiTaskWorker } from "@/ai/tasks/worker";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

const bodySchema = z.object({
  organizationId: z.string().uuid(),
  batchSize: z.number().int().min(1).max(50).optional(),
});

/**
 * POST /api/internal/ai/worker-run
 * Header: x-ai-platform-secret
 */
export async function POST(req: Request) {
  const secret = process.env.AI_PLATFORM_INTERNAL_SECRET;
  const provided = req.headers.get("x-ai-platform-secret");
  if (!secret || !provided || !timingSafeEqual(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.AI_PLATFORM_WORKER_ENABLED === "false") {
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

  const result = await runAiTaskWorker({
    organizationId: parsed.data.organizationId,
    batchSize: parsed.data.batchSize,
  });

  return NextResponse.json({ ok: true, result });
}
