import { withApiHandler } from "@/lib/platform-api/handler";
import { apiSuccess } from "@/lib/platform-api/responses";
import { getWhiteLabelConfigForApi } from "@/lib/white-label/queries";
import { toPublicWhiteLabelPayload } from "@/lib/white-label/public-payload";

/**
 * GET /api/v1/white-label — org-scoped branding for partners / SDKs.
 * Requires settings:read. Does not expose other organizations.
 */
export async function GET(request: Request) {
  return withApiHandler(request, "settings:read", async (ctx) => {
    const resolved = await getWhiteLabelConfigForApi(ctx.organizationId);
    const payload = toPublicWhiteLabelPayload(resolved.config, {
      cssText: resolved.themeCss,
      variables: resolved.themeVariables,
    });
    return apiSuccess(
      {
        status: resolved.status,
        domains: resolved.domains.map((d) => ({
          hostname: d.hostname,
          isPrimary: d.is_primary,
          status: d.status,
          sslStatus: d.ssl_status,
        })),
        branding: payload,
      },
      { requestId: ctx.requestId },
    );
  });
}
