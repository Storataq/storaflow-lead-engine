# AI Email Campaign Builder (Phase 25D)

Extends the existing Campaign Manager, Sequence Engine, Template Engine, and Email AI modules with a visual AI campaign builder — without replacing Resend, queue, or execution.

Related: [CAMPAIGN-MANAGER.md](./CAMPAIGN-MANAGER.md), [SEQUENCE-ENGINE.md](./SEQUENCE-ENGINE.md), [EMAIL-AI-ARCHITECTURE.md](./EMAIL-AI-ARCHITECTURE.md), [architecture.md](./architecture.md), [future-integrations.md](./future-integrations.md).

## Principles

- **Additive only** — classic wizard and campaign detail remain
- **Graph is layout** — `workflow_graph_json` is a visual companion; execution source of truth remains sequence `steps_json` when a sequence is linked
- **Reuse AI** — drafts via existing `generateEmailAIAction` / `runAIGeneration`
- **Compliance unchanged** — unsubscribe, consent, footer, reply address stay in preferences / sender profiles
- **Multi-channel ready** — `email_campaign_channel_plans` stub for SMS / WhatsApp / LinkedIn / push / in-app

## Migration

`supabase/migrations/20260726000029_ai_email_campaign_builder.sql`

Run manually after `00028`. Adds:

| Area | Changes |
|------|---------|
| Campaigns | `builder_mode`, `workflow_graph_json`, `calendar_metadata_json`, `ai_brief_json`, `scheduled_for`, `timezone`, `tags` |
| Sequences | `workflow_graph_json` on sequences + versions |
| A/B | `email_campaign_ab_tests`, `email_campaign_ab_variants`, `email_campaign_ab_assignments` |
| AI subjects | `email_ai_subject_scores` |
| Channels | `email_campaign_channel_plans` |

## Campaign architecture

```
email_campaigns (classic | ai_builder)
  ├─ workflow_graph_json          ← visual canvas (zoom/pan)
  ├─ ai_brief_json                ← purpose / audience / offer
  ├─ calendar_metadata_json       ← send windows / quiet hours
  ├─ sequence_id → steps_json     ← execution spine (unchanged)
  ├─ email_campaign_ab_tests
  │     └─ email_campaign_ab_variants
  ├─ email_ai_subject_scores
  └─ email_campaign_channel_plans (email enabled; others future)
```

## Workflow engine (builder)

Supported blocks: Start, Send Email, Wait, Delay, Condition, Decision, Split, Goal, Exit, End.

Wait units: hours, days, weeks, business days, specific date/time (timezone-aware metadata).

Automation trigger labels (condition configs): opened, clicked, no response, replied, bounced, unsubscribed, lead score increased, contact updated.

Mapping to sequence steps (when syncing later):

| Builder block | Sequence step |
|---------------|---------------|
| send_email | email |
| wait / delay | wait |
| condition / decision | condition |
| exit / end | end |

## AI components

| Component | Role |
|-----------|------|
| AI email generator | Reuses Phase 21K generation (`follow_up_email` / body / subject) |
| Subject optimizer | Deterministic scorer (+ optional persistence to `email_ai_subject_scores`) |
| Recommendations | Deterministic NBA-style tips on campaign detail / builder |
| Personalization | Merge fields documented in builder; rendering via existing template/personalization engines |

Subject scores estimate: open rate, spam risk, professional tone, urgency, personalization, overall.

## UI routes

| Route | Role |
|-------|------|
| `/email/campaigns/new/builder` | Create AI campaign |
| `/email/campaigns/[id]/builder` | Visual builder + AI tools + A/B |
| `/email/campaigns/calendar` | Calendar + performance dashboard |
| `/email/campaigns` | List with type/status/owner/tag filters + AI Builder entry |
| Classic wizard | Unchanged at `/email/campaigns/new/wizard` |

## Package

`src/lib/email/campaign-builder/`

- `constants.ts` — blocks, merge fields, waits, triggers, campaign types
- `graph.ts` — empty graph / parse / sequence→graph helper
- `scores.ts` — subject scoring + suggestions
- `recommendations.ts` — campaign tips
- `queries.ts` — A/B, scores, calendar widgets, filters
- `actions.ts` — save workflow, create AI campaign, optimize subjects, A/B draft

Components: `ai-campaign-builder`, `campaign-workflow-canvas`, `ai-subject-optimizer`, `multi-device-email-preview`, `campaign-calendar`, `campaign-builder-dashboard`.

## Template library

Existing templates + versioning remain. Categories extended with sales, marketing, support, announcement, seasonal (alongside follow-up / reminder / newsletter).

## A/B testing

Draft metadata for subject, content, CTA, sender name, send time. `auto_pick_winner` flag prepared; enrollment assignment table exists for a later execution hook. Does not alter Resend payload shape yet.

## Extension points

1. Sync canvas nodes ↔ sequence `steps_json` on save
2. Assign A/B variants at enrollment time
3. Enable non-email channels via `email_campaign_channel_plans`
4. Optional LLM enrichment of subject scores / recommendations

## Performance notes

- Canvas updates are local state; save is explicit
- Calendar / dashboard load campaigns once (limit 200)
- Template list caching remains in existing campaign queries
- Preview iframe is sandboxed and lazy to user interaction (mode toggle)
