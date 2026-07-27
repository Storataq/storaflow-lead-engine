# Advanced CRM & Sales Pipeline (Phase 25C)

Extends the existing CRM funnel (Phase 00008) into an AI-ready sales CRM with configurable pipelines, deal Kanban, forecast, win/loss analysis, and automation outbox — without redesigning leads, opportunities, or email.

Related: [architecture.md](./architecture.md), [contact-intelligence.md](./contact-intelligence.md), [company-intelligence.md](./company-intelligence.md).

## Principles

- Extend `crm_pipelines`, `crm_funnel_stages`, `crm_deals`, `crm_tasks`
- Keep lead Kanban; add **Deals board** as a second view
- Deterministic NBA + weighted forecast; AI providers can plug in later
- Automation-ready via `crm_automation_events` outbox

## Migration

`supabase/migrations/20260726000028_advanced_sales_pipeline.sql`

Run manually after `00027`. Adds:

| Area | Changes |
|------|---------|
| Pipelines | `is_archived`, `archived_at` |
| Stages | `probability` (0–100) + slug backfill |
| Deals | description, probability, expected_revenue, priority, tags, primary_contact_id, closed_at, won/lost reasons, competitor, close_notes, last_stage_changed_at |
| Tasks | `task_type` (call, meeting, email, follow_up, demo, proposal, reminder, internal) |
| History | `crm_deal_stage_history` |
| Catalog | `crm_close_reasons` (won/lost) |
| Automation | `crm_automation_events` |

## Pipeline model

```
Organization
  └─ crm_pipelines (Sales, Enterprise, Partners, Renewals, Customer Success, …)
        └─ crm_funnel_stages (name, color, sort_order, probability, is_won/is_lost)
              └─ crm_deals (value × probability → expected/weighted revenue)
                    ├─ crm_deal_stage_history (timeline)
                    ├─ crm_tasks (typed)
                    └─ activity_events + crm_automation_events
```

## Deal lifecycle

1. Create deal (pipeline + stage + optional lead)
2. Move on Kanban (`moveDealStageAction`) → history + activity + automation event
3. Edit fields / add tasks
4. Close won/lost with reason (`closeDealAction`) → analysis dashboards

Weighted revenue = `deal.value × coalesce(deal.probability, stage.probability) / 100`.

## UI routes

| Route | Role |
|-------|------|
| `/crm/pipeline` | Leads board (existing) |
| `/crm/pipeline?view=deals` | Deal Kanban (dnd-kit) |
| `/crm/pipelines` | Create / edit / archive pipelines |
| `/crm/funnels` | Create / rename / reorder stages + probability |
| `/crm/deals` | Filtered deal list + create |
| `/crm/deals/[id]` | Detail, timeline, NBA, close, tasks |
| `/crm/analytics` | Forecast + win/loss + stage distribution |
| `/crm` | Dashboard widgets include weighted / monthly forecast |

## Package

`src/lib/crm/pipeline/`

- `constants.ts` — priorities, task types, close reasons, probability helpers
- `forecast.ts` — pipeline analytics / forecast
- `nba.ts` — deal next-best-action suggestions
- `automation.ts` — outbox emitter

Actions added in `src/lib/crm/actions.ts`: update/archive pipeline, update/reorder stage, update/move/close deal.

## Future extension points

Automation event types: `stage_changed`, `deal_won`, `deal_lost`, `task_overdue`, `deal_inactive`, `large_opportunity`.

Workers can poll `crm_automation_events where processed_at is null`.

NBA can later call the shared AI provider used by company/contact intelligence while keeping deterministic fallbacks.
