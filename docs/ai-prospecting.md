# AI Prospecting Agent (Phase 27B)

Production prospecting agent on top of the Phase 27A AI Agent Platform.

## Mission

Find, research, classify, enrich, score, and prepare company prospects for sales — multi-tenant, RLS-backed, security-first.

## Architecture

```
/prospecting UI
    ↓ server actions / queries
src/lib/prospecting/*
    ↓ registers agent via
src/ai/agents/registry (Phase 27A)
    ↓ optional AI polish via
src/ai/providers/router + failover
    ↓ website fetch via
src/lib/enrichment/website-crawler
    ↓ CRM push via
companies / contacts / crm_leads / crm_tasks / crm_notes
```

Agent slug: `storaflow-prospecting-agent` (auto-registered, enable/disable via settings → agent status paused/idle).

## Datamodel

Migration: `supabase/migrations/20260726000043_ai_prospecting_agent.sql` (manual).

| Table | Purpose |
|-------|---------|
| `prospecting_org_settings` | Thresholds, autonomy, provider/model |
| `prospecting_searches` | Saved ICP / search criteria |
| `prospecting_prospects` | Prospects + scores + enrichment |
| `prospecting_research_runs` | Pipeline execution history |
| `prospecting_history_events` | Audit trail |
| `prospecting_bulk_jobs` | Import / analyze / export jobs |

## Research pipeline

1. **Fetch** — SSRF-safe `fetchHtmlPage`
2. **Analyze** — products, services, audience, USPs, tech, contacts
3. **Classify** — business class (retail, manufacturing, …)
4. **Opportunities** — no CRM, outdated site, growth, Storaflow fit, …
5. **Decision makers** — role suggestions by industry
6. **Score** — 0–100 + Cold/Warm/Hot/Enterprise/Strategic
7. **Recommend** — call / email / demo / LinkedIn / later / skip
8. **Enrich** — optional company field updates
9. **AI polish** — optional summary via model router (failover)

## Lead score factors

Website, email, phone, address, social, employee band, revenue band, industry fit, digital maturity, Storaflow fit, opportunity density, duplicate penalty, AI confidence.

## CRM integration

One-click (or bulk-ready):

- Create/link company (duplicate-aware by domain/name)
- Create contact (email)
- Create lead (`createLeadFromCompanyAction`)
- Create follow-up task
- Create research note

## Security

- Org RLS on all prospecting tables
- Rate limits / approval mode in settings
- Website fetch uses existing SSRF guards
- Duplicate detection prevents silent CRM pollution
- History events for audit / GDPR traceability

## UI

`/prospecting` tabs: Overview, Prospects, Companies, Research, Lead Score, Enrichment, Opportunities, History, Settings.

## Extensibility

- New opportunity detectors: `src/lib/prospecting/opportunities.ts`
- New score factors: `src/lib/prospecting/score.ts`
- New tools: register on agent + AI platform tool registry
- Live scrape discovery: attach `search_queries` / scraper engine without changing kernel

## Tests

```bash
node --experimental-strip-types --test src/lib/prospecting/prospecting.test.ts
```

## Related

- [ai-agent-platform.md](./ai-agent-platform.md) (Phase 27A)
