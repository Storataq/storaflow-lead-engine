import type { Metadata } from "next";

import { SalesDealsManager } from "@/components/sales/sales-deals-manager";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SALES_UI } from "@/lib/sales-agent/constants";
import {
  bootstrapSalesAgent,
  listDealInsights,
  listOpenDealsForSales,
} from "@/lib/sales-agent/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import type { RiskLevel } from "@/lib/sales-agent/constants";

export const metadata: Metadata = { title: SALES_UI.dealsTitle };

type SearchParams = Promise<{
  risk?: string;
  minPriority?: string;
  owner?: string;
  q?: string;
}>;

export default async function SalesDealsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapSalesAgent(
    context.organization.id,
    context.membership.user_id,
  );

  const sp = await searchParams;
  const filters = {
    riskLevel: sp.risk as RiskLevel | undefined,
    minPriority: sp.minPriority ? Number(sp.minPriority) : undefined,
    ownerUserId: sp.owner || undefined,
    q: sp.q || undefined,
  };

  const [deals, insights] = await Promise.all([
    listOpenDealsForSales(context.organization.id, filters),
    listDealInsights(context.organization.id, filters),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={SALES_UI.dealsTitle}
        description="Deal analysis, next best action, bulk follow-up/email/analysis. Filters: owner, risk, priority, search."
      />
      <Card>
        <CardHeader>
          <CardTitle>Open deals</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="mb-4 flex flex-wrap gap-2 text-sm" method="get">
            <input
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Search title"
              className="h-9 rounded-md border border-input bg-transparent px-3"
            />
            <select
              name="risk"
              defaultValue={sp.risk ?? ""}
              className="h-9 rounded-md border border-input bg-transparent px-3"
            >
              <option value="">All risk</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <input
              name="minPriority"
              type="number"
              min={0}
              max={100}
              defaultValue={sp.minPriority ?? ""}
              placeholder="Min priority"
              className="h-9 w-32 rounded-md border border-input bg-transparent px-3"
            />
            <button
              type="submit"
              className="h-9 rounded-md bg-primary px-3 text-primary-foreground"
            >
              Filter
            </button>
          </form>
          <SalesDealsManager deals={deals} insights={insights} />
        </CardContent>
      </Card>
    </div>
  );
}
