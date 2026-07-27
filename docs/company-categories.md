# Company Categories (Phase 23A)

Reusable organization-scoped taxonomy for classifying companies in Storaflow.

## Architecture

```
organizations
  └── company_categories (1:N)
        └── companies.company_category_id (N:1, optional)
```

- One company belongs to **at most one** category.
- Categories are **organization scoped** (never shared across orgs).
- Existing company fields (`industry`, `status`, etc.) are preserved.
- Soft delete is not used; categories are activated/deactivated.

### Migration

`supabase/migrations/20260726000023_company_categories.sql`

- Creates `company_categories`
- Adds nullable `companies.company_category_id`
- Enables RLS with org member select + owner/admin write
- Idempotent (`IF NOT EXISTS` / drop-before-create policies & trigger)

Do **not** auto-run migrations from the app.

## Default categories

Configurable list in `src/lib/companies/categories/constants.ts` → `DEFAULT_COMPANY_CATEGORIES`.

Seeded idempotently by `ensureDefaultCompanyCategories`:

- On new organization create (`createOrganizationAction`)
- Lazily when listing categories in the UI

## Domain API

Package: `src/lib/companies/categories/`

| Function | Purpose |
|----------|---------|
| `listCompanyCategories` | List categories |
| `listCompanyCategoriesWithCounts` | List + company usage counts |
| `createCompanyCategoryAction` | Create |
| `updateCompanyCategoryAction` | Edit |
| `setCompanyCategoryActiveAction` | Activate / deactivate |
| `deleteCompanyCategoryAction` | Delete only if unused |
| `assignCompanyCategoryAction` | Assign one company |
| `bulkAssignCompanyCategoryAction` | Bulk assign |
| `countCompaniesByCategory` | Dashboard aggregation |

## Permissions (RBAC)

Current org roles are `owner` | `admin`.

| Action | Who |
|--------|-----|
| View categories | Org members |
| Create / edit / activate / deactivate / delete | Owner / Admin |
| Assign category to companies | Owner / Admin (prepared for future member/read-only split) |

Delete rule: if any company uses the category, deletion is blocked with:

> This category is assigned to companies. Please reassign those companies first.

## UI surfaces

| Route | Feature |
|-------|---------|
| `/settings/company-categories` | Full category management |
| `/settings` | Link card |
| `/companies` | Category column, multi-filter, sort, quick edit, bulk assign, CSV import/export |
| `/companies/[id]` | Category card |
| `/dashboard` | Companies by Category bar widget |

## CSV

**Export** includes `Category Name`.

**Import** expects columns including `Company Name` and `Category Name`:

- Existing category → assign
- Missing category → ask whether to create, then assign matching companies

## Future expansion (not built now)

This table is intentionally generic so later features can filter or route by `company_category_id` without schema changes:

- Funnels / lead routing
- Search & scraping targeting
- Email campaign audiences
- AI classification suggestions
- Automations / playbooks

Prefer referencing `company_categories.id` (or stable `slug` within an org) rather than free-text industry strings.

## Related

- Phase 23B AI classification: [`docs/company-classification.md`](./company-classification.md)
- Phase 23C Category Actions: [`docs/category-actions.md`](./category-actions.md)
