# Email Threat Model (Phase 21L)

## Assets

Recipient emails, suppressions, campaign content, provider keys, tracking/preference secrets, AI keys, org analytics, reply content.

## Actors

Authenticated org members, org admins/owners, anonymous public token clients, provider webhooks, internal cron/workers, attackers.

## Priority threats & mitigations

1. **Cross-organization data access** — org_id from membership; RLS; service role only in trusted workers.
2. **Webhook forgery** — Resend/Svix verification; reject missing secret.
3. **Tracking redirect abuse** — resolve stored URL only; reject non-http(s).
4. **Queue duplicate / double send** — claim SKIP LOCKED; idempotency; ambiguous acceptance not blindly retried.
5. **Cron/worker abuse** — internal secret; timing-safe compare; kill switches.
6. **AI data leakage / auto actions** — allowlists; auto actions forced off; human approval.
7. **Token replay / enumeration** — preference DB revocation/expiry; generic 400; rate limits.
8. **Secret logging** — structured ops logs without secret values.

## Out of scope for 21L

Full formal STRIDE workbook, external pen-test, multi-region active-active providers.
