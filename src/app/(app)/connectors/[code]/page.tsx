import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ConnectorDetailClient } from "@/components/connectors/connector-detail-client";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getRegisteredConnector } from "@/lib/scraping/registry";

type ConnectorDetailPageProps = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({
  params,
}: ConnectorDetailPageProps): Promise<Metadata> {
  const { code } = await params;
  return { title: `Connector ${code}` };
}

export default async function ConnectorDetailPage({
  params,
}: ConnectorDetailPageProps) {
  const { code } = await params;
  const connector = getRegisteredConnector(code);
  if (!connector) {
    notFound();
  }

  return (
    <div>
      <PageHeader
        title={connector.manifest.name}
        description={connector.manifest.description}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Connectors", href: "/connectors" },
          { label: connector.manifest.name },
        ]}
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/connectors" />}
          >
            Terug
          </Button>
        }
      />
      <ConnectorDetailClient manifest={connector.manifest} />
    </div>
  );
}
