"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Stats = {
  activeKeys: number;
  activeWebhooks: number;
  requestsToday: number;
  errorsToday: number;
  rate429Today: number;
  deliveriesOk: number;
  deliveriesFail: number;
  topEndpoints: Array<{ path: string; count: number }>;
};

export function ApiPlatformDashboard({
  stats,
  canManage,
}: {
  stats: Stats;
  canManage: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active keys" value={stats.activeKeys} />
        <Stat label="Active webhooks" value={stats.activeWebhooks} />
        <Stat label="API requests today" value={stats.requestsToday} />
        <Stat label="429 events today" value={stats.rate429Today} />
        <Stat label="Errors today" value={stats.errorsToday} />
        <Stat label="Webhook successes" value={stats.deliveriesOk} />
        <Stat label="Webhook failures" value={stats.deliveriesFail} />
      </div>

      <section className="space-y-3" aria-labelledby="top-endpoints">
        <h2 id="top-endpoints" className="text-lg font-semibold">
          Top endpoints
        </h2>
        {stats.topEndpoints.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No recent API traffic yet. Create a key and call `/api/v1/health`.
          </p>
        ) : (
          <ul className="space-y-2">
            {stats.topEndpoints.map((item) => (
              <li
                key={item.path}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <code className="text-xs">{item.path}</code>
                <Badge variant="secondary">{item.count}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <Button
          nativeButton={false}
          size="sm"
          render={<Link href="/api-management/keys" />}
          disabled={!canManage}
        >
          Manage API keys
        </Button>
        <Button
          nativeButton={false}
          size="sm"
          variant="outline"
          render={<Link href="/api-management/webhooks" />}
        >
          Manage webhooks
        </Button>
        <Button
          nativeButton={false}
          size="sm"
          variant="outline"
          render={<Link href="/api-management/docs" />}
        >
          API documentation
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
