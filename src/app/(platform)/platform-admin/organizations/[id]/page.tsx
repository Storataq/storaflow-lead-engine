import type { Metadata } from "next";

import { TransferOwnershipButton } from "@/components/platform-admin/organizations-manager";
import { PlatformAdminSubnav } from "@/components/platform-admin/platform-admin-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePlatformAdmin } from "@/lib/platform-admin/auth";
import {
  ORG_LIFECYCLE_LABELS,
  PLATFORM_UI,
  type OrgLifecycleStatus,
} from "@/lib/platform-admin/constants";
import { hasPlatformPermission } from "@/lib/platform-admin/permissions";
import { getPlatformOrganizationDetail } from "@/lib/platform-admin/queries";
import { formatDateTime } from "@/lib/ui/format";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Organization detail" };

export default async function PlatformOrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePlatformAdmin();
  const { id } = await params;
  const detail = await getPlatformOrganizationDetail(id);
  if (!detail) notFound();

  const admin = await requirePlatformAdmin();
  const canManage = hasPlatformPermission(admin.role, "organizations:manage");
  const org = detail.organization;

  return (
    <div>
      <PageHeader
        title={org.name}
        description={org.slug}
        breadcrumbs={[
          { label: PLATFORM_UI.hubTitle, href: "/platform-admin" },
          {
            label: PLATFORM_UI.organizationsTitle,
            href: "/platform-admin/organizations",
          },
          { label: org.name },
        ]}
      />
      <PlatformAdminSubnav />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge>
              {ORG_LIFECYCLE_LABELS[
                (org.lifecycle_status ?? "active") as OrgLifecycleStatus
              ] ?? org.lifecycle_status}
            </Badge>
            <p className="mt-2 text-xs text-muted-foreground">
              Created {formatDateTime(org.created_at)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Subscription</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>{detail.plan?.name ?? "—"}</p>
            <p className="text-muted-foreground">
              {detail.subscription?.status ?? "No subscription"} · seats{" "}
              {detail.subscription?.seats_purchased ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Users / locale</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>{detail.userCount} members</p>
            <p className="text-muted-foreground">
              {org.country ?? "—"} · {org.default_email_language}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {detail.members.map((m) => (
            <div
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2"
            >
              <span>
                {m.user_id.slice(0, 8)}… · {m.role}
              </span>
              {canManage && m.role !== "owner" ? (
                <TransferOwnershipButton
                  organizationId={org.id}
                  newOwnerUserId={m.user_id}
                />
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mt-4 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Invoices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {detail.invoices.length === 0 ? (
            <p className="text-muted-foreground">No invoices.</p>
          ) : (
            detail.invoices.map((inv) => (
              <p key={inv.id}>
                {inv.number ?? inv.id.slice(0, 8)} · {inv.status} ·{" "}
                {(inv.amount_due_cents / 100).toFixed(2)} {inv.currency}
              </p>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
