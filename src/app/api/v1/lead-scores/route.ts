import { withApiHandler } from "@/lib/platform-api/handler";
import { apiSuccess } from "@/lib/platform-api/responses";
import { listLeadScoresApi } from "@/lib/platform-api/resources";

export async function GET(request: Request) {
  return withApiHandler(request, "lead_scores:read", async (ctx) => {
    const result = await listLeadScoresApi(
      ctx.organizationId,
      new URL(request.url),
    );
    return apiSuccess(result.items, {
      requestId: ctx.requestId,
      meta: result.meta,
    });
  });
}
