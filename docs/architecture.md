# Storaflow Architecture — Foundation v0.1 (Phase 20A)

Canonical architecture overview for the production-ready foundation.
Related: [ROADMAP.md](./ROADMAP.md), [future-integrations.md](./future-integrations.md),
[RELEASE-v0.1-FOUNDATION.md](./RELEASE-v0.1-FOUNDATION.md).

## Goal

Stabilize Search → Jobs → Connectors → Companies/Contacts → CRM → Intelligence →
Qualification → Opportunities → Executive Analytics. Live scraping (20B) and
contact discovery (20C) are delivered; funnel activation is Phase 20D.

## System diagram

```
Auth + Organization (RLS)
        │
        ├─ Search queries ──► Scrape jobs (queue) ──► JobExecutor / ScraperEngine
        │                              │
        │                              ▼
        │                     Connectors (mock / Maps mock / OpenStreetMap live)
        │                              │
        │                              ▼
        │                     Normalize → Dedupe → Persist companies/contacts
        │
        ├─ Website enrichment (job_type=website_crawl)
        │         └─ HTTP crawler → contact discovery → email syntax/MX → contacts
        │
        ├─ Funnel activation (20D)
        │         └─ Lead → qualify → opportunity → stage ≤ outreach-ready → tasks → campaign_readiness
        │
        ├─ Automated Email Engine (21A–21K)
        │         └─ templates / campaigns / sequences / queue / Resend / tracking /
        │            preferences / analytics / optional AI drafts (human review; no auto-send)
        │            + AI Campaign Builder (25D) visual workflow / A/B / subject scores
        │
        └─ CRM (leads, pipeline, deals, tasks, notes, funnels)
                │
                ├─ Company Intelligence / Sources / Enrichment
                ├─ AI Company Intelligence profiles (25A)
                ├─ AI Contact Intelligence profiles (25B)
                ├─ Advanced sales pipelines / deal Kanban / forecast (25C)
                ├─ AI Lead Scoring Engine (25E) — weighted / explainable scores
                ├─ AI Sales Automation Engine (25F) — workflows on outbox events
                ├─ Executive Analytics Dashboard (25G) — BI over live modules
                ├─ AI Copilot (25H) — NL assistant + confirmed actions
                ├─ Qualification engine (deterministic)
                ├─ Opportunity Insights + NBA (deterministic)
                ├─ Campaign Ready queue (no send)
                └─ Executive Dashboard (aggregation + deterministic mocks)
```

## Folder map

| Path | Role |
|---|---|
| `src/app/(app)/` | Authenticated routes, `loading.tsx`, `error.tsx` |
| `src/components/layout/` | PageHeader, EmptyState, PageSkeleton, RouteLoading, PageErrorState, InlineErrorAlert |
| `src/components/crm/` | CRM managers and dashboards |
| `src/lib/searches/` `src/lib/jobs/` | Search CRUD + job queue/executor |
| `src/lib/scraping/connectors/` | Connector interface, registry, mock, OSM live |
| `src/lib/enrichment/` | Website crawler, contact discovery, email validation (20C) |
| `src/lib/crm/funnel-activation/` | Funnel orchestrator + campaign readiness (20D) |
| `src/lib/email/` | Automated Email Engine (templates → AI assistance) |
| `src/lib/email/ai/` | Phase 21K provider-agnostic AI layer |
| `src/lib/email/campaign-builder/` | Phase 25D visual AI campaign builder |
| `src/lib/companies/intelligence/` | Phase 25A AI company profiles / health / lead scores |
| `src/lib/crm/contact-intelligence/` | Phase 25B AI CRM contact profiles / DM / quality |
| `src/lib/crm/pipeline/` | Phase 25C forecast, NBA, automation outbox |
| `src/lib/crm/lead-scoring/` | Phase 25E weighted AI lead scoring engine |
| `src/lib/crm/automation/` | Phase 25F sales automation engine / processor |
| `src/lib/crm/executive-analytics/` | Phase 25G executive BI / KPI bundle |
| `src/lib/copilot/` | Phase 25H AI Copilot engine / tools / safety |
| `src/lib/integrations/` | Phase 25I Integrations Marketplace / OAuth / sync |
| `src/lib/platform-api/` | Phase 26B public REST API / webhooks / keys |
| `src/lib/billing/` | Phase 26F billing / subscriptions / limit engine |
| `src/lib/platform-admin/` | Phase 26G multi-tenant platform administration |
| `src/lib/pwa/` | Phase 26H PWA / offline queue / share / push scaffolds |
| `src/ai/` | Phase 27A AI Agent Platform kernel |
| `src/lib/prospecting/` | Phase 27B AI Prospecting Agent |
| `src/lib/sales-agent/` | Phase 27C AI Sales Agent |
| `src/lib/customer-success/` | Phase 27F AI Customer Success Agent |
| `src/lib/revenue-intelligence/` | Phase 27G AI Revenue Intelligence Agent |
| `src/lib/orchestrator/` | Phase 27H AI Orchestrator & Multi-Agent Collaboration |
| `src/lib/crm/` | CRM queries/actions + qualification / opportunities / executive |
| `src/lib/ui/format.ts` | Shared display formatters |
| `supabase/migrations/` | Manual additive SQL |
| `worker/` | Future background worker stub |
| `docs/CONTACT-DISCOVERY.md` | Phase 20C crawler / validation docs |
| `docs/FUNNEL-ACTIVATION.md` | Phase 20D funnel / campaign-ready docs |
| `docs/AUTOMATED-EMAIL-ENGINE.md` | Email engine docs |
| `docs/EMAIL-AI-ARCHITECTURE.md` | Phase 21K AI architecture |
| `docs/company-intelligence.md` | Phase 25A AI company intelligence |
| `docs/contact-intelligence.md` | Phase 25B AI contact intelligence |
| `docs/advanced-sales-pipeline.md` | Phase 25C advanced CRM / sales pipeline |
| `docs/ai-email-campaign-builder.md` | Phase 25D AI email campaign builder |
| `docs/ai-lead-scoring.md` | Phase 25E AI lead scoring engine |
| `docs/ai-sales-automation.md` | Phase 25F AI sales automation engine |
| `docs/executive-analytics.md` | Phase 25G executive analytics dashboard |
| `docs/ai-copilot.md` | Phase 25H AI Copilot |
| `docs/integrations-marketplace.md` | Phase 25I Integrations Marketplace |
| `docs/api-webhook-platform.md` | Phase 26B API & Webhook Platform |
| `docs/white-label-platform.md` | Phase 26C White Label Platform |
| `docs/team-collaboration.md` | Phase 26D Team Collaboration Platform |
| `docs/enterprise-security-identity.md` | Phase 26E Enterprise Security & Identity |
| `docs/billing-subscription.md` | Phase 26F Billing & Subscription Management |
| `docs/platform-administration.md` | Phase 26G Multi-Tenant Administration Platform |
| `docs/mobile-pwa.md` | Phase 26H Mobile Experience & PWA |
| `docs/ai-agent-platform.md` | Phase 27A AI Agent Platform |
| `docs/ai-prospecting.md` | Phase 27B AI Prospecting Agent |
| `docs/ai-sales-agent.md` | Phase 27C AI Sales Agent |
| `docs/ai-customer-success.md` | Phase 27F AI Customer Success Agent |
| `docs/ai-revenue-intelligence.md` | Phase 27G AI Revenue Intelligence Agent |
| `docs/ai-orchestrator.md` | Phase 27H AI Orchestrator & Multi-Agent Collaboration |

## Auth & security

- Supabase Auth; no public self-registration in UI
- `organization_id` derived server-side from membership
- RLS on org-scoped tables; service role never in client
- User-facing errors via `toUserFacingError` (no SQL/stack/secrets)

## Search & queue

Lifecycle (canonical UI phases for 20B):

`draft → pending → queued → running (active) → completed | failed | cancelled`

Retry = failed → re-queue (`jobLifecyclePhase(..., { hadFailure: true })` → **Retrying**).
See `src/lib/jobs/lifecycle.ts`.

Live scraping uses JobExecutor + connectors (including OpenStreetMap Nominatim).
Website enrichment reuses the same `scrape_jobs` queue with `job_type=website_crawl`.
See [CONTACT-DISCOVERY.md](./CONTACT-DISCOVERY.md).

## Connector framework

- Runtime contract: `Connector` in `connectors/connector.ts`
- Catalog/registry for UI and factory selection
- Rate limits / retries / modes already on framework manifests (`lib/scraping/types/connector.ts`)
- Phase 20B prep types: `connectors/readiness.ts` (pagination, cancellation, run stats, execution context)
- Live connector: OpenStreetMap Nominatim (HTTP, polite rate limits)

## CRM

Leads → stages/pipelines → deals / tasks / notes.
Qualification and opportunities **score** existing leads; they do not invent CRM rows.
Executive Dashboard aggregates CRM + engines with deterministic range scaling.

## UI conventions (Foundation)

| Concern | Primitive |
|---|---|
| Header | `PageHeader` |
| Loading | `loading.tsx` → `RouteLoading` / `PageSkeleton` |
| Empty | `EmptyState` (+ optional secondary CTA) |
| Error | `toUserFacingError` + `ReloadErrorAlert` / `PageErrorState` |
| CRM nav | `NAV_ITEMS` children + `CrmSubnav` |
| Display | `lib/ui/format.ts` |

## Mock behavior (explicit)

- Connectors: mock mode only
- Jobs: client-polled mock pipeline
- Intelligence enrichment / source confidence: deterministic
- Qualification / opportunity / executive gaps: deterministic mocks, labeled where relevant

## Next phases

| Phase | Focus |
|---|---|
| **20B** | Live Scraper Engine behind connector + worker |
| **20C** | Contact & email discovery (find/validate — no send) |
| **20D** | Funnel activation + campaign readiness wiring |
| Later | Automated Email Engine (see `lib/email/future-engine.ts`) |
