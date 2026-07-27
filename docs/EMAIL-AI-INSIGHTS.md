# Email AI Insights

AI insights **reuse Phase 21J metrics** via `buildEmailAnalyticsDashboard`. They do not recalculate metrics independently.

## Behavior

- Generated on demand (`Request new analysis`) — not on every page load
- Persisted to `email_ai_insights`
- Must keep sample size and data-quality warnings visible
- Must not claim causation (`causationClaimed` forced false)

## Route

`/email/analytics/insights`

Rule-based insights from the analytics service remain available without AI.
