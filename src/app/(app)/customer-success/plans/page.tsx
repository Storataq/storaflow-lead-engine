import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CS_UI } from "@/lib/customer-success/constants";
import {
  bootstrapCustomerSuccess,
  listCsPlans,
  listCustomerCompanies,
} from "@/lib/customer-success/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: CS_UI.plansTitle };

function asMilestones(value: unknown): Array<{ weekLabel: string; title: string; done: boolean }> {
  if (!Array.isArray(value)) return [];
  return value.map((m) => {
    const row = m && typeof m === "object" ? (m as Record<string, unknown>) : {};
    return {
      weekLabel: String(row.weekLabel ?? ""),
      title: String(row.title ?? ""),
      done: Boolean(row.done),
    };
  });
}

export default async function CsPlansPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapCustomerSuccess(
    context.organization.id,
    context.membership.user_id,
  );
  const [plans, companies] = await Promise.all([
    listCsPlans(context.organization.id),
    listCustomerCompanies(context.organization.id),
  ]);
  const nameById = new Map(companies.map((c) => [c.id, c.company_name]));

  return (
    <div className="space-y-6">
      <PageHeader
        title={CS_UI.plansTitle}
        description="Success plans: Week 1 onboarding → Maand 3 upsell analyse."
      />
      <Card>
        <CardHeader>
          <CardTitle>Plans</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nog geen plans.</p>
          ) : (
            plans.map((p) => {
              const milestones = asMilestones(p.milestones_json);
              return (
                <div key={p.id} className="rounded-md border px-3 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">
                      {nameById.get(p.company_id) ?? p.name}
                    </p>
                    <div className="flex gap-1">
                      <Badge variant="outline">{p.progress_percent}%</Badge>
                      <Badge variant="secondary">{p.status}</Badge>
                    </div>
                  </div>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    {milestones.map((m) => (
                      <li key={`${p.id}-${m.weekLabel}-${m.title}`}>
                        {m.done ? "✓" : "○"} {m.weekLabel}: {m.title}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
