# AI Agent Platform (Phase 27A)
#
# Central kernel under `src/ai/` for all future StoraLabs agents.
# Multi-tenant, multi-provider, RLS-backed, event-driven.

## Architecture

```
UI /ai-platform/*  →  Server Actions / Queries  →  AI Kernel
                                              ↓
                         Planner → Task Queue → Tools → Model Router
                                              ↓
                         Memory / Context / Approvals / Costs / Events / Logs
```

Key modules:

| Path | Role |
|------|------|
| `src/ai/kernel` | Orchestrates a full run |
| `src/ai/agents` | Registry + lifecycle |
| `src/ai/planner` | Decompose work + dependencies |
| `src/ai/tasks` | Queues, retries, DLQ, worker |
| `src/ai/providers` | OpenAI / Anthropic / Gemini + failover |
| `src/ai/tools` | Tool registry + calling framework |
| `src/ai/memory` | Scoped memory store/recall/rank |
| `src/ai/context` | Org/user/CRM/knowledge bundle |
| `src/ai/approvals` | Autonomy levels |
| `src/ai/security` | Injection / PII / rate / permissions |
| `src/ai/knowledge` | RAG-ready corpus |
| `src/ai/prompts` | Versioned prompt library |
| `src/ai/workflows` | Multi-agent chains |
| `src/ai/costs` | Cost ledger |
| `src/ai/events` | Event bus |
| `src/ai/logging` | Execution history |
| `src/ai/monitoring` | Dashboard snapshot |

## Datamodel (migration `20260726000042_ai_agent_platform.sql`)

Tables (all org-scoped RLS unless noted):

- `ai_org_settings`
- `ai_agents`
- `ai_runs`
- `ai_tasks`
- `ai_memory_entries`
- `ai_knowledge_documents`
- `ai_prompt_templates`
- `ai_tool_definitions` (system tools may have `organization_id = null`)
- `ai_approvals`
- `ai_cost_ledger`
- `ai_events`
- `ai_execution_logs`
- `ai_workflows`

Apply **manually** after `00041`. Do not auto-run from the app.

## Agent lifecycle

`created → idle → planning → waiting|running|needs_approval → … → completed|failed|cancelled`

Transitions are enforced in `src/ai/agents/lifecycle-client.ts`.

## Planner & task engine

`buildExecutionPlan()` maps natural language to tool subtasks + a synthesize step.
Tasks land in `default` / `priority` / `retry` / `dead_letter` / `scheduled` queues.
Worker: `POST /api/internal/ai/worker-run` with header `x-ai-platform-secret`.

## Tool calling

System tools (seeded): CRM search, memory save/recall, knowledge search, analytics summary.
Each invoke validates input, checks permissions, applies timeout/retry, emits events.

## Model router & failover

Preferred provider first; on retryable failure, chain continues (default OpenAI → Anthropic → Gemini).
Env keys: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_AI_API_KEY` or `GEMINI_API_KEY`.

## Approval modes

`read_only` | `suggest` | `approval_required` | `semi_autonomous` | `fully_autonomous`

Effective mode = most restrictive of org + agent.

## Security

- Prompt injection / privilege escalation heuristics
- PII redaction
- Per-user rate limits
- Tool RBAC via agent `permissions_json`
- PostgreSQL RLS (`is_org_member` / `is_org_owner_or_admin`)

## API

- `GET /api/v1/ai` — overview (`ai:read` API key scope)
- GraphQL / MCP / Agent-to-Agent: extension flags returned; wrap the same query/kernel layer

## UI

`/ai-platform` with Overview, Agents, Tasks, Workflows, Memory, Context, Knowledge, Prompt Library, Tools, Providers, Costs, Logs, Security, Settings.

## Extensibility — future agents

Register via `registerAgent()` / UI without changing kernel:

1. Choose slug, tools, permissions, provider/model, approval mode
2. Optionally add a workflow chain referencing multiple agent slugs
3. Reuse planner, tools, memory, costs, events automatically

Examples: Sales, Marketing, Prospecting, Research, Customer Success, Revenue.

## Tests

```bash
node --experimental-strip-types --test src/ai/ai-platform.test.ts
```

## Ops env

```
AI_PLATFORM_INTERNAL_SECRET=
AI_PLATFORM_WORKER_ENABLED=true
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=
GEMINI_API_KEY=
```
