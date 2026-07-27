# Company Category Classification (Phase 23B)

Intelligent, transparent company category suggestions for Storaflow. Extends the Phase 23A Company Category taxonomy without redesigning Companies, CRM, or the scraper.

## Principles

- Analyse available company signals and **suggest** a category with confidence + reason.
- Never silently force an uncertain category.
- Users always have the final decision.
- Manual overrides are sticky until the user explicitly resets automatic classification.

## Migration

`supabase/migrations/20260726000024_company_category_classification.sql`

Additive only. Run manually after `20260726000023_company_categories.sql`.

Adds:

- Denormalized fields on `companies`:
  - `category_manual_override`
  - `category_needs_review`
  - `category_confidence`
  - `suggested_company_category_id`
  - `category_classified_at`
  - `category_classified_by`
- `company_category_classifications` — latest result per company
- `company_category_classification_history` — audit trail

Do **not** auto-run migrations from the app.

## When classification runs

| Trigger | Source value |
|---------|--------------|
| Search / scrape creates a company | `search` |
| Website enrichment finishes | `enrichment` |
| CSV import (no category or after import) | `csv_import` |
| User clicks Reclassify | `manual_reclassify` |
| Bulk Classify | `bulk` |
| Reset Automatic Classification | `reset_automatic` |

Manual company create is not yet a product path; the service accepts `manual_create` for future use.

## Signals analysed

Whenever available:

- Company name, website URL, industry, description, notes
- City / country
- Website title, meta description, about / homepage text
- Keywords, Google Business categories, LinkedIn industry
- Products, services, detected technologies (when present in signals)

## Confidence bands

| Score | Band | Behaviour |
|-------|------|-----------|
| 95–100% | `auto_select` | Pre-select category (user can still change) |
| 80–94% | `needs_confirmation` | Show suggested category; needs confirmation |
| 50–79% | `possible` | Show possible category; ask to confirm |
| &lt;50% | `unknown` | Do not assign; show Unknown / manual review |

Below 50% never auto-assigns. Mid bands store a suggestion and mark `category_needs_review`.

## Classification engine

Package: `src/lib/companies/classification/`

| Module | Role |
|--------|------|
| `deterministic.ts` | Keyword lexicon scoring against active org categories |
| `ai.ts` | Optional OpenAI refinement when `OPENAI_API_KEY` is set |
| `classify.ts` | Builds signals + runs hybrid classification |
| `apply.ts` | Persists result/history; respects manual override |
| `background.ts` | Non-throwing helper for scrape/enrichment pipelines |
| `actions.ts` | Reclassify, reset, bulk, CSV post-import |
| `queries.ts` | Detail panel + dashboard stats |

The service is reusable for future modules (lead routing, campaign suggestions, funnels, workflows). Those consumers are **not** implemented in this phase.

## Manual override

When a user assigns a category manually (detail card, list quick-edit, bulk assign, CSV import):

1. `category_manual_override = true`
2. History event `manual_override`
3. Later automatic runs **update the suggestion only** and never overwrite the assigned category

**Reset Automatic Classification** clears the override and re-runs classification with `force`.

## CSV import

1. If the row includes a category → assign it (imported value wins) and classify for transparency.
2. If AI suggestion differs with confidence ≥80% → show a **warning only**; do not overwrite.
3. If no category is imported → run classification (may auto-select at ≥95%).

## UI

| Surface | Feature |
|---------|---------|
| `/companies/[id]` | Category card + **Category Intelligence** panel (suggestion, confidence, reason, keywords, alternatives, history, Reclassify / Reset) |
| `/companies` | Suggested + confidence columns; filters (suggested, confidence bands, needs review, override, unknown); bulk **Classify Companies** |
| `/dashboard` | Companies by Category, needing review, unknown, average confidence, top detected, manual overrides |

## RBAC

Current org roles: `owner` | `admin`.

| Action | Who |
|--------|-----|
| View suggestions / history | Org members |
| Reclassify, reset override, bulk classify, CSV classify | Owner / Admin |
| Manual category assign / override | Owner / Admin |

Prepared for a future member / read-only split: members would remain view-only for classification mutations.

## Quality expectations

- Always explain **why** a category was suggested (`reason` + keywords).
- Keep taxonomy ownership in Phase 23A settings; classification only consumes active categories.
- Prefer deterministic + optional AI hybrid over opaque black-box assignment.

## Future integrations (not in this phase)

- Lead routing by category confidence
- Campaign / sequence suggestions
- Funnel and sales playbook hints
- Workflow automation triggers on `needs_review` or high-confidence assigns
