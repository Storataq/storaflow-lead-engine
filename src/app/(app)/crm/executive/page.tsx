import type { Metadata } from "next";
import { Suspense } from "react";

import { CrmSubnav } from "@/components/crm/crm-subnav";
import { ExecutiveAnalyticsDashboard } from "@/components/crm/executive-analytics-dashboard";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { ReloadErrorAlert } from "@/components/layout/reload-error-alert";
import { buildExecutiveAnalyticsDashboard } from "@/lib/crm/executive-analytics/build";
import { DEFAULT_EXEC_FILTERS } from "@/lib/crm/executive-analytics/constants";
import type { ExecDateRangeKey } from "@/lib/crm/executive-analytics/date-range";
import { EXEC_DATE_RANGES } from "@/lib/crm/executive-analytics/date-range";
import type { ExecutiveFilters } from "@/lib/crm/executive-analytics/types";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = {
  title: "Executive Analytics",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function parseFilters(
  params: Record<string, string | string[] | undefined>,
): Partial<ExecutiveFilters> {
  const range = first(params.range);
  const dateRange =
    range && (EXEC_DATE_RANGES as readonly string[]).includes(range)
      ? (range as ExecDateRangeKey)
      : DEFAULT_EXEC_FILTERS.dateRange;

  const scoreMin = first(params.scoreMin);
  const scoreMax = first(params.scoreMax);

  return {
    dateRange,
    customFrom: first(params.from),
    customTo: first(params.to),
    ownerUserId: first(params.owner),
    pipelineId: first(params.pipeline),
    campaignId: first(params.campaign),
    companyCategory: first(params.category),
    industry: first(params.industry),
    country: first(params.country),
    region: first(params.region),
    leadClassification: first(params.class),
    leadScoreMin: scoreMin != null ? Number(scoreMin) : null,
    leadScoreMax: scoreMax != null ? Number(scoreMax) : null,
    dealStatus: first(params.dealStatus),
    currency: first(params.currency),
  };
}

export default async function ExecutiveCrmDashboardPage({
  searchParams,
}: PageProps) {
  const context = await getActiveOrganization();
  if (!context) return null;

  const params = await searchParams;
  const filters = parseFilters(params);

  let errorMessage: string | null = null;
  let bundle: Awaited<
    ReturnType<typeof buildExecutiveAnalyticsDashboard>
  > | null = null;

  try {
    bundle = await buildExecutiveAnalyticsDashboard({
      organizationId: context.organization.id,
      organizationName: context.organization.name,
      role: context.membership.role,
      filters,
    });
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Could not load Executive Analytics.",
    );
  }

  return (
    <div>
      <PageHeader
        title="Executive Analytics"
        description="Business overview across CRM, pipeline, lead quality, campaigns, and automations — live organization data."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "CRM", href: "/crm" },
          { label: "Executive Analytics" },
        ]}
      />
      <CrmSubnav currentPath="/crm/executive" />
      {errorMessage || !bundle ? (
        <ReloadErrorAlert
          title="Executive Analytics unavailable"
          description={errorMessage ?? "No data"}
        />
      ) : (
        <Suspense fallback={<PageSkeleton />}>
          <ExecutiveAnalyticsDashboard bundle={bundle} />
        </Suspense>
      )}
    </div>
  );
}
