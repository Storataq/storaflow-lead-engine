import { withApiHandler } from "@/lib/platform-api/handler";
import { apiSuccess, apiError } from "@/lib/platform-api/responses";
import {
  listCompaniesApi,
  createCompanyApi,
} from "@/lib/platform-api/resources";

export async function GET(request: Request) {
  return withApiHandler(request, "companies:read", async (ctx) => {
    const result = await listCompaniesApi(
      ctx.organizationId,
      new URL(request.url),
    );
    return apiSuccess(result.items, {
      requestId: ctx.requestId,
      meta: result.meta,
    });
  });
}

export async function POST(request: Request) {
  return withApiHandler(request, "companies:write", async (ctx) => {
    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return apiError("validation_error", "Invalid JSON body.", {
        requestId: ctx.requestId,
      });
    }
    if (!body.name && !body.company_name) {
      return apiError("validation_error", "name is required.", {
        requestId: ctx.requestId,
        validationErrors: [{ field: "name", message: "Required" }],
      });
    }
    const created = await createCompanyApi(ctx.organizationId, body);
    return apiSuccess(created, { status: 201, requestId: ctx.requestId });
  });
}
