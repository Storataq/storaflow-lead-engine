# AI Customer Success Agent (Phase 27F)

Production Customer Success Manager on the Phase 27A AI Agent Platform.

## Architecture

```
/customer-success UI
    ↓
src/lib/customer-success/*  (health, churn, renewal, onboarding, upsell, engine, actions)
    ↓
companies + CRM deals/tasks/notes + billing_subscriptions
    ↓
src/ai agents registry (storaflow-customer-success-agent)
```

Agent slug: `storaflow-customer-success-agent` (auto-registered; enable/disable via settings → agent idle/paused).

## Migration

`supabase/migrations/20260726000046_ai_customer_success_agent.sql` (manual — do not auto-run).

Apply after `20260726000045_ai_marketing_agent.sql` (even if 27D UI is incomplete).

| Table | Purpose |
| --- | --- |
| `customer_success_org_settings` | Weights, churn threshold, renewal window, provider/model |
| `customer_success_profiles` | Per-company health, churn, adoption, upsell, timeline |
| `customer_success_plans` | Success plan milestones |
| `customer_success_renewals` | Contract end + renewal risk |
| `customer_success_onboarding` | Onboarding checklist progress |
| `customer_success_recommendations` | AI next actions |
| `customer_success_alerts` | Proactive warnings |
| `customer_success_history_events` | Audit trail |
| `customer_success_bulk_jobs` | Bulk analyse / plans |

All tables: org RLS via `is_org_member` / `is_org_owner_or_admin`.

## Engines

### Health
`health.ts` — weighted score from activity, adoption, support/tasks, NPS/CSAT hints, revenue, contract proximity, payment (billing past_due), task load → class Excellent…Critical/At Risk.

### Churn
`churn.ts` — probability, reason, confidence, actions, impact.

### Renewal
`renewal.ts` — contract end (won deal +1y / expected close / org billing period), probability, risk, tasks.

### Onboarding
`onboarding.ts` — profile, contacts, activity, data, intelligence, workflows, AI usage.

### Upsell / cross-sell
`insights.ts` — seats, AI credits, enterprise, modules, white-label, API, premium support + StorataQ suite products.

### Success plans
Week 1–3 + month 2–3 milestones with progress.

## CRM / billing integration

- Customers: `companies.status = 'customer'` (fallback: companies linked to won deals)
- Signals: contacts, leads, deals, tasks, notes
- Payment/seats: org `billing_subscriptions`
- Writes: CRM tasks (renewal / applied recommendations), CRM notes

## UI

`/customer-success` tabs: Overview, Customers, Health Scores, Success Plans, Renewals, Onboarding, Churn Risk, Upsell, Recommendations, History, Settings.

Nav: **AI Customer Success** (`HeartHandshake`).

## Security

Tenant isolation + RLS, admin-only settings, audit history, agent permissions on 27A registry.

## Tests

```bash
node --experimental-strip-types --test src/lib/customer-success/customer-success.test.ts
```

## Extensibility

- Health weights: `health_weights_json` in settings
- New upsell codes: `constants.ts` + `detectUpsell`
- New alert types: migration check + `buildAlerts`
