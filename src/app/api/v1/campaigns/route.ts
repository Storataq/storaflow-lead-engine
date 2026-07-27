import { withApiHandler } from "@/lib/platform-api/handler";
import { apiSuccess } from "@/lib/platform-api/responses";
import { listCampaignsApi } from "@/lib/platform-api/resources";

export async function GET(request: Request) {
  return withApiHandler(request, "campaigns:read", async (ctx) => {
    const result = await listCampaignsApi(
      ctx.organizationId,
      new URL(request.url),
    );
    return apiSuccess(result.items, {
      requestId: ctx.requestId,
      meta: result.meta,
    });
  });
}
