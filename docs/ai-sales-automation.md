# AI Sales Automation Engine (Phase 25F)

No-code sales automations that react to CRM, scoring, intelligence, and campaign events — without redesigning those modules.

## Goals

- Visual workflow builder (drag blocks, zoom/pan)
- Event → condition → action execution with delays/branches
- Templates + AI suggestions
- Run history, step logs, dashboard widgets
- RBAC (owner/admin manage; members read)
- Queue-ready processor with idempotent runs and retries
- Future channels: SMS, WhatsApp, LinkedIn, push, voice, webhooks, marketplace

## Migration

Apply manually after lead scoring:

`supabase/migrations/20260726000031_ai_sales_automation_engine.sql`

| Table | Role |
|---|---|
| `crm_automations` | Definition + enabled flag + graph JSON |
| `crm_automation_versions` | Immutable version snapshots |
| `crm_automation_runs` | Execution instances + status/duration |
| `crm_automation_run_logs` | Per-step logs |
| `crm_automation_templates` | Org/custom templates (system templates in app code) |

Extends existing `crm_automation_events` outbox (adds owner/admin **update** for `processed_at`).

## Domain package

`src/lib/crm/automation/`

| File | Role |
|---|---|
| `constants.ts` | Blocks, triggers, conditions, actions, statuses, future channels |
| `graph.ts` | Empty/parse/linear graph helpers |
| `templates.ts` | System templates + AI suggestion recipes |
| `conditions.ts` | Context evaluation |
| `executor.ts` | Run executor (actions simulated in 25F; extension points logged) |
| `processor.ts` | Polls outbox, matches active automations, idempotent enqueue |
| `queries.ts` | List/get + dashboard widgets |
| `actions.ts` | Server actions (RBAC) |

## Workflow engine

Graph JSON shape:

```json
{
  "nodes": [{ "id": "...", "type": "trigger|condition|delay|action|decision|split|merge|exit|end|start|loop", "x": 0, "y": 0, "data": {} }],
  "edges": [{ "id": "...", "source": "...", "target": "...", "label": "yes|no|default" }]
}
```

Block types: Start, Trigger, Condition, Delay, Action, Decision, Split, Merge, Exit, End (Loop reserved).

## Execution model

1. Domain code emits into `crm_automation_events` (pipeline, scoring, etc.).
2. `processPendingAutomationEvents` claims unprocessed events.
3. Matching `enabled` + `active` automations create a run with `idempotency_key = automationId:eventId`.
4. `executeAutomationRun` walks the graph, evaluates conditions, simulates/records actions, writes logs.
5. Run status: queued → running → completed | failed | cancelled.

Phase 25F **simulates** side-effects (assign owner, send email, Slack, etc.) and records executed actions for audit. Real CRM/email mutations are extension points in `executor.ts`.

## Triggers / conditions / actions

See `constants.ts` for the full catalogs matching the Phase 25F master prompt (company/contact/deal/task/campaign/email/AI events; lead/health/pipeline filters; assign/task/email/enroll/notify/AI refresh; Slack/Teams/webhook/export marked ready).

## Templates

App-seeded codes: `hot_lead`, `new_company`, `cold_lead`, `re_engagement`, `proposal_follow_up`, `lost_deal`, `won_deal`, `inactive_company`, `new_decision_maker`, `website_updated`.

## UI routes

| Route | Purpose |
|---|---|
| `/crm/automations` | Dashboard + filters + templates + queue |
| `/crm/automations/new` | Create |
| `/crm/automations/[id]` | Edit + versions + recent runs |
| `/crm/automations/runs/[id]` | Run detail + logs |

Nav: CRM → Automations.

## Permissions

| Capability | Roles |
|---|---|
| View list/runs/logs | Org members |
| Create / edit / enable / disable / archive / run / process queue | Owner, admin |

Enforced in server actions + RLS write policies.

## Extension points

- Wire simulated actions to CRM task/deal/email APIs
- Background worker claiming `crm_automation_runs` where `status = 'queued'`
- Delay nodes via scheduled wake-ups
- Channel adapters behind `channel_plan_json` / `FUTURE_CHANNELS`
- Marketplace template packs into `crm_automation_templates`
- Live condition fields from company/contact intelligence payloads

## Related

- Outbox emitter: `src/lib/crm/pipeline/automation.ts` (25C)
- Lead scoring alerts → outbox (25E)
- Campaign builder canvas patterns (25D) reused for visual builder
