# AI Sales Agent (Phase 27C)

Production AI Sales Manager on top of the Phase 27A AI Agent Platform and alongside Phase 27B Prospecting.

## Architecture

```
/sales UI
    ↓
src/lib/sales-agent/*  (priority, risk, analysis, forecast, comms, engine, actions)
    ↓
CRM (crm_deals, crm_tasks, crm_notes) + sales_agent_* tables
    ↓
src/ai agents registry (storaflow-sales-agent)
```

Agent slug: `storaflow-sales-agent` (auto-registered; enable/disable via settings → agent status idle/paused).

## Migration

`supabase/migrations/20260726000044_ai_sales_agent.sql` (manual — do not auto-run).

| Table | Purpose |
| --- | --- |
| `sales_agent_org_settings` | Autonomy, provider/model, forecast/risk thresholds, working hours |
| `sales_agent_deal_insights` | Cached deal analysis (priority, risk, NBA, opportunities) |
| `sales_agent_daily_briefings` | Daily greeting + priority counts |
| `sales_agent_forecast_snapshots` | Month/quarter/year forecast history |
| `sales_agent_meeting_briefs` | Pre-meeting briefs + post-meeting summaries |
| `sales_agent_email_drafts` | Generated email templates |
| `sales_agent_history_events` | Audit trail |
| `sales_agent_bulk_jobs` | Bulk follow-up / analyze / assign / stage |

All tables: org RLS via `is_org_member` / `is_org_owner_or_admin`.

## Engines

### Priority engine
`src/lib/sales-agent/priority.ts` — deal value, closing date, lead score, last activity, open/overdue tasks, risk, business impact → `priority_score` 0–100.

### Risk engine
Stale contact, overdue tasks, expired close date, competitor, low probability + high value → `risk_level` low|medium|high|critical.

### Deal analysis
`analysis.ts` — closing probability, expected revenue, predicted close, obstacles, missed activities, coach tips, opportunities (upsell/cross-sell/renewal/…).

### Next best action
call, plan_demo, send_quote, send_reminder, book_meeting, ask_feedback, escalate, wait, send_email, follow_up.

### Forecast engine
`forecast.ts` — pipeline health, win rate, avg cycle, bottlenecks; month/quarter/year revenue + confidence + optional target hit probability.

### Follow-up / email / meeting
`comms.ts` + server actions — email templates, meeting briefs (questions/objections/solutions), meeting summary → CRM note + task + deal probability/close date update.

## CRM integration

- Reads open/won/lost deals, tasks, notes, stages
- Writes: tasks (follow-ups), notes (meeting summaries), deal probability/close date, bulk owner/stage updates
- Never invents pipeline data; operates on tenant-scoped CRM rows only

## UI

`/sales` tabs: Overview, Today's Priorities, Deals, Pipeline, Activities, Meetings, Forecast, Insights, Recommendations, History, Settings.

Nav: **AI Sales** (`Handshake`).

## Security

- Tenant isolation via `organization_id` + RLS
- Settings changes: owner/admin only
- Bulk assign: admin only
- Agent permissions registered on 27A agent row
- Audit via `sales_agent_history_events`

## Settings

Autonomy/approval mode, AI provider/model, forecast sensitivity, risk threshold, reminder frequency, working hours, timezone, rate limit.

## Extensibility

- New opportunity codes: `constants.ts` + `detectSalesOpportunities`
- New email templates: `EMAIL_TEMPLATE_TYPES` + `generateEmailDraft`
- Hook into AI platform bootstrap: `ensureSalesAgent` from `bootstrapAiPlatform`

## Tests

```bash
node --experimental-strip-types --test src/lib/sales-agent/sales-agent.test.ts
```
