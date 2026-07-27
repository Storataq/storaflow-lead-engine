# AI Revenue Intelligence Agent (Phase 27G)

Production financial intelligence on the Phase 27A AI Agent Platform.

## Architecture

```
/revenue UI
    ↓
src/lib/revenue-intelligence/*  (kpis, forecast, insights, scenarios, engine, actions)
    ↓
crm_deals + billing_subscriptions/invoices + companies
    ↓
src/ai agents registry (storaflow-revenue-intelligence-agent)
```

Agent slug: `storaflow-revenue-intelligence-agent`.

## Migration

`supabase/migrations/20260726000047_ai_revenue_intelligence_agent.sql` (manual; after 00046).

| Table | Purpose |
| --- | --- |
| `revenue_intel_org_settings` | Horizon, provider/model, autonomy |
| `revenue_intel_snapshots` | KPI pack (MRR/ARR/LTV/CAC/NRR/…) |
| `revenue_intel_forecasts` | Multi-horizon forecasts |
| `revenue_intel_scenarios` | What-if simulations |
| `revenue_intel_insights` | Financial insights |
| `revenue_intel_recommendations` | Executive advice |
| `revenue_intel_alerts` | Revenue/MRR/pipeline/churn alerts |
| `revenue_intel_reports` | CEO/Board/Investor/… markdown (PPT/PDF/Excel ready) |
| `revenue_intel_history_events` | Audit |
| `revenue_intel_bulk_jobs` | Bulk analyse/forecast/reports |

## Engines

- **KPI** `kpis.ts` — MRR, ARR, ACV, ARPA, LTV, CAC, LTV/CAC, gross/net, expansion/contraction, NRR/GRR, margin, profit, growth
- **Pipeline** `forecast.ts` — open, weighted, likely, risk, missed, expected closings
- **Forecast** week → five year with confidence
- **Growth / churn / expansion** `insights.ts`
- **Scenarios** more customers, less churn, price lift, hire, market, product, AI agent
- **Reports** executive markdown packs

## UI

`/revenue` tabs: Overview, Revenue, Forecast, Pipeline, Customers, Growth, MRR, ARR, Churn, Expansion, Reports, Insights, History, Settings.

Nav: **AI Revenue** (`TrendingUp`).

## Tests

```bash
node --experimental-strip-types --test src/lib/revenue-intelligence/revenue-intelligence.test.ts
```
