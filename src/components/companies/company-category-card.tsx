"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { CategoryIcon } from "@/components/companies/category-icon";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  assignCompanyCategoryAction,
  type CompanyCategoryRow,
} from "@/lib/companies/categories";

type CompanyCategoryCardProps = {
  companyId: string;
  category: CompanyCategoryRow | null;
  categories: CompanyCategoryRow[];
  canAssign: boolean;
};

export function CompanyCategoryCard({
  companyId,
  category,
  categories,
  canAssign,
}: CompanyCategoryCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(category?.id ?? "");

  const activeCategories = categories.filter((c) => c.is_active);
  const options =
    category && !category.is_active
      ? [category, ...activeCategories.filter((c) => c.id !== category.id)]
      : activeCategories;

  function save() {
    startTransition(async () => {
      const result = await assignCompanyCategoryAction(
        companyId,
        value || null,
      );
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Company Category</CardTitle>
        <CardDescription>
          Used by CRM, search, scraping and future automations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {category ? (
          <div className="flex items-start gap-3 rounded-lg border border-border p-3">
            <CategoryIcon name={category.icon} color={category.color} />
            <div>
              <p className="font-medium">{category.name}</p>
              <p className="text-sm text-muted-foreground">
                {category.description || "No description"}
              </p>
              {!category.is_active ? (
                <p className="mt-1 text-xs text-amber-700">Inactive category</p>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No category assigned.</p>
        )}

        {canAssign ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2 text-sm"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={pending}
              aria-label="Select category"
            >
              <option value="">No category</option>
              {options.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {!item.is_active ? " (inactive)" : ""}
                </option>
              ))}
            </select>
            <Button type="button" onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
