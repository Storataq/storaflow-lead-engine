# Storaflow Release Notes — v0.1 Foundation

**Product:** Storaflow (app branding: Lead Engine)  
**Version:** 0.1 Foundation  
**Phases:** 20 + 20A — Production Ready Foundation  
**Date:** 2026-07-26  

Documentation only — no GitHub Release and no Git tag were created.

---

## What ships in v0.1

### Authentication
Supabase Auth, organization membership, server-derived org context, RLS isolation.

### Search architecture
International search criteria (zoekopdrachten), status lifecycle, preview, start mock scrape.

### Queue and workers
Scrape jobs with queue buckets, progress, logs, retry/cancel controls, mock executor.
UI lifecycle helpers include **Retrying** for re-queued failed jobs (`lib/jobs/lifecycle.ts`).
Background `worker/` remains a stub for Phase 20B.

### Connector framework
Typed connector interface, registry/factory, catalog UI, mock + Google Maps MVP mock.
Readiness types for pagination, cancellation, rate limits, retries, run statistics.
**No live external providers.**

### CRM
Leads, pipelines/stages, funnels config, deals, tasks, notes, lead detail workspace,
pipeline Kanban, CRM dashboard, activity audit log.

### Company Intelligence
Intelligence dashboard, sources center, enrichment panels (deterministic / mock).

### Qualification
Deterministic lead qualification engine and dashboard (`/crm/qualification`).

### Opportunity Insights
Opportunity scoring, classifications, next-best-action (`/crm/opportunities`).

### Executive Dashboard
KPIs, funnel, pipeline overview, conversion, sources, revenue forecasts, outreach,
tasks, alerts, activity, summary (`/crm/executive`). Estimates clearly labeled.

### UX Foundation (20 / 20A)
Route skeletons, EmptyState, PageErrorState, ReloadErrorAlert, shared formatters,
CRM nav reachability (Pipeline, Pipelines, Funnels), accessibility polish.

---

## Known mock functionality

- All connector network paths are mock
- Job advancement via client poll + mock pipeline
- Intelligence / qualification / opportunity / executive fill gaps with deterministic mocks
- Export / exclusions are placeholder empty states

---

## Known limitations

- No Google Maps/Places/Search live API
- No Puppeteer/Playwright crawler
- No email send / campaigns
- No OpenAI
- No webhooks / public API
- No automatic scraper → CRM conversion rules

---

## Phase plans

### Phase 20B — Live Scraper Engine
Search Request → Job → Queue → Worker → Connector → Normalize → Dedupe →
Companies/Contacts → CRM. Reuse readiness types; keep job UI statuses.

### Phase 20C — Contact and Email Discovery
Public contact extraction, email find/validate signals, enrich readiness — **no send**.

### Phase 20D — Funnel Activation
Activate campaign-ready paths in CRM/funnels; prepare recipients for later email.

### Automated Email Engine (later)
Campaign / sequence / template / queue / delivery / bounce / reply / unsubscribe /
stop-on-reply / analytics — documented in `src/lib/email/future-engine.ts`.

---

## Confirmation

**Storaflow v0.1 Foundation is stable and ready for Phase 20B (Live Scraper Engine).**

Related docs: [ARCHITECTURE.md](./ARCHITECTURE.md), [ROADMAP.md](./ROADMAP.md),
[future-integrations.md](./future-integrations.md).
