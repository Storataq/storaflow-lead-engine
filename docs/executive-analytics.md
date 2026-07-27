# Executive Analytics Dashboard (Phase 25G)

Upgrades `/crm/executive` into an organization-scoped business intelligence layer that composes live CRM, pipeline, lead scoring, email, automation, and activity data — without redesigning those modules.

## Goals

- Answer: what is happening, why, what needs attention, what next
- Real organization data only (honest empty states; no fabricated KPIs)
- Currency-safe aggregations (group by currency; no invented FX)
- Grounded rule-based executive summary (facts vs suggestions separated)
- Saved reports + CSV export with RBAC
- Reuse existing services (pipeline forecast inputs, email analytics, automation dashboard, lead scoring leaderboards)

## Architecture

```
/crm/executive (server page)
  └─ buildExecutiveAnalyticsDashboard()
        ├─ loadExecutiveRawSnapshot (counts + limited rows)
        ├─ buildAutomationDashboard (25F)
        ├─ buildLeadScoringLeaderboards (25E)
        ├─ buildEmailAnalyticsDashboard (21J)
        └─ buildGroundedExecutiveSummary (rule-based)
  └─ ExecutiveAnalyticsDashboard (client UI + filter query params)
```

Domain package: `src/lib/crm/executive-analytics/`

| File | Role |
|---|---|
| `calculations.ts` | Currency grouping, trends, funnel math |
| `date-range.ts` | Presets + previous-period windows |
| `queries.ts` | Org-scoped loaders (server auth context) |
| `build.ts` | Bundle assembly |
| `summary.ts` | Grounded summary |
| `actions.ts` | Saved reports + export gate |
| `constants.ts` | Glossary + defaults |

Phase 19 `src/lib/crm/executive-dashboard/` remains available for qualification/opportunity client aggregation; the executive route now uses the 25G service.

## Migration

Apply manually after 25F:

`supabase/migrations/20260726000032_executive_analytics_dashboard.sql`

Creates `crm_executive_reports` (filters JSON, favorite/default/archive, schedule columns reserved).

## Filters

URL query params + optional `localStorage` (`storaflow.exec.filters.v1`):

`range`, `from`, `to`, `owner`, `pipeline`, `campaign`, `industry`, `country`, `class`, `dealStatus`, `currency`, …

Presets: Today, Yesterday, Last 7/30 days, This/Last month, This quarter, This year, Custom.

Organization is always taken from the authenticated session — never from the client.

## Currency handling

- Sums are **per currency**
- KPI cards prefer a selected currency or the largest open-pipeline currency
- Multi-currency notice shown; no exchange rates invented

## RBAC

| Capability | Roles |
|---|---|
| View dashboard | Org members |
| Save / archive / favorite / default reports | Owner, admin |
| Export CSV | Owner, admin, member |

## AI summary

Rule-based from the live bundle (`isModelGenerated: false`).

- Lists facts, suggestions, unavailable notes, period, generated time
- Refresh regenerates from current metrics
- Does not fabricate causal explanations

## Live vs placeholder widgets

| Widget | Data |
|---|---|
| KPI cards | Live counts/deals/email/automation |
| Revenue by currency / stage | Live deals |
| Sales funnel | Live company/contact/lead/deal counts |
| Email funnel | Live email analytics (empty if no sends) |
| Lead quality | Live scoring fields + leaderboards |
| Campaign / automation panels | Live modules |
| Activity feed | Live `activity_events` |
| Needs attention / recommendations | Derived from live signals |
| Companies without contacts | Placeholder note (join aggregate deferred) |
| Deals by country | Empty until deal↔country join exists |
| Category company counts | Category list live; counts may be 0 until join |
| Scheduled report email | Schema only |

## Performance

- Parallel server fetches
- Head count queries for totals
- Caps on row selects (≤2000 leads/deals)
- CSS bar charts (no new chart library)
- Lower sections are plain cards (no heavy client recalculation)

## Tests

```bash
node --experimental-strip-types --test src/lib/crm/executive-analytics/calculations.test.ts
```

Covers currency grouping, period comparison edge cases, funnel conversion, distributions.

## Extension points

- Wire LLM summary behind adapter using the same grounded facts payload
- Scheduled reports via `schedule_cron` / `schedule_enabled`
- Deal country / category count SQL views
- Lazy-load secondary sections behind Suspense boundaries
- Manager team scopes when team RBAC lands

## Known limitations

- Email analytics may require service client / migrations; failures surface as notices
- Source attribution uses `crm_leads.source` only — Unknown when unset
- Average time between funnel steps not yet computed (needs event chronology)
- PDF export not added (no existing PDF pipeline)
