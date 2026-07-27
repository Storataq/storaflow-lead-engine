import { withApiHandler } from "@/lib/platform-api/handler";
import { apiSuccess, apiError } from "@/lib/platform-api/responses";
import { runBulkOperationApi } from "@/lib/platform-api/resources";
import { BULK_OPERATIONS } from "@/lib/platform-api/constants";

export async function POST(request: Request) {
  return withApiHandler(request, "bulk:write", async (ctx) => {
    let body: {
      operation?: string;
      resource?: string;
      ids?: string[];
      payload?: Record<string, unknown>;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return apiError("validation_error", "Invalid JSON body.", {
        requestId: ctx.requestId,
      });
    }
    if (
      !body.operation ||
      !BULK_OPERATIONS.includes(
        body.operation as (typeof BULK_OPERATIONS)[number],
      )
    ) {
      return apiError("validation_error", "Invalid bulk operation.", {
        requestId: ctx.requestId,
        validationErrors: [{ field: "operation", message: "Unsupported" }],
      });
    }
    if (!body.resource) {
      return apiError("validation_error", "resource is required.", {
        requestId: ctx.requestId,
      });
    }
    const result = await runBulkOperationApi({
      organizationId: ctx.organizationId,
      operation: body.operation,
      resource: body.resource,
      ids: body.ids,
      payload: body.payload,
    });
    return apiSuccess(result, { requestId: ctx.requestId });
  });
}
