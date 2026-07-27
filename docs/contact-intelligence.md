# AI Contact Intelligence (Phase 25B)

Transforms every CRM lead contact into an intelligent profile with scores, decision-maker analysis, timeline, and recommendations — extending Company Intelligence (25A) without redesigning CRM.

Related: [company-intelligence.md](./company-intelligence.md), [architecture.md](./architecture.md), [EMAIL-AI-ARCHITECTURE.md](./EMAIL-AI-ARCHITECTURE.md).

## Principles

- Target entity: **`crm_lead_contacts`** (person-level CRM contacts)
- Discovery table `contacts` remains a signal/list surface (`/contacts`) — not the intelligence UX
- Deterministic scoring always works; optional AI enriches summaries via `createAIProvider`
- Cache latest analysis on contact + profile tables
- Lazy-load intelligence via `Suspense` on contact detail

## Migration

`supabase/migrations/20260726000027_contact_intelligence.sql`

Run manually **after** `20260726000026_company_intelligence.sql`. Do **not** auto-run from the app.

Adds denormalized fields on `crm_lead_contacts` (scores, status, department, decision-maker flags, badges, language, channel, country) plus:

- `contact_intelligence_profiles` — latest snapshot per contact
- `contact_intelligence_runs` — audit / future background jobs

RLS: org members read; owner/admin write.

## Data flow

```
Refresh AI Analysis (/crm/contacts/[id] or action)
        │
        ▼
buildContactIntelligenceSignals (contact + lead + notes/tasks/activities/deals)
        │
        ▼
Deterministic profile / DM / health / quality / timeline / insights / badges
        │
        ▼
Optional AI enrich (summary + extra insights/recommendations)
        │
        ▼
applyContactIntelligenceResult → profile upsert + run + contact denorm
        │
        ▼
Contact Intelligence panel (cached JSON) + list filters / dashboard widgets
```

## Package

`src/lib/crm/contact-intelligence/`

| Module | Role |
|--------|------|
| `signals.ts` | CRM contact + lead relationship signals |
| `score.ts` | Profile inference, DM meters, health/quality, timeline, badges |
| `generate.ts` | Assemble deterministic result |
| `ai.ts` | Optional provider-backed enrichment |
| `apply.ts` | Persist profile/run + denorm |
| `actions.ts` | `refreshContactIntelligenceAction` |
| `queries.ts` | Detail, filtered list, dashboard widgets |
| `background.ts` | Non-throwing helper for future hooks |

## UI

| Route / component | Role |
|-------------------|------|
| `/crm/contacts` | Dashboard widgets + searchable/filterable list |
| `/crm/contacts/[id]` | Contact detail + Intelligence sections |
| `contact-intelligence-section.tsx` | Suspense loader |
| `contact-intelligence-panel.tsx` | Full AI surface + Refresh |
| `contact-intelligence-cards.tsx` | Score cards + influence meters |
| `contact-badges.tsx` | Reusable badges (CEO, Decision Maker, Hot Lead, …) |
| Lead workspace Contacts tab | Links to intelligence detail + score chips |

## Filters

List supports: Decision Maker, Department, Management Level, Contact/Health score floors, AI Confidence, Country, Language, Communication Preference, free-text search.

## Future AI integrations

- Same provider abstraction as email AI / company intelligence
- Persist `provider` + `model` on profiles/runs
- Extension points: campaign personalization, sequence targeting, lead routing, VIP handling
- Wire `runContactIntelligenceInBackground` after contact create/enrichment (not default in this phase)

## Not in this phase

- Auto-analysis on every contact create (helper ready)
- Email open/click attribution per person beyond lead `activity_events`
- Discovery-contact (`contacts` table) person profiles
