"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { CategoryIcon } from "@/components/companies/category-icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  COMPANY_CATEGORY_COLOR_OPTIONS,
  COMPANY_CATEGORY_ICON_OPTIONS,
  createCompanyCategoryAction,
  updateCompanyCategoryAction,
  type CompanyCategoryWithCount,
} from "@/lib/companies/categories";

type CategoryFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: CompanyCategoryWithCount | null;
  onSaved?: () => void;
};

type FormState = {
  name: string;
  description: string;
  icon: string;
  color: string;
  sortOrder: string;
  isActive: boolean;
};

function toFormState(category?: CompanyCategoryWithCount | null): FormState {
  return {
    name: category?.name ?? "",
    description: category?.description ?? "",
    icon: category?.icon ?? "Building2",
    color: category?.color ?? "#0F766E",
    sortOrder: String(category?.sort_order ?? 100),
    isActive: category?.is_active ?? true,
  };
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  category = null,
  onSaved,
}: CategoryFormDialogProps) {
  const [pending, startTransition] = useTransition();
  const formKey = `${open ? "open" : "closed"}:${category?.id ?? "new"}`;
  const [form, setForm] = useState<FormState>(() => toFormState(category));
  const [boundKey, setBoundKey] = useState(formKey);

  if (boundKey !== formKey) {
    setBoundKey(formKey);
    setForm(toFormState(category));
  }

  function submit() {
    const formData = new FormData();
    formData.set("name", form.name);
    formData.set("description", form.description);
    formData.set("icon", form.icon);
    formData.set("color", form.color);
    formData.set("sortOrder", form.sortOrder);
    formData.set("isActive", form.isActive ? "true" : "false");
    if (category) formData.set("categoryId", category.id);

    startTransition(async () => {
      const result = category
        ? await updateCompanyCategoryAction(formData)
        : await createCompanyCategoryAction(formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      onOpenChange(false);
      onSaved?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {category ? "Categorie bewerken" : "Nieuwe categorie"}
          </DialogTitle>
          <DialogDescription>
            Organisatie-gebonden bedrijfscategorieën voor CRM, search en campagnes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">Category Name *</Label>
            <Input
              id="category-name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Restaurant"
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category-description">Description</Label>
            <Textarea
              id="category-description"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={3}
              disabled={pending}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category-icon">Icon</Label>
              <div className="flex items-center gap-2">
                <CategoryIcon name={form.icon} color={form.color} />
                <select
                  id="category-icon"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
                  value={form.icon}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, icon: e.target.value }))
                  }
                  disabled={pending}
                >
                  {COMPANY_CATEGORY_ICON_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-color">Color</Label>
              <div className="flex flex-wrap gap-1.5">
                {COMPANY_CATEGORY_COLOR_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className="size-6 rounded-md border border-border"
                    style={{ backgroundColor: option }}
                    aria-label={`Kleur ${option}`}
                    onClick={() => setForm((prev) => ({ ...prev, color: option }))}
                    disabled={pending}
                  />
                ))}
              </div>
              <Input
                id="category-color"
                value={form.color}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, color: e.target.value }))
                }
                placeholder="#0F766E"
                disabled={pending}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category-sort">Sort Order</Label>
              <Input
                id="category-sort"
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, sortOrder: e.target.value }))
                }
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-active">Active</Label>
              <select
                id="category-active"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
                value={form.isActive ? "true" : "false"}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    isActive: e.target.value === "true",
                  }))
                }
                disabled={pending}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Annuleren
          </Button>
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? "Opslaan…" : "Opslaan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
