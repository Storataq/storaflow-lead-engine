# AI Lead Scoring Engine (Phase 25E)

Explainable, weighted lead scoring across CRM leads — extending Company Intelligence, Contact Intelligence, Campaign Ready, and pipeline automation without replacing them.

Related: [company-intelligence.md](./company-intelligence.md), [contact-intelligence.md](./contact-intelligence.md), [advanced-sales-pipeline.md](./advanced-sales-pipeline.md), [architecture.md](./architecture.md).

## Principles

- Overall score **0–100** with configurable category weights
- Transparent **why** explanations + risk factors + next-best actions
- Continuously recalculated (manual, batch, background fingerprint cache)
- Denorm onto `crm_leads` (+ open deals) for Kanban / filters / campaigns
- Automation-ready via `lead_scoring_alerts` + `crm_automation_events`

## Migration

`supabase/migrations/20260726000030_ai_lead_scoring_engine.sql`

Run manually after `00029`.

| Area | Changes |
|------|---------|
| `crm_leads` | `ai_lead_score`, classification, opportunity band/confidence, risk, buying readiness, scored_at, delta |
| `crm_deals` | `lead_ai_score`, `lead_score_classification` |
| Settings | `lead_scoring_settings` (weights, ranges, automation triggers) |
| Profiles | `lead_scoring_profiles` (category + sub-scores JSON) |
| History | `lead_scoring_history` |
| Alerts | `lead_scoring_alerts` |

Classic `crm_leads.lead_score` is synced to the rounded AI overall score on recalculation so existing UI keeps working.

## Scoring categories (weighted)

Website Quality, Website Technology, SEO, Social Presence, Business Completeness, Contact Completeness, Decision Makers, Industry Match, Company Size, Revenue Estimate, Employee Estimate, Geographic Region, Activity, Email Engagement, Campaign Engagement, CRM Activity, Historical Success, Review Reputation, Growth Signals, AI Confidence.

## Sub-scores

Website, Contact, Company, Marketing, Sales, Engagement, Growth, Relationship.

## Classification

| Band | Default |
|------|---------|
| Very Hot | ≥ 85 |
| Hot | ≥ 70 |
| Warm | ≥ 50 |
| Cold | ≥ 30 |
| Very Cold | &lt; 30 |

Also: Opportunity (Very High → Very Low), Risk score, Buying readiness (Ready Now / Soon / Researching / Unknown / Long Term).

## Calculation flow

```
crm_leads + company intelligence + contacts + campaign_readiness + CRM activity
        │
        ▼
collectLeadScoringSignals()
        │
        ▼
computeLeadScore(weights, ranges)  ← deterministic v1
        │
        ▼
applyLeadScoringResult()
  ├─ upsert lead_scoring_profiles
  ├─ insert lead_scoring_history
  ├─ denorm crm_leads (+ sync lead_score)
  ├─ mirror open crm_deals
  ├─ lead_scoring_alerts
  └─ crm_automation_events (enrollment/tasks/notify hooks later)
```

## Package

`src/lib/crm/lead-scoring/`

- `constants.ts` — categories, bands, colors, automation event codes
- `signals.ts` — multi-source signal collector
- `score.ts` — weighted engine
- `settings.ts` — org config
- `generate.ts` / `apply.ts` / `background.ts`
- `actions.ts` / `queries.ts`

## UI

| Route | Role |
|-------|------|
| `/crm/scoring` | Leaderboards, alerts, filters |
| `/crm/scoring/settings` | Weights + thresholds + automation flags |
| `/crm/leads/[id]` | Score cards, explanations, NBA, history |
| Lead / Deal Kanban | `LeadScoreBadge` |

Campaign audience supports `leadScoreMin` on `CampaignAudienceDefinition`.

## Future AI models

- Optional LLM enrichment of explanations / NBA (provider plug-in)
- Per-industry weight packs
- Automatic campaign enrollment / task creation / owner assignment / pipeline move when automation trigger flags are enabled
- Company- and contact-entity profiles (`entity_type`) already supported in schema

## Extension points

1. Enable workers on `crm_automation_events` where `event_type like 'lead_%'`
2. Call `maybeRecalculateLeadScoreInBackground` after enrichment / intelligence refresh
3. Sync company entity profiles when company intelligence completes
