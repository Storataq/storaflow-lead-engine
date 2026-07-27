# Storaflow AI Copilot (Phase 25H)

Platform assistant for natural-language search, insights, recommendations, email drafts, and **confirmation-gated** actions — not a free-form chatbot that mutates data silently.

## Goals

- Understand companies, contacts, CRM, deals, pipelines, campaigns, email, tasks, automations, scoring, intelligence, analytics
- Answer read-only questions immediately via org-scoped tools
- Propose writes with preview + explicit confirm
- Maintain conversation context (filters, last entities, multi-step workflows)
- Reuse Phase 21K `createAIProvider()` (OpenAI today; multi-provider ready)
- Stream progressive responses over SSE

## Architecture

```
Floating / sidebar / docked / fullscreen UI (AiCopilotShell)
        │
        ├─ POST /api/internal/copilot/chat  (SSE streaming)
        │         └─ runCopilotTurn()
        │
        └─ sendCopilotMessageAction / confirmCopilotActionAction
                  │
                  ├─ intent.parseCopilotQuery (deterministic)
                  ├─ tools.* (Supabase org queries)
                  ├─ optional LLM enrichment (email/ai provider)
                  └─ persistence: copilot_conversations / messages / action_runs
```

Package: `src/lib/copilot/`

| File | Role |
|---|---|
| `constants.ts` | Modes, intents, actions, starters, voice/provider future hooks |
| `intent.ts` | NL → intent + filter extraction + context merge |
| `tools.ts` | Search companies/leads/contacts/deals/tasks/campaigns + insights |
| `engine.ts` | Turn orchestration + email drafts + optional LLM polish |
| `queries.ts` | Conversation/message persistence |
| `actions.ts` | Server actions; `confirmed: true` required for mutations |

## Conversation flow

1. User message (FAB, panel, or dashboard prompt)
2. Parse intent + merge prior filters (context memory)
3. Run read tools for the active organization only
4. Build reply + optional action proposals
5. Optionally enrich wording via AI provider when enabled
6. Stream tokens to UI; persist messages when migration applied

## Confirmation flow

- Read-only: execute immediately
- Mutating proposals (`COPILOT_MUTATING_ACTIONS`): UI shows preview → user confirms → `confirmCopilotActionAction({ confirmed: true })`
- Confirmed actions audit to `copilot_action_runs` and hand off to existing module routes (no silent CRM writes in 25H)

## UI modes

| Mode | Behavior |
|---|---|
| Floating | FAB + resizable panel |
| Sidebar | Larger floating panel |
| Docked | Right edge full height |
| Fullscreen | Overlay workspace |

Mounted globally in `src/app/(app)/layout.tsx` beside `<Toaster />`.  
Dashboard: `/copilot`.

## Migration

Apply manually after 25G:

`supabase/migrations/20260726000033_ai_copilot.sql`

Tables: `copilot_conversations`, `copilot_messages`, `copilot_prompts`, `copilot_action_runs`.

## Providers & voice (future-ready)

- Providers: OpenAI (live via 21K), Anthropic / Google / Azure / self-hosted / local listed in `FUTURE_AI_PROVIDERS`
- Voice: `FUTURE_VOICE_CAPABILITIES` reserved (input/output/STT/TTS) — not implemented in 25H

## Safety

- Org ID always from authenticated session
- Conversations RLS: owner user only within org
- AI never claims it already sent mail or changed CRM
- Bulk proposals always show preview JSON

## Extension points

- Wire confirmed actions to existing create/update server actions with `confirmed: true`
- True token streaming from provider (`stream: true`) behind the same SSE contract
- Voice capture component calling STT → `sendCopilotMessageAction`
- Org-shared prompt library in `copilot_prompts`

## Known limitations

- Confirmed mutations hand off to module UIs rather than fully executing every CRM write inline
- LLM enrichment requires `EMAIL_AI_ENABLED` + `OPENAI_API_KEY`
- Persistence degrades gracefully until migration `00033` is applied
