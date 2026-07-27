# Storaflow Release Notes — v0.1 Foundation

**Release name:** Storaflow Foundation  
**Version:** 0.1  
**Phase:** 20 — Production Readiness  
**Date:** 2026-07-26  

This document is the release summary only. No GitHub Release was created.

---

## Summary

v0.1 is the **production-ready foundation** of Storaflow. It delivers an authenticated, organization-isolated web app for search → mock scrape → companies/contacts → full CRM → intelligence → qualification → opportunities → executive analytics.

No live scraping, no external AI, no outbound email.

---

## Implemented modules

| Module | Status |
|---|---|
| Authentication (Supabase Auth) | Ready |
| Organizations + RLS isolation | Ready |
| Search Engine (zoekopdrachten) | Ready (mock scrape) |
| Search Jobs + queue UX | Ready (mock executor) |
| Connector Framework + Connector Management | Ready (mock + Google Maps MVP mock) |
| Companies & company detail | Ready |
| Contacts / contact signals | Ready |
| CRM Leads, Pipeline, Deals, Tasks, Notes, Funnels | Ready |
| Lead Detail Workspace | Ready |
| Company Intelligence + Sources + Enrichment | Ready (deterministic / mock) |
| Lead Qualification Engine | Ready (deterministic) |
| Opportunity Insights + Next Best Action | Ready (deterministic) |
| Executive CRM Dashboard & Funnel Analytics | Ready (derived + deterministic) |
| UX foundation (loading / empty / error / a11y polish) | Ready (Phase 20) |

---

## Architecture overview

- **Next.js App Router** + TypeScript + Tailwind + shadcn/ui  
- **Supabase** Auth, Postgres, RLS  
- **Server actions** for mutations; org context always derived server-side  
- **Connectors** abstracted for future live sources  
- **Scoring engines** are pure aggregation layers over CRM data  

Details: [architecture.md](./architecture.md)

---

## Known placeholders

- Live Google Maps / Places / Search connectors (mock only)
- Website crawler, email finder/validation, outbound email
- Campaign & automation engines
- Real CSV/Excel export pipelines (some JSON/CSV placeholders exist)
- AI-generated summaries / enrichment (rule-based text today)
- Dedicated background worker claim loop (`worker/` stub)
- Public registration, billing, multi-tenant SaaS extras

---

## Future plans (not in v0.1)

| Track | Direction |
|---|---|
| **Connectors** | Real Maps/Search connectors behind existing interface + rate limits |
| **Scraping** | Live executor + worker claim; same job statuses |
| **Email automation** | Campaign readiness → staged sends with explicit consent |
| **AI** | Server-only adapter for summaries/NBA; keep UI contracts |

See [future-integrations.md](./future-integrations.md) and [roadmap.md](./roadmap.md).

---

## Quality gate (Phase 20)

- Lint and production build must pass before merge
- No database migration required for Phase 20 polish
- No breaking route renames

**Storaflow v0.1 Foundation is ready for the next development phase** (live connectors / campaigns / AI adapters), building on this stable shell.
