import { NextResponse } from "next/server";
import { z } from "zod";

import { createServiceClient } from "@/lib/supabase/admin";
import { timingSafeStringEqual } from "@/lib/email/ops/security";

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

  const url = new URL(req.url);
  const organizationId = url.searchParams.get("organizationId");
  const parsed = z.string().uuid().safeParse(organizationId);
  if (!parsed.success) {
    return NextResponse.json({ error: "organizationId required" }, { status: 400 });
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const supabase = createServiceClient() as any;
  const statuses = [
    "scheduled",
    "available",
    "locked",
    "processing",
    "retry",
    "failed",
    "dead_letter",
  ] as const;

  const counts: Record<string, number> = {};
  for (const status of statuses) {
    const { count } = await supabase
      .from("email_queue_jobs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", parsed.data)
      .eq("status", status);
    counts[status] = count ?? 0;
  }

  return NextResponse.json(
    { organizationId: parsed.data, counts, checkedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
