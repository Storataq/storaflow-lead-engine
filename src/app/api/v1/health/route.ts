import { withApiHandler } from "@/lib/platform-api/handler";
import { apiSuccess } from "@/lib/platform-api/responses";
import { CURRENT_API_VERSION } from "@/lib/platform-api/constants";

export async function GET(request: Request) {
  return withApiHandler(request, undefined, async (ctx) =>
    apiSuccess(
      {
        ok: true,
        version: CURRENT_API_VERSION,
        organizationId: ctx.organizationId,
        deprecation: null,
      },
      { requestId: ctx.requestId },
    ),
  );
}
