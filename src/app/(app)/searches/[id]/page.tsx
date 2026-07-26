import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SearchDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: SearchDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Zoekopdracht ${id.slice(0, 8)}` };
}

export default async function SearchDetailPage({
  params,
}: SearchDetailPageProps) {
  const { id } = await params;

  return (
    <div>
      <PageHeader
        title="Zoekopdracht"
        description={`Detailweergave voor zoekopdracht ${id}. Data volgt in een latere fase.`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Zoekopdrachten", href: "/searches" },
          { label: id.slice(0, 8) },
        ]}
      />
      <Card className="border-dashed shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Nog geen gegevens</CardTitle>
          <CardDescription>
            Zodra zoekopdrachten worden opgeslagen, zie je hier status, filters
            en gekoppelde scrapingtaken.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          ID: <code>{id}</code>
        </CardContent>
      </Card>
    </div>
  );
}
