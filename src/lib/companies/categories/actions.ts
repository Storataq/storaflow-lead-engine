"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { ensureDefaultCompanyCategories } from "@/lib/companies/categories/bootstrap";
import {
  isValidHexColor,
  normalizeCategoryName,
  slugifyCategoryName,
  validateCategoryName,
} from "@/lib/companies/categories/validation";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export type CategoryActionResult = {
  success: boolean;
  message: string;
  categoryId?: string;
};

function canManage(role: string) {
  return role === "owner" || role === "admin";
}

function canAssign(role: string) {
  // Org members may assign. Future read-only roles should return false here.
  return role === "owner" || role === "admin";
}

const categoryInputSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(100000).optional(),
  isActive: z.coerce.boolean().optional(),
});

export async function createCompanyCategoryAction(
  formData: FormData,
): Promise<CategoryActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) {
      return { success: false, message: "Geen actieve organisatie." };
    }
    if (!canManage(context.membership.role)) {
      return {
        success: false,
        message: "Alleen owners of admins mogen categorieën beheren.",
      };
    }

    const parsed = categoryInputSchema.safeParse({
      name: formData.get("name"),
      description: formData.get("description"),
      icon: formData.get("icon"),
      color: formData.get("color"),
      sortOrder: formData.get("sortOrder") || 100,
      isActive: formData.get("isActive") !== "false",
    });

    if (!parsed.success) {
      return { success: false, message: "Ongeldige invoer." };
    }

    const name = normalizeCategoryName(parsed.data.name);
    const nameError = validateCategoryName(name);
    if (nameError) return { success: false, message: nameError };

    const color = parsed.data.color?.trim() || null;
    if (!isValidHexColor(color)) {
      return { success: false, message: "Kleur moet een hex-code zijn (#RRGGBB)." };
    }

    const slug = slugifyCategoryName(name) || `category-${crypto.randomUUID().slice(0, 8)}`;
    const supabase = await createClient();

    await ensureDefaultCompanyCategories(
      supabase,
      context.organization.id,
      context.membership.user_id,
    );

    const { data, error } = await supabase
      .from("company_categories")
      .insert({
        organization_id: context.organization.id,
        name,
        slug,
        description: parsed.data.description?.trim() || null,
        icon: parsed.data.icon?.trim() || null,
        color,
        sort_order: parsed.data.sortOrder ?? 100,
        is_active: parsed.data.isActive ?? true,
        is_system_default: false,
        created_by: context.membership.user_id,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return {
          success: false,
          message: "Er bestaat al een categorie met deze naam.",
        };
      }
      return { success: false, message: toUserFacingError(error, error.message) };
    }

    revalidatePath("/settings/company-categories");
    revalidatePath("/companies");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: "Categorie aangemaakt.",
      categoryId: data.id,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon categorie niet aanmaken."),
    };
  }
}

export async function updateCompanyCategoryAction(
  formData: FormData,
): Promise<CategoryActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) {
      return { success: false, message: "Geen actieve organisatie." };
    }
    if (!canManage(context.membership.role)) {
      return {
        success: false,
        message: "Alleen owners of admins mogen categorieën beheren.",
      };
    }

    const categoryId = String(formData.get("categoryId") || "");
    if (!categoryId) {
      return { success: false, message: "Categorie ontbreekt." };
    }

    const parsed = categoryInputSchema.safeParse({
      name: formData.get("name"),
      description: formData.get("description"),
      icon: formData.get("icon"),
      color: formData.get("color"),
      sortOrder: formData.get("sortOrder") || 100,
      isActive: formData.get("isActive") !== "false",
    });

    if (!parsed.success) {
      return { success: false, message: "Ongeldige invoer." };
    }

    const name = normalizeCategoryName(parsed.data.name);
    const nameError = validateCategoryName(name);
    if (nameError) return { success: false, message: nameError };

    const color = parsed.data.color?.trim() || null;
    if (!isValidHexColor(color)) {
      return { success: false, message: "Kleur moet een hex-code zijn (#RRGGBB)." };
    }

    const slug = slugifyCategoryName(name) || `category-${categoryId.slice(0, 8)}`;
    const supabase = await createClient();

    const { error } = await supabase
      .from("company_categories")
      .update({
        name,
        slug,
        description: parsed.data.description?.trim() || null,
        icon: parsed.data.icon?.trim() || null,
        color,
        sort_order: parsed.data.sortOrder ?? 100,
        is_active: parsed.data.isActive ?? true,
      })
      .eq("organization_id", context.organization.id)
      .eq("id", categoryId);

    if (error) {
      if (error.code === "23505") {
        return {
          success: false,
          message: "Er bestaat al een categorie met deze naam.",
        };
      }
      return { success: false, message: toUserFacingError(error, error.message) };
    }

    revalidatePath("/settings/company-categories");
    revalidatePath("/companies");
    revalidatePath("/dashboard");
    return { success: true, message: "Categorie bijgewerkt.", categoryId };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon categorie niet bijwerken."),
    };
  }
}

export async function setCompanyCategoryActiveAction(
  categoryId: string,
  isActive: boolean,
): Promise<CategoryActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) {
      return { success: false, message: "Geen actieve organisatie." };
    }
    if (!canManage(context.membership.role)) {
      return {
        success: false,
        message: "Alleen owners of admins mogen categorieën beheren.",
      };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("company_categories")
      .update({ is_active: isActive })
      .eq("organization_id", context.organization.id)
      .eq("id", categoryId);

    if (error) {
      return { success: false, message: toUserFacingError(error, error.message) };
    }

    revalidatePath("/settings/company-categories");
    revalidatePath("/companies");
    return {
      success: true,
      message: isActive ? "Categorie geactiveerd." : "Categorie gedeactiveerd.",
      categoryId,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon status niet wijzigen."),
    };
  }
}

export async function deleteCompanyCategoryAction(
  categoryId: string,
): Promise<CategoryActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) {
      return { success: false, message: "Geen actieve organisatie." };
    }
    if (!canManage(context.membership.role)) {
      return {
        success: false,
        message: "Alleen owners of admins mogen categorieën beheren.",
      };
    }

    const supabase = await createClient();

    const { count, error: countError } = await supabase
      .from("companies")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", context.organization.id)
      .eq("company_category_id", categoryId);

    if (countError) {
      return {
        success: false,
        message: toUserFacingError(countError, countError.message),
      };
    }

    if ((count ?? 0) > 0) {
      return {
        success: false,
        message:
          "This category is assigned to companies. Please reassign those companies first.",
      };
    }

    const { error } = await supabase
      .from("company_categories")
      .delete()
      .eq("organization_id", context.organization.id)
      .eq("id", categoryId);

    if (error) {
      return { success: false, message: toUserFacingError(error, error.message) };
    }

    revalidatePath("/settings/company-categories");
    revalidatePath("/companies");
    revalidatePath("/dashboard");
    return { success: true, message: "Categorie verwijderd.", categoryId };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon categorie niet verwijderen."),
    };
  }
}

export async function assignCompanyCategoryAction(
  companyId: string,
  categoryId: string | null,
): Promise<CategoryActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) {
      return { success: false, message: "Geen actieve organisatie." };
    }
    if (!canAssign(context.membership.role)) {
      return {
        success: false,
        message: "Je hebt geen rechten om categorieën toe te wijzen.",
      };
    }

    const supabase = await createClient();

    if (categoryId) {
      const { data: category, error: catError } = await supabase
        .from("company_categories")
        .select("id, is_active")
        .eq("organization_id", context.organization.id)
        .eq("id", categoryId)
        .maybeSingle();

      if (catError || !category) {
        return { success: false, message: "Categorie niet gevonden." };
      }
    }

    const { data: before } = await supabase
      .from("companies")
      .select("company_category_id")
      .eq("organization_id", context.organization.id)
      .eq("id", companyId)
      .maybeSingle();

    const { error } = await supabase
      .from("companies")
      .update({
        company_category_id: categoryId,
        category_manual_override: true,
        category_needs_review: false,
        category_classified_by: "manual",
        category_classified_at: new Date().toISOString(),
      })
      .eq("organization_id", context.organization.id)
      .eq("id", companyId);

    if (error) {
      return { success: false, message: toUserFacingError(error, error.message) };
    }

    const { markManualCategoryOverride } = await import(
      "@/lib/companies/classification/actions"
    );
    await markManualCategoryOverride({
      organizationId: context.organization.id,
      companyId,
      oldCategoryId: before?.company_category_id ?? null,
      newCategoryId: categoryId,
      actorUserId: context.membership.user_id,
    }).catch(() => undefined);

    revalidatePath("/companies");
    revalidatePath(`/companies/${companyId}`);
    revalidatePath("/dashboard");
    revalidatePath("/settings/company-categories");
    return { success: true, message: "Categorie toegewezen." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon categorie niet toewijzen."),
    };
  }
}

export async function bulkAssignCompanyCategoryAction(
  companyIds: string[],
  categoryId: string | null,
): Promise<CategoryActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) {
      return { success: false, message: "Geen actieve organisatie." };
    }
    if (!canAssign(context.membership.role)) {
      return {
        success: false,
        message: "Je hebt geen rechten om categorieën toe te wijzen.",
      };
    }

    const ids = companyIds.filter(Boolean);
    if (ids.length === 0) {
      return { success: false, message: "Selecteer minstens één bedrijf." };
    }

    const supabase = await createClient();

    if (categoryId) {
      const { data: category } = await supabase
        .from("company_categories")
        .select("id")
        .eq("organization_id", context.organization.id)
        .eq("id", categoryId)
        .maybeSingle();
      if (!category) {
        return { success: false, message: "Categorie niet gevonden." };
      }
    }

    const { error } = await supabase
      .from("companies")
      .update({
        company_category_id: categoryId,
        category_manual_override: true,
        category_needs_review: false,
        category_classified_by: "manual",
        category_classified_at: new Date().toISOString(),
      })
      .eq("organization_id", context.organization.id)
      .in("id", ids);

    if (error) {
      return { success: false, message: toUserFacingError(error, error.message) };
    }

    revalidatePath("/companies");
    revalidatePath("/dashboard");
    revalidatePath("/settings/company-categories");
    return {
      success: true,
      message: `${ids.length} bedrijven bijgewerkt.`,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Bulk toewijzing mislukt."),
    };
  }
}

export async function createCategoryIfMissingAction(
  name: string,
): Promise<CategoryActionResult> {
  const formData = new FormData();
  formData.set("name", name);
  formData.set("isActive", "true");
  formData.set("sortOrder", "500");
  formData.set("icon", "Building2");
  formData.set("color", "#334155");
  return createCompanyCategoryAction(formData);
}

export async function reorderCompanyCategoriesAction(
  orderedIds: string[],
): Promise<CategoryActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) {
      return { success: false, message: "Geen actieve organisatie." };
    }
    if (!canManage(context.membership.role)) {
      return {
        success: false,
        message: "Alleen owners of admins mogen categorieën beheren.",
      };
    }

    const supabase = await createClient();

    await Promise.all(
      orderedIds.map((id, index) =>
        supabase
          .from("company_categories")
          .update({ sort_order: (index + 1) * 10 })
          .eq("organization_id", context.organization.id)
          .eq("id", id),
      ),
    );

    revalidatePath("/settings/company-categories");
    return { success: true, message: "Volgorde bijgewerkt." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon volgorde niet opslaan."),
    };
  }
}
