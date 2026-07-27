"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Puzzle } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CONNECTION_STATUS_LABELS,
  HEALTH_STATUS_LABELS,
  INTEGRATION_CATEGORIES,
  INTEGRATION_CATEGORY_LABELS,
  MARKETPLACE_SORT_LABELS,
  MARKETPLACE_SORTS,
  type MarketplaceSort,
} from "@/lib/integrations/constants";
import {
  connectIntegrationAction,
  disconnectIntegrationAction,
} from "@/lib/integrations/actions";
import type {
  IntegrationConnectionRow,
  IntegrationManifest,
} from "@/lib/integrations/types";

type IntegrationsMarketplaceProps = {
  catalog: IntegrationManifest[];
  featured: IntegrationManifest[];
  connections: IntegrationConnectionRow[];
  installedCodes: string[];
  canManage: boolean;
  stats: {
    available: number;
    connected: number;
    needsReauth: number;
    syncFailedToday: number;
  };
};

export function IntegrationsMarketplace({
  catalog,
  featured,
  connections,
  installedCodes,
  canManage,
  stats,
}: IntegrationsMarketplaceProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [installedOnly, setInstalledOnly] = useState(false);
  const [sort, setSort] = useState<MarketplaceSort>("popular");
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const connectionByCode = useMemo(() => {
    const map = new Map<string, IntegrationConnectionRow>();
    for (const c of connections) {
      if (!map.has(c.integration_code) || c.status === "connected") {
        map.set(c.integration_code, c);
      }
    }
    return map;
  }, [connections]);

  const filtered = useMemo(() => {
    let rows = [...catalog];
    if (category !== "all") {
      rows = rows.filter((r) => r.category === category);
    }
    if (status !== "all") {
      rows = rows.filter((r) => r.status === status);
    }
    if (installedOnly) {
      const set = new Set(installedCodes);
      rows = rows.filter((r) => set.has(r.code));
    }
    if (query.trim()) {
      const needle = query.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(needle) ||
          r.code.toLowerCase().includes(needle) ||
          r.description.toLowerCase().includes(needle),
      );
    }
    if (sort === "alphabetical") {
      rows.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "newest") {
      rows.sort((a, b) => b.releasedAt.localeCompare(a.releasedAt));
    } else {
      rows.sort((a, b) => a.popularRank - b.popularRank);
    }
    return rows;
  }, [catalog, category, status, installedOnly, installedCodes, query, sort]);

  function runConnect(code: string) {
    if (!canManage) {
      toast.error("Only owners/admins can install integrations.");
      return;
    }
    setPendingCode(code);
    startTransition(async () => {
      const result = await connectIntegrationAction({ integrationCode: code });
      setPendingCode(null);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      if (result.authorizeUrl) {
        window.location.href = result.authorizeUrl;
        return;
      }
      toast.success(result.message);
    });
  }

  function runDisconnect(connectionId: string, code: string) {
    if (!canManage) {
      toast.error("Only owners/admins can remove integrations.");
      return;
    }
    setPendingCode(code);
    startTransition(async () => {
      const result = await disconnectIntegrationAction({ connectionId });
      setPendingCode(null);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
    });
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Available" value={String(stats.available)} />
        <StatCard label="Connected" value={String(stats.connected)} />
        <StatCard label="Needs re-auth" value={String(stats.needsReauth)} />
        <StatCard
          label="Sync failures today"
          value={String(stats.syncFailedToday)}
        />
      </div>

      <section className="space-y-3" aria-labelledby="featured-heading">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="featured-heading" className="text-lg font-semibold">
              Featured integrations
            </h2>
            <p className="text-sm text-muted-foreground">
              Popular connectors ready for OAuth and sync scaffolding.
            </p>
          </div>
          <Button
            nativeButton={false}
            variant="outline"
            size="sm"
            render={<Link href="/integrations/sync-history" />}
          >
            Sync history
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {featured.slice(0, 9).map((item) => {
            const conn = connectionByCode.get(item.code);
            const connected = conn?.status === "connected";
            return (
              <article
                key={item.code}
                className="flex flex-col gap-3 rounded-xl border border-border p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/integrations/${item.code}`}
                      className="font-medium hover:underline"
                    >
                      {item.name}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {INTEGRATION_CATEGORY_LABELS[item.category]} · v
                      {item.version}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {connected
                      ? CONNECTION_STATUS_LABELS.connected
                      : item.status}
                  </Badge>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {item.description}
                </p>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Button
                    nativeButton={false}
                    size="sm"
                    variant="outline"
                    render={<Link href={`/integrations/${item.code}`} />}
                  >
                    Details
                  </Button>
                  {connected && conn ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending && pendingCode === item.code}
                      onClick={() => runDisconnect(conn.id, item.code)}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={
                        !canManage ||
                        item.status === "coming_soon" ||
                        (pending && pendingCode === item.code)
                      }
                      onClick={() => runConnect(item.code)}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="browse-heading">
        <h2 id="browse-heading" className="text-lg font-semibold">
          Browse marketplace
        </h2>
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap">
          <label htmlFor="integrations-search" className="sr-only">
            Search integrations
          </label>
          <Input
            id="integrations-search"
            className="lg:max-w-xs"
            placeholder="Search integrations…"
            value={query}
            aria-label="Search integrations"
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={category}
            aria-label="Filter by category"
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">All categories</option>
            {INTEGRATION_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {INTEGRATION_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <select
            className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={status}
            aria-label="Filter by status"
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="available">Available</option>
            <option value="beta">Beta</option>
            <option value="coming_soon">Coming soon</option>
          </select>
          <select
            className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={sort}
            aria-label="Sort marketplace"
            onChange={(e) => setSort(e.target.value as MarketplaceSort)}
          >
            {MARKETPLACE_SORTS.map((s) => (
              <option key={s} value={s}>
                {MARKETPLACE_SORT_LABELS[s]}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={installedOnly}
              onChange={(e) => setInstalledOnly(e.target.checked)}
              className="size-4 rounded border-input"
            />
            Installed only
          </label>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Puzzle}
            title="No integrations found"
            description="Adjust search or filters, or connect a featured integration above."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => {
              const conn = connectionByCode.get(item.code);
              const health = conn
                ? HEALTH_STATUS_LABELS[
                    conn.health_status as keyof typeof HEALTH_STATUS_LABELS
                  ] ?? conn.health_status
                : null;
              return (
                <article
                  key={item.code}
                  className="flex flex-col gap-2 rounded-xl border border-border p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/integrations/${item.code}`}
                      className="font-medium hover:underline"
                    >
                      {item.name}
                    </Link>
                    <Badge variant="outline">
                      {INTEGRATION_CATEGORY_LABELS[item.category]}
                    </Badge>
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {conn
                      ? `${CONNECTION_STATUS_LABELS[conn.status as keyof typeof CONNECTION_STATUS_LABELS] ?? conn.status}${health ? ` · ${health}` : ""}`
                      : item.status}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-2 pt-1">
                    <Button
                      nativeButton={false}
                      size="sm"
                      variant="outline"
                      render={<Link href={`/integrations/${item.code}`} />}
                    >
                      Open
                    </Button>
                    {conn?.status === "connected" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending && pendingCode === item.code}
                        onClick={() => runDisconnect(conn.id, item.code)}
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={
                          !canManage ||
                          item.status === "coming_soon" ||
                          (pending && pendingCode === item.code)
                        }
                        onClick={() => runConnect(item.code)}
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
