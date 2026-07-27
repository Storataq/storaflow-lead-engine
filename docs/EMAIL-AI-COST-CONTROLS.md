# Email AI Cost Controls

## Tracking

Every generation attempts to write `email_ai_usage` with tokens, estimated USD cost, duration, and status.

## Limits

Organization settings:

- Monthly / daily budget
- Per-user daily limit
- Per-generation token limit
- Maximum variants

When a hard limit is hit, generation is blocked; the rest of the email engine continues to work.

## Rate limiting

Max ~10 generations per user per minute (idempotent duplicates within a 5-minute fingerprint window reuse the prior result).

## Env

`EMAIL_AI_MONTHLY_BUDGET`, `EMAIL_AI_MAX_OUTPUT_TOKENS`, `EMAIL_AI_MAX_RETRIES`
