# Future integrations — extension points (not implemented)

Storaflow Foundation v0.1 prepares for these modules. **Do not implement them in this phase.**
Use the hooks below when starting a later phase.

## Live scraper / Google Maps / Google Search

- **Hook:** `src/lib/scraping/connectors/` — implement `Connector` interface; register in catalog/registry
- **Job machine:** keep existing `scrape_jobs` statuses and `MockJobExecutor` pattern; introduce a live executor behind a feature flag
- **Constraints:** rate limits, legal public data only, no CAPTCHA bypass, no private networks

## Website crawler / contact discovery (Phase 20C — delivered)

Implemented under `src/lib/enrichment/` (HTTP/HTML only). See
[CONTACT-DISCOVERY.md](./CONTACT-DISCOVERY.md).

Still later: browser rendering provider, external email/phone verification vendors,
mailbox probing (opt-in), address conflict review workflow.

## Email finder & validation

- **Hook:** `src/lib/enrichment/email-validation/` + `providers/types.ts`
- Mailbox status remains `not_checked` until a verification provider is configured
- **Do not** auto-send mail from enrichment

## Campaign / outbound email (foundation delivered)

Architecture lives in `src/lib/email/` with placeholder UI under `/email`.
See [AUTOMATED-EMAIL-ENGINE.md](./AUTOMATED-EMAIL-ENGINE.md).

**Still not implemented:** provider SDKs, workers, send, tracking webhooks.

## Campaign / outbound email / automation (execution)

- **Hook:** new `lib/campaigns/` (or similar) consuming campaign-ready leads from opportunity readiness
- **CRM:** tasks/notes remain the human follow-up layer until automation ships
- **Safety:** explicit user action required for any send; no silent outbound

## Webhooks & public API

- **Hook:** future `app/api/` routes with org-scoped auth; emit events from job completion / deal won
- **Today:** server actions + RLS only

## AI integration

- **Hook:** Executive Summary, lead workspace “AI” placeholders, enrichment copy — all rule-based today
- **Later:** swap summary builders for model calls behind a server-only adapter; keep UI contracts (`ExecutiveSummary`, NBA cards) stable
- **Never** put API keys in client code

## Automated Email Engine (later — not implemented)

Prepared concepts live in `src/lib/email/future-engine.ts`:

- Campaign, Sequence, Template, Recipient, Personalization
- Email Queue, Scheduled Send, Delivery, Bounce, Reply
- Unsubscribe, Stop on Reply, Analytics

Integration points:

- Opportunity outreach readiness → eligibility
- CRM lead/contact → recipients
- Tasks/notes → human override
- Exclusions → never send

**Do not** install providers or add campaign migrations until that phase.

## Background worker

- **Hook:** `worker/` placeholder — claim queued jobs instead of client poll
- Keep the same job status transitions so the Jobs UI stays unchanged
