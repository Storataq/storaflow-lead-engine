import { NextResponse } from "next/server";

import {
  getQueueRowForOpenTracking,
  recordEngagementEvent,
} from "@/lib/email/tracking/process";
import { verifyOpenTrackingToken } from "@/lib/email/tracking/tokens";
import { checkRateLimit } from "@/lib/email/ops/rate-limit";
import { envFlag } from "@/lib/email/ops/security";

const PIXEL = Buffer.from(
  "R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
  "base64",
);

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rl = checkRateLimit({
    key: `open:${ip}`,
    limit: Number(process.env.EMAIL_PREFERENCE_RATE_LIMIT ?? 120),
  });
  if (!rl.allowed) {
    return new NextResponse(PIXEL, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-store, max-age=0",
        "Retry-After": String(rl.retryAfterSec),
      },
    });
  }

  if (envFlag("EMAIL_TRACKING_ENABLED", true)) {
    try {
      const decoded = verifyOpenTrackingToken(token);
      if (decoded) {
        const queueRow = await getQueueRowForOpenTracking({
          queueItemId: decoded.q,
          renderedMessageId: decoded.r,
        });

        if (queueRow) {
          await recordEngagementEvent({
            queueRow,
            eventType: "opened",
            ipAddress: request.headers.get("x-forwarded-for"),
            userAgent: request.headers.get("user-agent"),
            referer: request.headers.get("referer"),
          });
        }
      }
    } catch {
      // Fail closed on secret/config errors — still return pixel.
    }
  }

  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
