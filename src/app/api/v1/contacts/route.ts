import { withApiHandler } from "@/lib/platform-api/handler";
import { apiSuccess } from "@/lib/platform-api/responses";
import { listContactsApi } from "@/lib/platform-api/resources";

export async function GET(request: Request) {
  return withApiHandler(request, "contacts:read", async (ctx) => {
    const result = await listContactsApi(
      ctx.organizationId,
      new URL(request.url),
    );
    return apiSuccess(result.items, {
      requestId: ctx.requestId,
      meta: result.meta,
    });
  });
}
