import { withApiHandler } from "@/lib/platform-api/handler";
import { apiSuccess, apiError } from "@/lib/platform-api/responses";
import {
  getCompanyApi,
  updateCompanyApi,
  deleteCompanyApi,
} from "@/lib/platform-api/resources";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Ctx) {
  const { id } = await context.params;
  return withApiHandler(request, "companies:read", async (ctx) => {
    const row = await getCompanyApi(ctx.organizationId, id);
    if (!row) {
      return apiError("not_found", "Company not found.", {
        requestId: ctx.requestId,
      });
    }
    return apiSuccess(row, { requestId: ctx.requestId });
  });
}

export async function PATCH(request: Request, context: Ctx) {
  const { id } = await context.params;
  return withApiHandler(request, "companies:write", async (ctx) => {
    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return apiError("validation_error", "Invalid JSON body.", {
        requestId: ctx.requestId,
      });
    }
    const row = await updateCompanyApi(ctx.organizationId, id, body);
    if (!row) {
      return apiError("not_found", "Company not found.", {
        requestId: ctx.requestId,
      });
    }
    return apiSuccess(row, { requestId: ctx.requestId });
  });
}

export async function DELETE(request: Request, context: Ctx) {
  const { id } = await context.params;
  return withApiHandler(request, "companies:write", async (ctx) => {
    const row = await deleteCompanyApi(ctx.organizationId, id);
    if (!row) {
      return apiError("not_found", "Company not found.", {
        requestId: ctx.requestId,
      });
    }
    return apiSuccess({ id: row.id, deleted: true }, { requestId: ctx.requestId });
  });
}
