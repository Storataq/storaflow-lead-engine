# Email Unsubscribe (Phase 21I)

## Flows

1. Footer link → `/unsubscribe/[token]`
2. Preference center → Unsubscribe from all
3. One-click → `POST /api/email/unsubscribe/one-click/[token]`
4. High-confidence inbound reply subject → automated global unsubscribe

## Processing

`processUnsubscribe` (idempotent):

1. Validate / resolve recipient
2. Update preference row
3. Upsert `email_suppressions` (respects precedence)
4. Stop enrollments + cancel future queue jobs
5. Sync recipient snapshot `suppression_status` on global unsubscribe
6. Write `email_unsubscribe_events`, `email_preference_events`, `email_events`, CRM activity

## Reasons (optional)

Stored after success; never required to complete unsubscribe.
