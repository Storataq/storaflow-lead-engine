import { withApiHandler } from "@/lib/platform-api/handler";
import { apiSuccess, apiError } from "@/lib/platform-api/responses";
import { getCompanyIntelligenceApi } from "@/lib/platform-api/resources";

type Ctx = { params: Promise<{ companyId: string }> };

export async function GET(request: Request, context: Ctx) {
  const { companyId } = await context.params;
  return withApiHandler(request, "company_intelligence:read", async (ctx) => {
    const row = await getCompanyIntelligenceApi(ctx.organizationId, companyId);
    if (!row) {
      return apiError("not_found", "Company intelligence not found.", {
        requestId: ctx.requestId,
      });
    }
    return apiSuccess(row, { requestId: ctx.requestId });
  });
}
