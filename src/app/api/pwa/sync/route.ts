import { NextResponse } from "next/server";

import { enqueueServerSyncAction } from "@/lib/pwa/actions";
import { PWA_OFFLINE_ACTION_TYPES } from "@/lib/pwa/constants";

/**
 * POST /api/pwa/sync — flush a single offline queue item from the client.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      clientId?: string;
      actionType?: string;
      payload?: Record<string, unknown>;
    };

    if (
      !body.clientId ||
      !body.actionType ||
      !PWA_OFFLINE_ACTION_TYPES.includes(
        body.actionType as (typeof PWA_OFFLINE_ACTION_TYPES)[number],
      )
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid sync payload" },
        { status: 400 },
      );
    }

    const result = await enqueueServerSyncAction({
      clientId: body.clientId,
      actionType: body.actionType,
      payload: body.payload ?? {},
    });

    return NextResponse.json(
      { ok: result.success, message: result.message, id: result.id },
      { status: result.success ? 200 : 400 },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Sync failed" },
      { status: 500 },
    );
  }
}
