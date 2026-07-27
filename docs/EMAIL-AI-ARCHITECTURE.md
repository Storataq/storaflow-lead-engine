# Email AI Architecture (Phase 21K)

Related: [EMAIL-AI-WRITER.md](./EMAIL-AI-WRITER.md), [EMAIL-AI-REPLY-INTELLIGENCE.md](./EMAIL-AI-REPLY-INTELLIGENCE.md),
[EMAIL-AI-INSIGHTS.md](./EMAIL-AI-INSIGHTS.md), [EMAIL-AI-PRIVACY.md](./EMAIL-AI-PRIVACY.md),
[EMAIL-AI-COST-CONTROLS.md](./EMAIL-AI-COST-CONTROLS.md), [EMAIL-AI-SAFETY.md](./EMAIL-AI-SAFETY.md),
[AUTOMATED-EMAIL-ENGINE.md](./AUTOMATED-EMAIL-ENGINE.md).

## Goal

Optional, organization-scoped AI assistance for drafting, rewriting, classifying replies, and summarizing analytics. **AI assists humans. AI never autonomously sends mail, launches campaigns, activates sequences, or removes suppressions.**

## Flow

```
User request → Auth/org scope → Feature flags → Context allowlist
  → Prompt (versioned) → Provider abstraction → Structured JSON validation
  → Safety checks → Store generation + variants → Human review → Optional apply to draft
```

## Provider abstraction

- Interface: `AIProvider` in `src/lib/email/ai/types.ts`
- Implementations: `OpenAIEmailProvider`, `DisabledAIProvider`
- Registry: `createAIProvider()` — never call providers from UI components
- Future placeholders: Anthropic, Google, Azure OpenAI, self-hosted (not implemented)
- No automatic multi-provider failover

## Feature flags

Environment: `EMAIL_AI_ENABLED` (master)

Organization (`email_ai_settings`): writing, reply classification, reply drafting, analytics insights, translation, personalization, context enrichment.

`automatic_actions_enabled` is hard-locked **false** in code and UI.

## Persistence

Migration: `20260726000021_email_ai_intelligence.sql`

Tables: settings, brand voices, prompt templates/versions, generations, variants, usage, feedback, reply classifications, next-action suggestions, AI insights, context manifests, approval events.

## Routes

| Route | Purpose |
|---|---|
| `/settings/ai` | Feature toggles, budgets, brand voices |
| `/email/ai/history` | Generation audit |
| `/email/ai/reply` | Classify + draft reply |
| `/email/analytics/insights` | On-demand AI insights over 21J metrics |

## Manual setup

1. Apply migration `20260726000021_email_ai_intelligence.sql`
2. Set `EMAIL_AI_ENABLED=true` and `OPENAI_API_KEY=...`
3. Enable org toggles at `/settings/ai`
4. Redeploy so env vars are available to the server

## Known limitations

- Only OpenAI is implemented
- Human review remains mandatory
- AI may produce incorrect content
- Does not provide legal advice or deliverability guarantees
- Does not prove causation from analytics
