# Storaflow Roadmap

Canonical roadmap for Foundation and post-foundation phases.
Related: [ARCHITECTURE.md](./ARCHITECTURE.md), [RELEASE-v0.1-FOUNDATION.md](./RELEASE-v0.1-FOUNDATION.md).

## Done — v0.1 Foundation (Phase 20 / 20A)

- Auth, orgs, RLS, app shell
- Search queries + mock scrape jobs + queue UX
- Connector framework (mock + Google Maps MVP mock)
- Companies, contacts
- Full CRM: leads, pipeline(s), funnels, deals, tasks, notes, lead workspace
- Company Intelligence, Sources, Enrichment
- Lead Qualification, Opportunity Insights + NBA
- Executive CRM Dashboard & funnel analytics
- Production readiness: loading/empty/error, a11y, display helpers, docs

## Phase 20B — Live Scraper Engine (delivered)

- Scraper Engine: start / stop / retry / cancel / resume
- JobExecutor → connector → normalize → validate → dedupe → persist
- Live connector: OpenStreetMap Nominatim (HTTP, rate-limited, no API key)
- Mock + Google Maps mock preserved
- Contacts upserted from emails/phones when present
- Search detail scrape-status panel; in-process worker helper
- **Still later:** dedicated long-running worker process, CAPTCHA, private networks

## Phase 20C — Contact and Email Discovery (delivered)

- Website / public-page contact extraction (HTTP/HTML crawler)
- Email finder + syntax/MX signals + confidence (mailbox = not checked)
- Phone / social / people discovery with dedupe
- Jobs reuse `scrape_jobs` (`website_crawl`) + existing queue advance path
- Company enrichment panel, results page, enrichment dashboard + controlled bulk
- Opportunity/qualification consume contactability via existing fields + soft signals
- Docs: [CONTACT-DISCOVERY.md](./CONTACT-DISCOVERY.md)
- **No outbound email**

## Phase 20D — Funnel Activation (delivered)

- Funnel Activation Orchestrator (idempotent)
- Company/contact eligibility + exclusion respect
- Lead create/reuse, qualification + opportunity engines reused
- Pipeline stage ceiling at outreach-ready
- Task automation with dedupe
- Campaign Readiness + approval queue
- Routes: `/crm/funnel-activation`, `/crm/campaign-ready`
- Docs: [FUNNEL-ACTIVATION.md](./FUNNEL-ACTIVATION.md)
- **No outbound email**

## Automated Email Engine (later)

Concepts prepared in `src/lib/email/future-engine.ts`:

Campaign, Sequence, Template, Recipient, Personalization, Email Queue,
Scheduled Send, Delivery, Bounce, Reply, Unsubscribe, Stop on Reply, Analytics.

Requires explicit user action to send; exclusions always apply.

## SaaS later

Registration, billing, teams/RBAC, public API, webhooks, white label.
