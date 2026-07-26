import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type CompanyDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: CompanyDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Bedrijf ${id.slice(0, 8)}` };
}

export default async function CompanyDetailPage({
  params,
}: CompanyDetailPageProps) {
  const { id } = await params;

  return (
    <div>
      <PageHeader
        title="Bedrijf"
        description="Detailpagina met contacten, bronnen, notities en status."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Bedrijven", href: "/companies" },
          { label: id.slice(0, 8) },
        ]}
      />
      <Card className="border-dashed shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Nog geen bedrijfsgegevens</CardTitle>
          <CardDescription>
            Zodra bedrijven worden opgeslagen, zie je hier website, locatie,
            contacten en activiteit.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          ID: <code>{id}</code>
        </CardContent>
      </Card>
    </div>
  );
}
