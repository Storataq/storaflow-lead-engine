import type { Metadata } from "next";
import Link from "next/link";

import { PlatformAdminSubnav } from "@/components/platform-admin/platform-admin-subnav";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePlatformAdmin } from "@/lib/platform-admin/auth";
import { PLATFORM_UI } from "@/lib/platform-admin/constants";
import { globalPlatformSearch } from "@/lib/platform-admin/queries";

export const metadata: Metadata = { title: PLATFORM_UI.searchTitle };

export default async function PlatformSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePlatformAdmin();
  const { q } = await searchParams;
  const results = await globalPlatformSearch(q ?? "");

  return (
    <div>
      <PageHeader
        title={PLATFORM_UI.searchTitle}
        description="Organizations, users, subscriptions, invoices, audit, announcements, flags."
        breadcrumbs={[
          { label: PLATFORM_UI.hubTitle, href: "/platform-admin" },
          { label: PLATFORM_UI.searchTitle },
        ]}
      />
      <PlatformAdminSubnav />
      <form className="mb-6">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search…"
          className="w-full max-w-lg rounded-md border border-border bg-background px-3 py-2 text-sm"
          aria-label="Global platform search"
        />
      </form>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Organizations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {results.organizations.map((o) => (
              <Link
                key={o.id}
                href={`/platform-admin/organizations/${o.id}`}
                className="block hover:underline"
              >
                {o.name}
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {results.users.map((u) => (
              <p key={u.userId}>
                {u.fullName ?? u.email ?? u.userId.slice(0, 8)}
              </p>
            ))}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Flags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {results.featureFlags.map((f) => (
              <p key={f.id}>
                {f.name} ({f.flag_key})
              </p>
            ))}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Audit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {results.auditLogs.map((a) => (
              <p key={a.id}>{a.action}</p>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
