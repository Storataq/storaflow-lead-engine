import type { Metadata } from "next";
import Link from "next/link";

import { CategoryIcon } from "@/components/companies/category-icon";
import { EmptyState } from "@/components/layout/empty-state";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listCompanyCategoriesWithCounts } from "@/lib/companies/categories/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";
import { FolderKanban } from "lucide-react";

export const metadata: Metadata = {
  title: "Categories",
};

export default async function CompaniesCategoriesPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  let errorMessage: string | null = null;
  let categories: Awaited<
    ReturnType<typeof listCompanyCategoriesWithCounts>
  > = [];

  try {
    categories = await listCompanyCategoriesWithCounts(context.organization.id);
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Kon categorieën niet laden. Controleer migratie 000023.",
    );
  }

  const active = categories.filter((c) => c.is_active);

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Operational overviews per company category — CRM, funnels, campaigns and bulk actions."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Bedrijven", href: "/companies" },
          { label: "Categories" },
        ]}
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/settings/company-categories" />}
          >
            Manage taxonomy
          </Button>
        }
      />

      {errorMessage ? (
        <ReloadErrorAlert description={errorMessage} />
      ) : active.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No active categories"
          description="Create categories in settings, then open an overview to run actions."
          actionLabel="Company Categories"
          actionHref="/settings/company-categories"
        />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tracking-tight">
                  {active.length}
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Companies categorized
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tracking-tight">
                  {active.reduce((sum, c) => sum + c.companyCount, 0)}
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardDescription>
                  Open a category for funnel, campaign, task and AI actions.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Companies</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {active.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="flex items-start gap-3">
                        <CategoryIcon
                          name={category.icon}
                          color={category.color}
                        />
                        <div>
                          <p className="font-medium">{category.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {category.description || category.slug}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">Active</Badge>
                    </TableCell>
                    <TableCell>{category.companyCount}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        nativeButton={false}
                        size="sm"
                        render={
                          <Link href={`/companies/categories/${category.id}`} />
                        }
                      >
                        Overview
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
