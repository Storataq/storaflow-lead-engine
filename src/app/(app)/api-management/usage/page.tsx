import type { Metadata } from "next";

import { ApiManagementSubnav } from "@/components/platform-api/api-management-subnav";
import { PageHeader } from "@/components/layout/page-header";
import {
  listApiUsageDaily,
  listPlatformApiKeys,
} from "@/lib/platform-api/queries";
import { utcUsageDate } from "@/lib/platform-api/rate-limit";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: "API Usage" };

export default async function ApiUsagePage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const [usage, keys] = await Promise.all([
    listApiUsageDaily(context.organization.id, 14),
    listPlatformApiKeys(context.organization.id),
  ]);
  const today = utcUsageDate();
  const todayRows = usage.filter((u) => u.usage_date === today);
  const requestsToday = todayRows.reduce((s, u) => s + u.request_count, 0);
  const limitSum = keys
    .filter((k) => k.status === "active")
    .reduce((s, k) => s + k.rate_limit_per_day, 0);
  const remaining = Math.max(0, limitSum - requestsToday);
  const rate429 = todayRows.reduce((s, u) => s + u.rate_limit_429_count, 0);

  return (
    <div>
      <PageHeader
        title="API usage"
        description="Daily request counts, remaining capacity, and rate-limit events."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "API Management", href: "/api-management" },
          { label: "Usage" },
        ]}
      />
      <ApiManagementSubnav currentPath="/api-management/usage" />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Requests today" value={String(requestsToday)} />
        <Metric label="Remaining (sum of key limits)" value={String(remaining)} />
        <Metric label="Combined daily limit" value={String(limitSum || "—")} />
        <Metric label="429 events today" value={String(rate429)} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Requests</th>
              <th className="px-3 py-2 font-medium">Errors</th>
              <th className="px-3 py-2 font-medium">429s</th>
            </tr>
          </thead>
          <tbody>
            {usage.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-muted-foreground" colSpan={4}>
                  No usage recorded yet.
                </td>
              </tr>
            ) : (
              usage.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">{row.usage_date}</td>
                  <td className="px-3 py-2 tabular-nums">{row.request_count}</td>
                  <td className="px-3 py-2 tabular-nums">{row.error_count}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {row.rate_limit_429_count}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
