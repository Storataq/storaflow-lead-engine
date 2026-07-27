# Billing & Subscription Management (Phase 26F)

Org-scoped SaaS billing for Storaflow: trials, plans, seats, usage limits, invoices, Stripe scaffolding, white-label licensing, and financial metrics.

## Architecture

```
UI /billing/*
  → server actions (RBAC: billing manage)
  → billing_subscriptions / invoices / seats / notifications

Limit checks (any feature)
  → evaluateOrgLimit / evaluateOrgFeature (queries)
  → checkLimit / checkFeature (limit-engine)
  → billing_plan_limits / billing_plan_features (DB catalog)

Stripe
  → createCheckoutSessionScaffold / portal scaffold
  → POST /api/webhooks/billing/stripe → billing_stripe_events
```

Never store raw payment card data. Provider-hosted Checkout / Customer Portal only.

## Subscription engine

| Plan tier | Codes (seeded) |
|-----------|----------------|
| Free Trial | `free_trial` |
| Starter | `starter_month`, `starter_year` |
| Professional | `professional_month`, `professional_year` |
| Business | `business_month`, `business_year` |
| Enterprise | `enterprise` (custom contract) |
| White Label | `white_label` (partner / reseller) |

Subscriptions are **1:1 per organization**. Fields cover trial windows, seats, scheduled downgrades, Stripe IDs, reseller org, and `contract_json`.

## Feature limit engine

Central API:

- `checkLimit(def, current, delta)` — soft/hard, warning %, upgrade suggestion
- `checkFeature(key, enabled)`
- `evaluateOrgLimit(orgId, key, delta)` / `evaluateOrgFeature(orgId, key)`
- `assertLimitOrThrow(result)`

**Do not** scatter plan checks in feature modules — always call the engine.

Limit keys: users, companies, contacts, campaigns, AI requests, API calls, automations, storage.  
Feature flags: marketplace, copilot, analytics, white_label, api_access, priority_support, automations.

## Billing dashboard (`/billing`)

Shows current plan, cycle, renewal, seats, usage widgets, invoices/payment summary, notifications, and MRR/ARR scaffold. Sub-routes: plans, usage, invoices, seats, add-ons, portal.

## Stripe integration

Env: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`.

Scaffold helpers in `src/lib/billing/stripe.ts` prepare Checkout, Customer Portal, and webhook verification. Replace scaffolds with `stripe.checkout.sessions.create` / `billingPortal.sessions.create` / `webhooks.constructEvent` when going live.

## Usage tracking

`computeOrgUsage` aggregates org counts (members, companies, contacts, campaigns, automations, API usage). Snapshots table `billing_usage_snapshots` is ready for period metering and future usage-based billing / bandwidth.

## White-label billing

`reseller_organization_id` + `contract_json` on subscriptions support partner billing, reseller pricing, and tenant licensing.

## API

`GET /api/v1/billing` — scope `billing:read` — subscription, features, limits/usage.

## RBAC

Security resource `billing`: owners/admins `view` + `manage`. Server actions gate on `billing:manage`. RLS uses `is_org_member` / `is_org_owner_or_admin`.

## Migration

`supabase/migrations/20260726000039_billing_subscription_management.sql` — **manual**, after `00038`. Additive only.

## Future extension points

- Live Stripe SDK + Apple Pay / Google Pay / bank transfer
- Usage-based billing meters + bandwidth
- Floating seats
- LTV / churn / expansion dashboards (scaffold metrics present)
- Multi-provider payment adapters
- Coupon catalog admin UI
