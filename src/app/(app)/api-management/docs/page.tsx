import type { Metadata } from "next";

import { ApiManagementSubnav } from "@/components/platform-api/api-management-subnav";
import { PageHeader } from "@/components/layout/page-header";
import {
  API_SCOPES,
  API_SCOPE_LABELS,
  PLATFORM_WEBHOOK_EVENTS,
  PLATFORM_WEBHOOK_EVENT_LABELS,
  SDK_TARGETS,
} from "@/lib/platform-api/constants";
import { buildOpenApiDocument } from "@/lib/platform-api/openapi";

export const metadata: Metadata = { title: "API Documentation" };

export default function ApiDocsPage() {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "";
  const openapi = buildOpenApiDocument(base || "https://app.example.com");
  const paths = Object.keys(openapi.paths ?? {});

  return (
    <div>
      <PageHeader
        title="API documentation"
        description="Authentication, endpoints, errors, rate limits, webhooks, and OpenAPI."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "API Management", href: "/api-management" },
          { label: "Documentation" },
        ]}
      />
      <ApiManagementSubnav currentPath="/api-management/docs" />

      <div className="prose prose-sm dark:prose-invert max-w-3xl space-y-8">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Authentication</h2>
          <p className="text-sm text-muted-foreground">
            Send <code>Authorization: Bearer sf_live_…</code> or{" "}
            <code>X-API-Key: sf_live_…</code>. Keys are hashed at rest; plaintext
            is shown only at creation/rotation.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Base URL</h2>
          <p className="text-sm text-muted-foreground">
            <code>{base || "{APP_URL}"}/api/v1</code> — v2/v3 reserved for future
            deprecation-friendly upgrades.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Endpoints</h2>
          <ul className="list-inside list-disc text-sm text-muted-foreground">
            {paths.map((p) => (
              <li key={p}>
                <code>{p}</code>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Example</h2>
          <pre className="overflow-x-auto rounded-xl border border-border bg-muted/40 p-3 text-xs">
{`curl -H "Authorization: Bearer sf_live_…" \\
  "${base || "https://your-app"}/api/v1/companies?page=1&pageSize=25&q=bike"`}
          </pre>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Errors</h2>
          <p className="text-sm text-muted-foreground">
            Responses use <code>status: &quot;error&quot;</code> with{" "}
            <code>error.code</code>, <code>error.message</code>, optional{" "}
            <code>validationErrors</code>, plus <code>requestId</code> and{" "}
            <code>timestamp</code>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Rate limits</h2>
          <p className="text-sm text-muted-foreground">
            Per-key minute and daily limits. Exceeding returns HTTP 429 with{" "}
            <code>Retry-After</code> and <code>X-RateLimit-*</code> headers.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Scopes</h2>
          <ul className="columns-1 gap-2 text-sm text-muted-foreground sm:columns-2">
            {API_SCOPES.map((s) => (
              <li key={s}>
                <code>{s}</code> — {API_SCOPE_LABELS[s]}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Webhooks</h2>
          <p className="text-sm text-muted-foreground">
            Outbound HTTPS webhooks are signed with{" "}
            <code>X-Storaflow-Signature: sha256=…</code> over{" "}
            <code>timestamp.body</code>. Verify timestamp skew for replay
            protection.
          </p>
          <ul className="list-inside list-disc text-sm text-muted-foreground">
            {PLATFORM_WEBHOOK_EVENTS.map((ev) => (
              <li key={ev}>
                <code>{ev}</code> — {PLATFORM_WEBHOOK_EVENT_LABELS[ev]}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">OpenAPI & SDKs</h2>
          <p className="text-sm text-muted-foreground">
            Authenticated OpenAPI: <code>GET /api/v1/openapi.json</code>. SDK
            generation prepared for: {SDK_TARGETS.join(", ")}.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Pagination & filtering</h2>
          <p className="text-sm text-muted-foreground">
            Query params: <code>page</code>, <code>pageSize</code>,{" "}
            <code>sort</code>, <code>order</code>, <code>q</code>,{" "}
            <code>status</code>, <code>country</code>, <code>industry</code>,{" "}
            <code>ownerId</code>, <code>tag</code>, <code>leadScoreMin</code>,{" "}
            <code>leadScoreMax</code>, <code>createdAfter</code>,{" "}
            <code>createdBefore</code>, <code>cursor</code> (ready).
          </p>
        </section>
      </div>
    </div>
  );
}
