/**
 * OpenAPI 3.1 document for /api/v1 — kept in sync with route surface.
 * Future SDK generation targets: JS/TS/Python/PHP/C#/Java/Go.
 */

import {
  API_SCOPES,
  PLATFORM_WEBHOOK_EVENTS,
  SDK_TARGETS,
  CURRENT_API_VERSION,
  FUTURE_API_VERSIONS,
} from "@/lib/platform-api/constants";

export function buildOpenApiDocument(baseUrl: string) {
  const servers = [{ url: `${baseUrl}/api/v1`, description: "Current (v1)" }];
  for (const v of FUTURE_API_VERSIONS) {
    servers.push({
      url: `${baseUrl}/api/${v}`,
      description: `${v} (reserved — not yet available)`,
    });
  }

  const bearer = {
    type: "http",
    scheme: "bearer",
    bearerFormat: "API Key",
    description: "Use `Authorization: Bearer sf_live_…` or `X-API-Key`.",
  };

  const listParams = [
    { name: "page", in: "query", schema: { type: "integer", default: 1 } },
    { name: "pageSize", in: "query", schema: { type: "integer", default: 25, maximum: 100 } },
    { name: "sort", in: "query", schema: { type: "string", default: "created_at" } },
    { name: "order", in: "query", schema: { type: "string", enum: ["asc", "desc"] } },
    { name: "q", in: "query", schema: { type: "string" } },
    { name: "status", in: "query", schema: { type: "string" } },
    { name: "country", in: "query", schema: { type: "string" } },
    { name: "industry", in: "query", schema: { type: "string" } },
    { name: "ownerId", in: "query", schema: { type: "string", format: "uuid" } },
    { name: "tag", in: "query", schema: { type: "string" } },
    { name: "leadScoreMin", in: "query", schema: { type: "number" } },
    { name: "leadScoreMax", in: "query", schema: { type: "number" } },
    { name: "createdAfter", in: "query", schema: { type: "string", format: "date-time" } },
    { name: "createdBefore", in: "query", schema: { type: "string", format: "date-time" } },
    { name: "cursor", in: "query", schema: { type: "string" }, description: "Cursor pagination ready" },
  ];

  const paths: Record<string, unknown> = {
    "/health": {
      get: {
        summary: "API health",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "OK" } },
      },
    },
    "/companies": {
      get: {
        summary: "List companies",
        security: [{ bearerAuth: [] }],
        parameters: listParams,
        responses: { "200": { description: "Paginated companies" } },
      },
      post: {
        summary: "Create company",
        security: [{ bearerAuth: [] }],
        responses: { "201": { description: "Created" } },
      },
    },
    "/companies/{id}": {
      get: {
        summary: "Get company",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Company" }, "404": { description: "Not found" } },
      },
      patch: {
        summary: "Update company",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Updated" } },
      },
      delete: {
        summary: "Delete company",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Deleted" } },
      },
    },
    "/contacts": {
      get: {
        summary: "List contacts",
        security: [{ bearerAuth: [] }],
        parameters: listParams,
        responses: { "200": { description: "Paginated contacts" } },
      },
    },
    "/deals": {
      get: {
        summary: "List deals",
        security: [{ bearerAuth: [] }],
        parameters: listParams,
        responses: { "200": { description: "Paginated deals" } },
      },
    },
    "/tasks": {
      get: {
        summary: "List tasks",
        security: [{ bearerAuth: [] }],
        parameters: listParams,
        responses: { "200": { description: "Paginated tasks" } },
      },
    },
    "/campaigns": {
      get: {
        summary: "List campaigns",
        security: [{ bearerAuth: [] }],
        parameters: listParams,
        responses: { "200": { description: "Paginated campaigns" } },
      },
    },
    "/automations": {
      get: {
        summary: "List automations",
        security: [{ bearerAuth: [] }],
        parameters: listParams,
        responses: { "200": { description: "Paginated automations" } },
      },
    },
    "/reports": {
      get: {
        summary: "List reports",
        security: [{ bearerAuth: [] }],
        parameters: listParams,
        responses: { "200": { description: "Paginated reports" } },
      },
    },
    "/lead-scores": {
      get: {
        summary: "List lead scores",
        security: [{ bearerAuth: [] }],
        parameters: listParams,
        responses: { "200": { description: "Lead scores" } },
      },
    },
    "/company-intelligence/{companyId}": {
      get: {
        summary: "Company intelligence profile",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "companyId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Profile" }, "404": { description: "Not found" } },
      },
    },
    "/contact-intelligence/{contactId}": {
      get: {
        summary: "Contact intelligence profile",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "contactId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Profile" }, "404": { description: "Not found" } },
      },
    },
    "/analytics/summary": {
      get: {
        summary: "Analytics summary",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Summary metrics" } },
      },
    },
    "/bulk": {
      post: {
        summary: "Bulk operations",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["operation", "resource"],
                properties: {
                  operation: {
                    type: "string",
                    enum: [
                      "import",
                      "update",
                      "delete",
                      "archive",
                      "assign",
                      "export",
                      "tag",
                    ],
                  },
                  resource: { type: "string" },
                  ids: { type: "array", items: { type: "string" } },
                  payload: { type: "object" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Bulk result" } },
      },
    },
    "/openapi.json": {
      get: {
        summary: "OpenAPI document",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "OpenAPI 3.1 JSON" } },
      },
    },
    "/white-label": {
      get: {
        summary: "Get organization white-label configuration",
        description:
          "Returns org-scoped branding, theme CSS variables, feature toggles, and domains. Requires settings:read. Custom JS/CSS are returned only as flags when not enabled for execution.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "White-label public config for the API key org" },
        },
      },
    },
    "/billing": {
      get: {
        summary: "Get subscription, features, and usage",
        description:
          "Returns org-scoped subscription status, feature availability, and limit/usage metrics. Requires billing:read. All checks use the centralized limit engine.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Billing snapshot for the API key organization",
          },
        },
      },
    },
  };

  return {
    openapi: "3.1.0",
    info: {
      title: "Storaflow Platform API",
      version: CURRENT_API_VERSION,
      description:
        "Secure org-scoped REST API for integrations, partners, and future SDKs. " +
        `Scopes: ${API_SCOPES.join(", ")}. Webhook events: ${PLATFORM_WEBHOOK_EVENTS.join(", ")}. ` +
        `SDK targets prepared: ${SDK_TARGETS.join(", ")}.`,
    },
    servers,
    components: {
      securitySchemes: { bearerAuth: bearer },
      schemas: {
        ApiError: {
          type: "object",
          properties: {
            status: { const: "error" },
            error: {
              type: "object",
              properties: {
                code: { type: "string" },
                message: { type: "string" },
                validationErrors: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      field: { type: "string" },
                      message: { type: "string" },
                    },
                  },
                },
              },
            },
            requestId: { type: "string" },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        ApiSuccess: {
          type: "object",
          properties: {
            status: { const: "ok" },
            data: {},
            meta: { type: "object" },
            requestId: { type: "string" },
            timestamp: { type: "string", format: "date-time" },
          },
        },
      },
    },
    paths,
    "x-storaflow-deprecation": {
      policy: "Deprecated versions remain available with Sunset headers before removal.",
      futureVersions: FUTURE_API_VERSIONS,
    },
    "x-storaflow-sdk": {
      targets: SDK_TARGETS,
      status: "generation-ready",
    },
  };
}
