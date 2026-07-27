# Email AI Reply Intelligence

## Deterministic layer (always)

`classifyReplyDeterministic` inspects subject/body for unsubscribe, complaint-like, OOO, meeting, not interested, interested, question.

High-impact codes prefer false-positive review and **never erase** deterministic unsubscribe/complaint results when AI is enabled.

## Optional AI layer

When `reply_classification_enabled` + env allow:

1. Run `reply_classification` generation
2. Store AI label + confidence + explanation separately
3. Set `final_classification` / `final_classification_source`
4. Suggest next actions with `human_approval_required=true`

## Reply drafting

`/email/ai/reply` drafts responses for review. There is **no** one-click send from AI.

## Next actions

Stored in `email_ai_next_action_suggestions`. Status starts as `suggested`. Phase 21K does not execute them.
