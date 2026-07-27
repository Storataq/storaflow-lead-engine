export function slugifyCategoryName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function normalizeCategoryName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function validateCategoryName(name: string): string | null {
  const normalized = normalizeCategoryName(name);
  if (!normalized) return "Category name is required.";
  if (normalized.length < 2) return "Category name is too short.";
  if (normalized.length > 100) return "Category name is too long.";
  return null;
}

export function isValidHexColor(value: string | null | undefined): boolean {
  if (!value) return true;
  return /^#[0-9A-Fa-f]{6}$/.test(value.trim());
}
