import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CrmSubnav } from "@/components/crm/crm-subnav";
import { CommentsPanel } from "@/components/collaboration/comments-panel";
import { DealDetailWorkspace } from "@/components/crm/deal-detail-workspace";
import { PageHeader } from "@/components/layout/page-header";
import { ReloadErrorAlert } from "@/components/layout/reload-error-alert";
import { Button } from "@/components/ui/button";
import { listCommentsForEntity } from "@/lib/collaboration/queries";
import { hasCollabPermission } from "@/lib/collaboration/permissions";
import { buildDealNextBestActionsForDeal } from "@/lib/crm/pipeline/nba";
import { effectiveDealProbability } from "@/lib/crm/pipeline/constants";
import {
  getDeal,
  listAllStages,
  listCloseReasons,
  listDealStageHistory,
  listOrganizationMembers,
  listTasks,
} from "@/lib/crm/queries";
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
  let stages: Awaited<ReturnType<typeof listAllStages>> = [];
  let history: Awaited<ReturnType<typeof listDealStageHistory>> = [];
  let wonReasons: Awaited<ReturnType<typeof listCloseReasons>> = [];
  let lostReasons: Awaited<ReturnType<typeof listCloseReasons>> = [];
  let members: Awaited<ReturnType<typeof listOrganizationMembers>> = [];
  let openTaskCount = 0;
  let comments: Awaited<ReturnType<typeof listCommentsForEntity>> = [];

  try {
    deal = await getDeal(context.organization.id, id);
    if (deal) {
      [stages, history, wonReasons, lostReasons, members, comments] =
        await Promise.all([
          listAllStages(context.organization.id),
          listDealStageHistory(context.organization.id, deal.id),
          listCloseReasons(context.organization.id, "won"),
          listCloseReasons(context.organization.id, "lost"),
          listOrganizationMembers(context.organization.id),
          listCommentsForEntity(context.organization.id, "deal", deal.id),
        ]);
      const tasks = await listTasks(context.organization.id, {
        dealId: deal.id,
      }).catch(() => []);
      openTaskCount = tasks.filter(
        (task) => task.status !== "done" && task.status !== "cancelled",
      ).length;
    }
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

  const probability = effectiveDealProbability(
    deal.probability,
    deal.stage?.probability,
  );

  const nba = buildDealNextBestActionsForDeal({
    status: deal.status,
    probability,
    value: Number(deal.value),
    createdAt: deal.created_at,
    lastStageChangedAt: deal.last_stage_changed_at,
    expectedCloseDate: deal.expected_close_date,
    hasPrimaryContact: Boolean(
      deal.primary_contact_id || deal.lead?.contact_name,
    ),
    openTaskCount,
  });

  return (
    <div>
      <PageHeader
        title={deal.title}
        description="Deal lifecycle, timeline, forecast signals and next best actions."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "CRM", href: "/crm" },
          { label: "Deals", href: "/crm/deals" },
          { label: deal.title },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/crm/pipeline?view=deals" />}
            >
              Deal board
            </Button>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/crm/deals" />}
            >
              Terug
            </Button>
          </div>
        }
      />
      <CrmSubnav currentPath="/crm/deals" />
      <DealDetailWorkspace
        deal={deal}
        stages={stages}
        history={history}
        nba={nba}
        wonReasons={wonReasons}
        lostReasons={lostReasons}
        members={members}
      />
      <div className="mt-8 max-w-3xl">
        <CommentsPanel
          entityType="deal"
          entityId={deal.id}
          comments={comments}
          canComment={hasCollabPermission(context.membership.role, "comment")}
          currentUserId={context.membership.user_id}
        />
      </div>
    </div>
  );
}
