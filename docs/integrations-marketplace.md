# Integrations Marketplace (Phase 25I)

Related: [architecture.md](./architecture.md), [roadmap.md](./roadmap.md),
[future-integrations.md](./future-integrations.md), [ai-copilot.md](./ai-copilot.md).

## Purpose

Scalable third-party Integrations Marketplace for Storaflow. Users browse, connect,
configure, sync, and disconnect services without custom development per org.
Lead-discovery **Connectors** (`/connectors`) remain separate.

## Architecture

| Layer | Location |
| --- | --- |
| Plugin catalog (manifests) | `src/lib/integrations/catalog.ts` |
| Plugin registry / sync stubs | `src/lib/integrations/registry.ts` |
| OAuth 2.0 + PKCE helpers | `src/lib/integrations/oauth.ts` |
| AES-GCM credential crypto | `src/lib/integrations/crypto.ts` |
| Sync engine (queue/retry/classify) | `src/lib/integrations/sync-engine.ts` |
| Webhook sign/verify + backoff | `src/lib/integrations/webhooks.ts` |
| Server actions (RBAC) | `src/lib/integrations/actions.ts` |
| Queries (no ciphertext to clients) | `src/lib/integrations/queries.ts` |
| Copilot bridge | `src/lib/integrations/copilot-bridge.ts` |
| UI | `/integrations`, `/integrations/[code]`, `/integrations/sync-history` |
| OAuth callback | `POST/GET /api/integrations/oauth/callback` |
| Incoming webhooks | `POST /api/integrations/webhooks/[code]` |
| Sync worker | `POST /api/internal/integrations/sync-worker` |

Catalog entries are **code manifests** (hundreds-ready). Persistence is org
connections, encrypted credentials, sync runs/events, webhooks, and audit.

## OAuth flow

1. Owner/admin clicks **Connect** → `connectIntegrationAction`
2. Connection row created (`pending_auth` or `connected` for API key)
3. Authorize URL built when `INTEGRATION_*_CLIENT_ID` is set (PKCE when required)
4. Provider redirects to `/api/integrations/oauth/callback`
5. Code exchanged; access/refresh tokens encrypted via AES-256-GCM
6. Connection marked healthy; audit event written
7. Tokens are **never** returned to the browser

Refresh tokens: `refreshAccessToken` in `oauth.ts`. Re-authorize via marketplace UI.

## Sync engine

Supports modes: `manual`, `scheduled`, `incremental`, `full`, `webhook`.

Flow: enqueue `integration_sync_runs` → `processSyncRun` → plugin `sync` adapter
→ update connection health / last_synced / next_sync → sync events for warnings/errors.

Error classification: expired token, missing permissions, rate limits, timeouts,
API errors, connection lost, invalid credentials, conflicts.

Adapters today are **stubs** (scaffolding OK) until provider SDKs are wired.

## Security model

- Credentials stored only as ciphertext (`integration_credentials`)
- Key: `INTEGRATIONS_ENCRYPTION_KEY` (falls back to tracking secret / dev hash)
- RLS: members can read connection/sync metadata; owners/admins manage writes
- Credential table: owner/admin only
- Audit: `integration_audit_events` on install/disconnect/test/configure/OAuth
- Internal worker secured by `INTEGRATIONS_INTERNAL_SECRET`
- Webhooks: HMAC signature validation scaffolding + delivery logs

## RBAC

Only org **owner** / **admin** may:

- Install / remove integrations
- Manage credentials & configuration
- Run synchronization / tests / re-authorize

Members can browse the marketplace and view connection/sync status.

## Plugin system

1. Add `IntegrationManifest` to `catalog.ts`
2. Optionally `registerIntegrationPlugin({ manifest, sync, buildAuthorizeUrl })`
3. UI and sync engine pick it up automatically — no marketplace redesign

## Copilot

Connected services are summarized via `listConnectedIntegrationsForCopilot`.
Natural language proposals:

- “Export this list to HubSpot.” → `export_to_hubspot` → `/integrations/hubspot`
- “Create Google Calendar meeting.” → `create_calendar_event`
- “Upload proposal to Google Drive.” → `upload_to_drive`
- “Notify Slack.” → `notify_slack`

Confirmation still required; execution hands off to the integration detail page.

## Migration

Run manually (do not auto-execute):

`supabase/migrations/20260726000034_integrations_marketplace.sql`

After `20260726000033_ai_copilot.sql`.

## Future extension points

- Live provider sync adapters (HubSpot contacts, Slack chat.postMessage, etc.)
- Scheduled sync cron claiming `next_sync_at` / queued runs
- Outgoing webhook dispatcher with retry queue
- Per-integration settings schemas + UI forms
- Multi-account OAuth already modeled via `external_account_id`
- Service-role-only credential decryption paths for workers
