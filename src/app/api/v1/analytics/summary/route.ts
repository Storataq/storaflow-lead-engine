import { withApiHandler } from "@/lib/platform-api/handler";
import { apiSuccess } from "@/lib/platform-api/responses";
import { getAnalyticsSummaryApi } from "@/lib/platform-api/resources";

export async function GET(request: Request) {
  return withApiHandler(request, "analytics:read", async (ctx) => {
    const summary = await getAnalyticsSummaryApi(ctx.organizationId);
    return apiSuccess(summary, { requestId: ctx.requestId });
  });
}
