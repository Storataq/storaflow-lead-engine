import { withApiHandler } from "@/lib/platform-api/handler";
import { apiSuccess } from "@/lib/platform-api/responses";
import { bootstrapAiPlatform, getAiOverview } from "@/ai/queries";

/**
 * GET /api/v1/ai — AI platform overview (REST).
 * Requires ai:read. GraphQL / MCP / A2A can wrap the same query layer later.
 */
export async function GET(request: Request) {
  return withApiHandler(request, "ai:read", async (ctx) => {
    await bootstrapAiPlatform(ctx.organizationId);
    const overview = await getAiOverview(ctx.organizationId);
    return apiSuccess(
      {
        ...overview,
        extensions: {
          graphqlReady: true,
          mcpReady: true,
          agentToAgentReady: true,
        },
      },
      { requestId: ctx.requestId },
    );
  });
}
