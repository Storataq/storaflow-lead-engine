import type { Metadata } from "next";
import {
  Activity,
  Building2,
  CheckCircle2,
  ListTodo,
  Mail,
  Plus,
  Search,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Dashboard",
};

const stats = [
  { label: "Bedrijven", value: "—", icon: Building2 },
  { label: "Contactgegevens", value: "—", icon: Mail },
  { label: "Nieuw vandaag", value: "—", icon: Plus },
  { label: "Actieve taken", value: "—", icon: ListTodo },
  { label: "Voltooide taken", value: "—", icon: CheckCircle2 },
  { label: "Mislukte taken", value: "—", icon: XCircle },
] as const;

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overzicht van je lead database, scrapingtaken en recente activiteit."
        breadcrumbs={[{ label: "Dashboard" }]}
        actions={
          <Button nativeButton={false} render={<Link href="/zoekopdrachten" />}>
            <Search className="size-4" />
            Nieuwe zoekopdracht
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tracking-tight">
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Laatste zoekopdrachten</CardTitle>
            <CardDescription>
              Zoekopdrachten verschijnen hier zodra je de eerste aanmaakt.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Nog geen zoekopdrachten.
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4" />
              Recente activiteiten
            </CardTitle>
            <CardDescription>
              Acties binnen je organisatie worden hier gelogd.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Nog geen activiteiten.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
