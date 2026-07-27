import { withApiHandler } from "@/lib/platform-api/handler";
import { apiSuccess, apiError } from "@/lib/platform-api/responses";
import { getContactIntelligenceApi } from "@/lib/platform-api/resources";

type Ctx = { params: Promise<{ contactId: string }> };

export async function GET(request: Request, context: Ctx) {
  const { contactId } = await context.params;
  return withApiHandler(request, "contact_intelligence:read", async (ctx) => {
    const row = await getContactIntelligenceApi(ctx.organizationId, contactId);
    if (!row) {
      return apiError("not_found", "Contact intelligence not found.", {
        requestId: ctx.requestId,
      });
    }
    return apiSuccess(row, { requestId: ctx.requestId });
  });
}
