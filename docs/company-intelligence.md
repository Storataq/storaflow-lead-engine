# AI Company Intelligence (Phase 25A)

Turns every company into an intelligent profile for scoring, personalization, and future automation — without redesigning CRM, categories, enrichment, or email.

Related: [architecture.md](./architecture.md), [company-classification.md](./company-classification.md), [CONTACT-DISCOVERY.md](./CONTACT-DISCOVERY.md), [EMAIL-AI-ARCHITECTURE.md](./EMAIL-AI-ARCHITECTURE.md).

## Principles

- Extend only — no removal of existing fields or flows
- Deterministic scoring always works; optional AI enriches summaries when a provider is configured
- Provider-agnostic (`createAIProvider` from the email AI layer)
- Cache latest analysis on the company + profile tables
- Lazy-load the intelligence block on company detail (`Suspense`)

## Migration

`supabase/migrations/20260726000026_company_intelligence.sql`

Run manually **after** `20260726000025_company_category_actions.sql`. Do **not** auto-run from the app.

Adds:

- Denormalized fields on `companies`:
  - `intelligence_score`
  - `lead_potential_score`
  - `intelligence_status` (`idle` | `processing` | `completed` | `failed`)
  - `intelligence_analyzed_at`
  - `intelligence_needs_review`
- `company_intelligence_profiles` — latest snapshot per company (unique `company_id`)
- `company_intelligence_runs` — audit / future background job history

RLS: org members read; owner/admin write.

## Data flow

```
Company detail / Refresh AI Analysis
        │
        ▼
buildIntelligenceSignals (CRM + contacts + enrichment + category)
        │
        ▼
Deterministic scores (health, lead, contact, online, insights, growth, recommendations)
        │
        ▼
Optional AI enrich (summary / extra insights / recommendations) via createAIProvider
        │
        ▼
applyIntelligenceResult → profile upsert + run insert + companies denorm
        │
        ▼
Company Intelligence panel (cached JSON sections)
```

## Package

`src/lib/companies/intelligence/`

| Module | Role |
|--------|------|
| `signals.ts` | Collect CRM + enrichment + contact signals |
| `score.ts` | Health, lead potential, online presence, insights, growth, recommendations |
| `generate.ts` | Assemble deterministic intelligence result |
| `ai.ts` | Optional provider-backed summary enrichment |
| `apply.ts` | Persist profile + run + company denorm |
| `actions.ts` | `refreshCompanyIntelligenceAction` (owner/admin) |
| `queries.ts` | Profile / run reads |
| `background.ts` | Non-throwing helper for future enrichment/scheduled hooks |
| `constants.ts` | Health bands + lead temperatures |

## UI

| Component | Role |
|-----------|------|
| `company-intelligence-section.tsx` | Suspense boundary + data load |
| `company-intelligence-panel.tsx` | Full intelligence surface + Refresh |
| `intelligence-cards.tsx` | Reusable AI Score / Health / Lead / section cards |

Mounted on `/companies/[id]` after Category Intelligence.

Sections: AI Summary, Business Profile, AI Insights, Company Health, Growth Signals, Contact Quality, Online Presence, AI Recommendations, lead score rationale.

## Scores

### Company Health (0–100)

Weighted factors: website, contact information, social activity, business completeness, reviews / public presence, maturity signals.

Bands: Excellent (≥80), Good (≥65), Average (≥45), Needs Attention (&lt;45).

### Lead Potential (0–100)

Temperature: Hot (≥75), Warm (≥55), Cold (≥35), Very Cold (&lt;35). Reasons explain why.

## Refresh & status

- Button: **Refresh AI Analysis**
- Shows last analyzed, status (Processing / Completed / Failed), confidence, provider
- Future: call `runIntelligenceInBackground` from enrichment/schedulers without blocking UI

## Future AI integrations

- Swap or add providers through `src/lib/email/ai/provider` (already abstracted)
- Persist `provider` + `model` on profiles/runs
- Extension points: campaign personalization, lead scoring pipelines, category routing, sequence copy
- Do not hardcode vendor SDKs inside the intelligence package

## Performance

- Intelligence section loads in `Suspense` so the rest of company detail paints first
- Analysis results are cached in `company_intelligence_profiles` — no recompute on every page view
- Refresh is explicit (manual) in this phase

## Not in this phase

- Automatic background analysis on every scrape (helper exists; not wired as default)
- Employee/revenue estimation APIs
- Mobile-friendliness lab checks
- Outbound automation from recommendations
