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

**Phase 25D delivered:** visual AI Campaign Builder (`src/lib/email/campaign-builder/`).
See [ai-email-campaign-builder.md](./ai-email-campaign-builder.md).

**Still later:** A/B assignment at enrollment, canvas↔sequence sync on save,
multi-channel send workers (SMS / WhatsApp / LinkedIn / push / in-app) via
`email_campaign_channel_plans`.

## Multi-channel messaging (planned)

- **Hook:** `email_campaign_channel_plans.channel` ∈ email | sms | whatsapp | linkedin | push | in_app
- **Automation:** `FUTURE_CHANNELS` + `channel_plan_json` on `crm_automations`
- Keep email as the only enabled channel until dedicated providers exist
- Workflow blocks can gain channel-specific send nodes without changing the campaign row model

## Campaign / outbound email / automation (execution)

- **Phase 25F delivered:** AI Sales Automation Engine on `crm_automation_events`
  (`src/lib/crm/automation/`). See [ai-sales-automation.md](./ai-sales-automation.md).
- **Still later:** live CRM/email side-effects from executor (today simulated + logged);
  dedicated worker claiming queued runs; delay scheduling
- **CRM:** tasks/notes remain available for human override
- **Safety:** automation enable/run restricted to owner/admin; no silent provider sends until wired

## Webhooks & public API

- **Phase 25I delivered:** Integrations Marketplace webhook tables + incoming route scaffolding
  (`/api/integrations/webhooks/[code]`) with HMAC validation helpers — see
  [integrations-marketplace.md](./integrations-marketplace.md)
- **Still later:** per-provider handlers, outgoing dispatcher, signed public API
- **Automation:** `webhook_ready` / `export_ready` / Slack / Teams action stubs in executor
- **Today:** marketplace + email Resend webhooks; server actions + RLS for app UI

## Integrations Marketplace (Phase 25I — delivered)

- Catalog + plugin registry for CRM/marketing/storage/AI/automation providers
- OAuth 2.0 / refresh / encrypted credential storage / sync engine / audit
- UI: `/integrations` (distinct from scrape `/connectors`)
- Copilot handoffs for HubSpot, Slack, Drive, Calendar
- **Still later:** live provider adapters beyond stubs; scheduled worker claiming queue

## AI integration

- **Hook:** Executive Summary, lead workspace “AI” placeholders, enrichment copy — all rule-based today
- **Phase 25G:** grounded executive summary on `/crm/executive` (`buildGroundedExecutiveSummary`) — facts vs suggestions; not model-generated
- **Phase 25H:** Storaflow AI Copilot (`src/lib/copilot/`) — NL tools + optional LLM enrichment via Phase 21K provider; mutations require `confirmed: true`
- **Phase 25I:** Copilot reads connected marketplace integrations (no tokens) for export/notify/calendar/drive proposals
- **Later:** swap summary builders for model calls behind a server-only adapter; keep UI contracts (`ExecutiveSummary`, NBA cards) stable
- **Never** put API keys in client code
- **Voice / multi-provider:** reserved in Copilot constants (`FUTURE_VOICE_CAPABILITIES`, `FUTURE_AI_PROVIDERS`)

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

- **Hook:** `worker/` placeholder — claim queued scrape jobs and `crm_automation_runs` / outbox events
- **Today:** in-app `processAutomationQueueAction` for manual/dev processing
- Keep the same job status transitions so the Jobs UI stays unchanged
