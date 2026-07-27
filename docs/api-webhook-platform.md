# API & Webhook Platform (Phase 26B)

Related: [architecture.md](./architecture.md), [roadmap.md](./roadmap.md),
[integrations-marketplace.md](./integrations-marketplace.md).

## Purpose

Secure, versioned REST API (`/api/v1`) plus outbound customer webhooks.
Backbone for partners, mobile apps, and future SDKs. Distinct from Integrations
Marketplace connector OAuth (`/integrations`).

## Architecture

| Layer | Path |
| --- | --- |
| Constants / scopes / events | `src/lib/platform-api/constants.ts` |
| Auth + rate limits | `auth.ts`, `rate-limit.ts`, `keys.ts` |
| Responses / list query | `responses.ts` |
| Event bus + outbox | `event-bus.ts` |
| Webhook sign / deliver | `webhook-security.ts`, `delivery.ts` |
| Resources | `resources.ts` |
| OpenAPI | `openapi.ts` |
| Management actions / queries | `actions.ts`, `queries.ts` |
| UI | `/api-management/*` |
| REST | `/api/v1/*` |
| Worker | `/api/internal/platform/webhook-worker` |

## Authentication

- Bearer `sf_live_…` or `X-API-Key`
- SHA-256 hash stored; plaintext shown once
- Scopes: read_only / read_write / admin / custom
- Org boundary enforced via key → `organization_id`
- Owner/admin manage keys in UI; API never trusts client org IDs

## Authorization & scopes

Granular scopes (`companies:read`, `deals:write`, …). Write implies read for the
same resource. `*` grants full access.

## Webhooks

Events: company/contact/deal/campaign/automation/task lifecycle + lead score.
Signed: `timestamp.body` HMAC-SHA256. HTTPS-only by default. Retry with
exponential backoff. IP allowlist JSON ready; timestamp tolerance for replay
protection.

## Rate limits

Per-key per-minute (in-memory) + per-day (DB `platform_api_usage_daily`).
429 + `Retry-After` + `X-RateLimit-*`.

## Security

- No key hashes or webhook ciphertext in UI selects
- Audit: key create/revoke/rotate, webhook changes
- Service role only for public API handlers
- Consistent error envelope with `requestId`

## Future extension points

- Cursor pagination consumers
- Background bulk job worker
- Auto-generate SDKs from OpenAPI (`SDK_TARGETS`)
- Wire CRM mutations to `publishPlatformEvent` everywhere
- v2/v3 with Sunset headers

## Migration

`supabase/migrations/20260726000035_api_webhook_platform.sql` (manual)
