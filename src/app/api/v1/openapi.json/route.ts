import { withApiHandler } from "@/lib/platform-api/handler";
import { apiSuccess } from "@/lib/platform-api/responses";
import { buildOpenApiDocument } from "@/lib/platform-api/openapi";

export async function GET(request: Request) {
  return withApiHandler(request, undefined, async (ctx) => {
    const base =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      new URL(request.url).origin;
    return apiSuccess(buildOpenApiDocument(base), {
      requestId: ctx.requestId,
    });
  });
}
