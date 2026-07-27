# Email Preference Center (Phase 21I)

Public, token-secured communication preference management for Storaflow recipients.

## Routes

| Route | Purpose |
|---|---|
| `/preferences/[token]` | Preference center (categories, frequency, pause, language, timezone) |
| `/unsubscribe/[token]` | Unsubscribe / pause / open preferences |
| `/preferences/resubscribe/[token]` | Explicit resubscribe confirmation |
| `POST /api/email/unsubscribe/one-click/[token]` | RFC-aligned one-click unsubscribe |

## Security

- Opaque DB token rows + HMAC-signed access tokens
- No organization ID / raw email in the public token claims
- Server-side resolution via service role
- Idempotent unsubscribe processing
- Mandatory suppressions (complaint, hard bounce, legal, do-not-contact) cannot be bypassed by preferences or resubscribe

## Environment

See `.env.example`:

- `EMAIL_PREFERENCE_TOKEN_SECRET`
- `EMAIL_PREFERENCE_BASE_URL`
- `EMAIL_PREFERENCE_TOKEN_TTL_DAYS`
- `EMAIL_ONE_CLICK_TOKEN_TTL_DAYS`
- `EMAIL_RESUBSCRIBE_TOKEN_TTL_HOURS`
- `EMAIL_LIST_UNSUBSCRIBE_ENABLED`
- `EMAIL_COMPANY_ADDRESS_REQUIRED`

## Migration

`supabase/migrations/20260726000019_email_preferences_and_suppression.sql` (manual).
