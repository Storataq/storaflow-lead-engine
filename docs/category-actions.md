# Category Actions & Smart Routing (Phase 23C)

Connect Company Categories to existing CRM, Funnels, Email and task modules — without redesigning those systems.

Categories become **operational groups**: select a category, review the cohort, run confirmed bulk actions.

## Architecture

```
Company Category
  └── companies (company_category_id)
        ├── CRM leads / tasks / tags / owners
        ├── Funnel activation (trigger_source = category_actions)
        ├── Email campaign audience (companyCategoryIds)
        ├── Email sequence drafts
        ├── AI email drafts (category context)
        └── company_category_action_runs (audit + extension point)
```

### Migration

`supabase/migrations/20260726000025_company_category_actions.sql`

- `company_category_action_runs` — audit log for every category action
- `funnel_activation_runs.source_company_category_id` — provenance

Do **not** auto-run migrations from the app. Apply after 000023 / 000024.

### Domain package

`src/lib/companies/category-actions/`

| Module | Role |
|--------|------|
| `constants.ts` | Action type registry + future capability keys |
| `types.ts` | RBAC helpers prepared for marketing/manager roles |
| `queries.ts` | Overview stats, insights, company list, activity |
| `actions.ts` | Thin wrappers around existing CRM / funnel / email APIs |
| `audit.ts` | Persist action runs |

**Rule:** never duplicate campaign/CRM/task logic — always call existing services.

## Routes

| Route | Purpose |
|-------|---------|
| `/companies/categories` | Category index |
| `/companies/categories/[id]` | Full overview + action bar |
| `/settings/company-categories` | Taxonomy CRUD (23A) + Overview links |

## Available actions

| Action | Behaviour | Safety |
|--------|-----------|--------|
| Add to Funnel | `runFunnelActivation` per company | Requires confirm |
| Start Email Campaign | Creates **draft** with `companyCategoryIds` audience | Confirm; no auto-launch |
| Create Email Sequence | Draft via sequence engine | — |
| Generate AI Email | `generateEmailAIAction` with category context | Never sends |
| Create CRM Task | Bulk tasks (creates leads if needed) | — |
| Add Tag | Free-text tags on CRM leads | — |
| Assign Owner | `assignLeadsAction` | — |
| Follow-up Plan | Composed tasks (call + reminder after N days) | Not a full workflow engine |
| Export Companies | Client CSV | — |
| Export Contacts | Guidance to Contacts / funnel | — |

## Workflow examples

### Restaurant outreach

1. Open **Categories → Restaurant**
2. Filter Campaign Ready
3. **Add to Funnel** (confirm)
4. Approve readiness in `/crm/campaign-ready`
5. **Start Email Campaign** → review draft → launch from campaign UI

### Courier follow-up

1. Select companies
2. **Create CRM Task** “Call Companies”
3. Or **Follow-up Plan** (call + reminder in 5 days)

### AI draft for Marketing Agency

1. **Generate AI Email** with purpose “Marketing automation intro”
2. Review in `/email/ai/history`
3. Apply manually to a template/sequence

## Audience extension

`CampaignAudienceDefinition` now supports:

- `source: "company_category"`
- `companyCategoryIds: string[]`

Candidates are filtered via `companies.company_category_id` while still respecting Campaign Ready + approval gates.

## RBAC

Current roles: `owner` | `admin` (full category actions).

Prepared matrix in `categoryActionPermissionsForRole` for future roles:

| Role (future) | Campaigns / Funnels / Bulk | CRM / Tasks | View |
|---------------|----------------------------|-------------|------|
| Owner / Admin / Marketing | Yes | Yes | Yes |
| Manager | Funnels + CRM/Tasks | Yes | Yes |
| Regular / Read-only | No | Limited / No | Yes |

Enforcement today: owner/admin only for mutations.

## Filters (category overview)

Campaign Ready · Country · City · Tag · Assigned user · Lead status

(Category itself is the page scope.)

## Future expansion

`FUTURE_CATEGORY_CAPABILITIES` reserved (not built):

- AI Qualification
- Sales Automation
- WhatsApp / SMS campaigns
- Webhooks
- Marketplace plugins

New actions should:

1. Add a type to `CATEGORY_ACTION_TYPES`
2. Implement a thin wrapper in `actions.ts`
3. Record via `recordCategoryActionRun`
4. Expose a dialog on the action bar

Do **not** invent a parallel CRM or email engine inside category-actions.
