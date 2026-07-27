import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CrmSubnav } from "@/components/crm/crm-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { ReloadErrorAlert } from "@/components/layout/reload-error-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDealValue } from "@/lib/crm/constants";
import { getDeal } from "@/lib/crm/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

type DealDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: DealDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Deal ${id.slice(0, 8)}` };
}

export default async function DealDetailPage({ params }: DealDetailPageProps) {
  const { id } = await params;
  const context = await getActiveOrganization();
  if (!context) notFound();

  let deal: Awaited<ReturnType<typeof getDeal>> = null;
  let errorMessage: string | null = null;

  try {
    deal = await getDeal(context.organization.id, id);
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Kon deal niet laden. Controleer of de CRM-migratie is uitgevoerd.",
    );
  }

  if (errorMessage) {
    return (
      <div>
        <PageHeader
          title="Deal"
          description="Dealdetail."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "CRM", href: "/crm" },
            { label: "Deals", href: "/crm/deals" },
            { label: id.slice(0, 8) },
          ]}
        />
        <CrmSubnav currentPath="/crm/deals" />
        <ReloadErrorAlert description={errorMessage} />
      </div>
    );
  }

  if (!deal) notFound();

  return (
    <div>
      <PageHeader
        title={deal.title}
        description="Dealdetail met status, waarde en gekoppelde lead."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "CRM", href: "/crm" },
          { label: "Deals", href: "/crm/deals" },
          { label: deal.title },
        ]}
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/crm/deals" />}
          >
            Terug
          </Button>
        }
      />
      <CrmSubnav currentPath="/crm/deals" />
      <Card className="max-w-2xl shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Overzicht</CardTitle>
          <CardDescription>
            Status: <Badge variant="secondary">{deal.status}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Waarde</span>
            <span>{formatDealValue(Number(deal.value), deal.currency)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Pipeline</span>
            <span>{deal.pipeline?.name ?? "—"}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Stage</span>
            <span>{deal.stage?.name ?? "—"}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Verwachte sluitdatum</span>
            <span>{deal.expected_close_date ?? "—"}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Lead / bedrijf</span>
            {deal.lead_id ? (
              <Link
                href={`/crm/leads/${deal.lead_id}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {deal.lead?.company_name ?? "Lead"}
              </Link>
            ) : (
              <span>—</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
