# AI Orchestrator & Multi-Agent Collaboration (Phase 27H)

Central brain of the Storaflow AI Agent Platform (Phase 27A).

## Architecture

```
Natural language goal
    ↓
Goal Planner (intent + subtasks + dependencies)
    ↓
Agent Selection Engine
    ↓
Parallel / sequential multi-agent execution
    ↓
Result merge + conflict resolution
    ↓
Executive summary + approvals + audit
```

Agent slug: `storaflow-orchestrator-agent`.

Domain: `src/lib/orchestrator/`  
UI: `/orchestrator/*`  
Migration: `supabase/migrations/20260726000048_ai_orchestrator_platform.sql` (manual; after 00047).

## Tables

| Table | Purpose |
| --- | --- |
| `orchestrator_org_settings` | Autonomy, approval policy, model router, cost limits |
| `orchestrator_goals` | Natural-language goals + detected intent |
| `orchestrator_plans` | Versioned step graphs + parallel groups |
| `orchestrator_executions` | Live/completed workflow runs + merged reports |
| `orchestrator_tasks` | Per-agent tasks (status, retries, timeouts) |
| `orchestrator_approvals` | Human-in-the-loop gates |
| `orchestrator_agent_messages` | Inter-agent context / handoff / results |
| `orchestrator_history_events` | Full audit trail |
| `orchestrator_bulk_jobs` | Bulk goal runs |

## Engines

- **Planner** `planner.ts` — intent detection, agent selection, dependency/parallel planning
- **Cost / recovery** `cost.ts` — cheapest/fastest/best model routing, retry, fallback agent/model
- **Merge** `merge.ts` — dedupe, conflict resolution, executive summary
- **Engine** `engine.ts` — submit goal → plan → execute → approve → merge → memory

## Collaborating agents

Prospecting, Sales, Marketing, Customer Success, Revenue Intelligence, Kernel Copilot.

## Human-in-the-loop

Pause, resume, cancel, restart, approve, reject. Approval policies: auto, manual, multi, workflow, critical, semi/fully autonomous.

## Security

Tenant RLS on all tables, owner/admin settings writes, permission-scoped agent registration, GDPR-aware memory scopes (`workflow`).

## Tests

```bash
node --experimental-strip-types --test src/lib/orchestrator/orchestrator.test.ts
```
