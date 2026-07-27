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

## Automated Email Engine

- **21A** Foundation — `20260726000011_…`
- **21B** Template & personalization — `20260726000012_…`
- **21C** Campaign Manager — `20260726000013_…`
- **21D** Sequence Engine — `20260726000014_…`
- **21E** Queue / Scheduler / Execution — `20260726000015_…`
- **21F** Provider (Resend) — `20260726000016_…`
- **21G** Delivery events — `20260726000017_…`
- **21H** Open / click / reply tracking — `20260726000018_…`
- **21I** Preferences / suppression — `20260726000019_…`
- **21J** Analytics intelligence — `20260726000020_…`
- **21K** AI intelligence (optional, human-reviewed) — `20260726000021_…`
- **21L** Production hardening / ops — `20260726000022_…`
- Docs: [AUTOMATED-EMAIL-ENGINE.md](./AUTOMATED-EMAIL-ENGINE.md), [EMAIL-PRODUCTION-READINESS.md](./EMAIL-PRODUCTION-READINESS.md)
- **Status:** Ready for controlled test mode / limited pilot after manual config — not auto Production Ready
- **Still later:** deeper CRM linkage, GDPR export/erasure, additional providers, external alerting channels

## SaaS later

Registration, billing, teams/RBAC, public API, webhooks, white label.

## Phase 25A — AI Company Intelligence (delivered in codebase)

- Intelligent company profiles on company detail (health, lead potential, summary, presence, recommendations)
- Migration `20260726000026_company_intelligence.sql` (manual)
- Docs: [company-intelligence.md](./company-intelligence.md)
- Optional AI via shared provider abstraction; deterministic scores always available

## Phase 25B — AI Contact Intelligence (delivered in codebase)

- Intelligent CRM contact profiles (`crm_lead_contacts`) with health/quality, DM analysis, timeline, badges
- Routes: `/crm/contacts`, `/crm/contacts/[id]`
- Migration `20260726000027_contact_intelligence.sql` (manual)
- Docs: [contact-intelligence.md](./contact-intelligence.md)

## Phase 25C — Advanced CRM & Sales Pipeline (delivered in codebase)

- Multi-pipeline + stage probability, deal Kanban, deal timeline, win/loss analysis, forecast widgets
- Migration `20260726000028_advanced_sales_pipeline.sql` (manual)
- Routes: `/crm/pipeline?view=deals`, `/crm/analytics`, enhanced deals/pipelines/funnels
- Docs: [advanced-sales-pipeline.md](./advanced-sales-pipeline.md)

## Phase 25D — AI Email Campaign Builder (delivered in codebase)

- Visual workflow canvas (zoom/pan), AI email + subject optimizer, A/B drafts, calendar dashboard
- Migration `20260726000029_ai_email_campaign_builder.sql` (manual)
- Routes: `/email/campaigns/new/builder`, `/email/campaigns/[id]/builder`, `/email/campaigns/calendar`
- Docs: [ai-email-campaign-builder.md](./ai-email-campaign-builder.md)

## Phase 25E — AI Lead Scoring Engine (delivered in codebase)

- Weighted 0–100 scores, sub-scores, classification, opportunity/risk, NBA, history, alerts, org settings
- Migration `20260726000030_ai_lead_scoring_engine.sql` (manual)
- Routes: `/crm/scoring`, `/crm/scoring/settings`, lead detail scoring panel; badges on Kanban
- Docs: [ai-lead-scoring.md](./ai-lead-scoring.md)

## Phase 25F — AI Sales Automation Engine (delivered in codebase)

- Visual workflow builder, templates, AI suggestions, runs/logs, dashboard widgets, RBAC
- Migration `20260726000031_ai_sales_automation_engine.sql` (manual)
- Routes: `/crm/automations`, `/crm/automations/new`, `/crm/automations/[id]`, `/crm/automations/runs/[id]`
- Docs: [ai-sales-automation.md](./ai-sales-automation.md)

## Phase 25G — Executive Analytics Dashboard (delivered in codebase)

- Executive BI on `/crm/executive`: KPIs, funnels, revenue-by-currency, lead quality, campaigns, automations, attention, grounded summary, saved reports
- Migration `20260726000032_executive_analytics_dashboard.sql` (manual)
- Docs: [executive-analytics.md](./executive-analytics.md)

## Phase 25H — Storaflow AI Copilot (delivered in codebase)

- Floating/sidebar/docked/fullscreen assistant, dashboard `/copilot`, NL search/tools, insights, email drafts, confirmation-gated actions, SSE streaming
- Migration `20260726000033_ai_copilot.sql` (manual)
- Docs: [ai-copilot.md](./ai-copilot.md)

## Phase 25I — Integrations Marketplace (delivered in codebase)

- Marketplace browse/connect/configure/sync at `/integrations`; OAuth-ready crypto + sync engine + webhook scaffolding; Copilot aware of connected services
- Migration `20260726000034_integrations_marketplace.sql` (manual)
- Docs: [integrations-marketplace.md](./integrations-marketplace.md)

## Phase 26B — API & Webhook Platform (delivered in codebase)

- Versioned REST `/api/v1`, API key management, outbound signed webhooks, rate limits, OpenAPI, event bus, `/api-management` UI
- Migration `20260726000035_api_webhook_platform.sql` (manual)
- Docs: [api-webhook-platform.md](./api-webhook-platform.md)

## Phase 26C — White Label Platform (delivered in codebase)

- Org-scoped logos, colors, fonts, login/email branding, feature toggles, custom domains, partner scaffolding, theme engine, live preview at `/settings/white-label`
- API `GET /api/v1/white-label` (`settings:read`); host-based login branding for verified domains
- Migration `20260726000036_white_label_platform.sql` (manual)
- Docs: [white-label-platform.md](./white-label-platform.md)

## Phase 26D — Team Collaboration Platform (delivered in codebase)

- Comments/mentions, notification center, team spaces, knowledge base, shared notes, meetings, task watchers/checklists/subtasks, unified activity feed
- UI `/collaboration/*`; embeddable comments on deals & tasks; AI assist helpers
- Migration `20260726000037_team_collaboration_platform.sql` (manual)
- Docs: [team-collaboration.md](./team-collaboration.md)

## Phase 26E — Enterprise Security & Identity (delivered in codebase)

- MFA, sessions/devices, SSO drafts, access/password policies, extended RBAC (`member`/`viewer`), custom roles, security dashboard, alerts, enterprise audit
- UI `/security/*`; login attempt + session tracking wired into auth actions
- Migration `20260726000038_enterprise_security_identity.sql` (manual)
- Docs: [enterprise-security-identity.md](./enterprise-security-identity.md)

## Phase 26F — Billing & Subscription Management (delivered in codebase)

- Plans/trials/seats, centralized limit engine, invoices, add-ons, coupons, Stripe checkout/portal/webhook scaffolding, financial MRR/ARR scaffold
- UI `/billing/*`; API `GET /api/v1/billing` (`billing:read`); white-label reseller fields
- Migration `20260726000039_billing_subscription_management.sql` (manual)
- Docs: [billing-subscription.md](./billing-subscription.md)

## Phase 26G — Multi-Tenant Administration Platform (delivered in codebase)

- Staff-only `/platform-admin/*` portal (not in customer nav): orgs, users, subscriptions, licenses, support, monitoring, audit, flags, announcements, settings, search, security
- Separate platform RBAC + impersonation (read-only default) + service-role cross-tenant queries after gate
- Migration `20260726000040_multi_tenant_administration.sql` (manual)
- Docs: [platform-administration.md](./platform-administration.md)

## Phase 26H — Mobile Experience & Progressive Web App (delivered in codebase)

- Installable PWA (manifest, service worker, icons, install prompt, update detection), offline outbox + sync API, bottom nav, compact mobile dashboard, share, push/device scaffolds
- UI `/settings/mobile`, offline page `/offline`, SW `/sw.js`
- Migration `20260726000041_mobile_pwa_experience.sql` (manual)
- Docs: [mobile-pwa.md](./mobile-pwa.md)

## Phase 27A — AI Agent Platform (delivered in codebase)

- Central AI kernel under `src/ai/` (agents, planner, tasks, providers+failover, tools, memory, context, approvals, security, knowledge, prompts, workflows, costs, events, logging, monitoring)
- Multi-tenant DB + RLS (`20260726000042_ai_agent_platform.sql`, manual), system kernel assistant auto-registered per org
- UI `/ai-platform/*`, REST `GET /api/v1/ai` (`ai:read`), internal worker `/api/internal/ai/worker-run`
- Docs: [ai-agent-platform.md](./ai-agent-platform.md)

## Phase 27B — AI Prospecting Agent (delivered in codebase)

- Prospecting agent `storaflow-prospecting-agent` on the 27A registry: search/ICP, website research, classification, enrichment, lead score 0–100, opportunities, CRM push, duplicates, bulk import/export
- UI `/prospecting/*`; domain `src/lib/prospecting/`
- Migration `20260726000043_ai_prospecting_agent.sql` (manual)
- Docs: [ai-prospecting.md](./ai-prospecting.md)

## Phase 27C — AI Sales Agent (delivered in codebase)

- Sales agent `storaflow-sales-agent` on the 27A registry: daily briefing, priority/risk/NBA engines, deal analysis, forecast, email/meeting assistants, coaching, CRM sync, bulk actions
- UI `/sales/*`; domain `src/lib/sales-agent/`
- Migration `20260726000044_ai_sales_agent.sql` (manual)
- Docs: [ai-sales-agent.md](./ai-sales-agent.md)

## Phase 27F — AI Customer Success Agent (delivered in codebase)

- CS agent `storaflow-customer-success-agent`: health scores, churn prediction, renewals, onboarding, upsell/cross-sell, success plans, alerts, CRM sync
- UI `/customer-success/*`; domain `src/lib/customer-success/`
- Migration `20260726000046_ai_customer_success_agent.sql` (manual; after 00045)
- Docs: [ai-customer-success.md](./ai-customer-success.md)

## Phase 27G — AI Revenue Intelligence Agent (delivered in codebase)

- Revenue agent `storaflow-revenue-intelligence-agent`: MRR/ARR/KPI pack, multi-horizon forecast, pipeline forecast, growth/churn/expansion, scenarios, executive reports, alerts
- UI `/revenue/*`; domain `src/lib/revenue-intelligence/`
- Migration `20260726000047_ai_revenue_intelligence_agent.sql` (manual)
- Docs: [ai-revenue-intelligence.md](./ai-revenue-intelligence.md)

## Phase 27H — AI Orchestrator & Multi-Agent Collaboration (delivered in codebase)

- Orchestrator `storaflow-orchestrator-agent`: NL goals, planner, agent selection, parallel execution, merge, approvals, failure recovery, cost routing
- UI `/orchestrator/*`; domain `src/lib/orchestrator/`
- Migration `20260726000048_ai_orchestrator_platform.sql` (manual; after 00047)
- Docs: [ai-orchestrator.md](./ai-orchestrator.md)
