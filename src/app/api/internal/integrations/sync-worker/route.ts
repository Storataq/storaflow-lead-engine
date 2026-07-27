import { NextResponse } from "next/server";

import { processSyncRun } from "@/lib/integrations/sync-engine";

/**
 * Internal sync worker trigger — background queue processing.
 * Secured by INTEGRATIONS_INTERNAL_SECRET (same pattern as email execution).
 */
export async function POST(request: Request) {
  const secret = process.env.INTEGRATIONS_INTERNAL_SECRET?.trim();
  const header = request.headers.get("x-storaflow-internal-secret");
  if (!secret || header !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: {
    organizationId?: string;
    syncRunId?: string;
    integrationCode?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  if (!body.organizationId || !body.syncRunId || !body.integrationCode) {
    return NextResponse.json(
      { ok: false, error: "Missing fields" },
      { status: 400 },
    );
  }

  try {
    const result = await processSyncRun({
      organizationId: body.organizationId,
      syncRunId: body.syncRunId,
      integrationCode: body.integrationCode,
    });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
