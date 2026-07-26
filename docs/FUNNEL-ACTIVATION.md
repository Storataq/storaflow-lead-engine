# Funnel Activation & Campaign Ready (Phase 20D)

Related: [ARCHITECTURE.md](./architecture.md), [ROADMAP.md](./roadmap.md),
[CONTACT-DISCOVERY.md](./CONTACT-DISCOVERY.md), [future-integrations.md](./future-integrations.md).

## Purpose

Bridge scraped/enriched companies into CRM:

```
Search → Job → Scraper → Company → Website Enrichment → Contacts
  → Funnel Activation → Lead → Qualification → Opportunity
  → Pipeline stage (≤ outreach-ready) → Tasks → Campaign Ready
```

**Does not send email.** Campaign Ready prepares recipient records for the
separate Automated Email Engine project.

## Compliance

> Campaign Ready does not equal legal consent. Technical email validation is not
> marketing permission. Users remain responsible for privacy and anti-spam rules.
> Suppression / exclusion records always override scores.

## Activation modes

| Mode | Behavior |
|---|---|
| **Manual** | User starts activation explicitly |
| **Assisted (default)** | UI recommends; confirmation required |
| **Automatic** | Eligible after scrape/enrichment (policy flag; still conservative) |

Configured on `organization_settings` (after migration).

## Orchestrator

`src/lib/crm/funnel-activation/orchestrator.ts` — `runFunnelActivation`

Steps (idempotent):

1. Eligibility (company + exclusions)
2. Contactability
3. Create or reuse open lead (`company_id`)
4. `qualifyLead` (existing engine)
5. `buildOpportunityRecord` (existing engine)
6. Sales priority + campaign readiness
7. Stage placement (`nieuw` / `gekwalificeerd` / `contact-gepland` only)
8. Deal recommend (default) / create only if `auto_deal_mode=automatic`
9. Deduped follow-up tasks (`[Funnel] …`)
10. Upsert `campaign_readiness` + activity timeline

## Pipeline movement ceiling

Automatic movement **stops** at outreach / campaign prep (`contact-gepland`).

Never auto-sets:

- `eerste-email` / Contacted
- Responded
- Won / Lost

## Campaign readiness statuses

`ready`, `ready_with_review`, `needs_contact`, `needs_verification`,
`needs_personalization`, `needs_approval`, `duplicate`, `suppressed`,
`blocked`, `not_qualified`, `not_eligible`, `unknown`.

Approval: `pending_review` | `approved` | `rejected` | …

Suppressed leads cannot be approved.

## Organization settings (migration)

- `funnel_activation_mode` (default `assisted`)
- `qualification_threshold` / `opportunity_threshold`
- `auto_deal_mode` (`never` | `recommend` | `automatic`)
- `auto_create_tasks`
- `allow_role_emails` / `require_named_contact`
- `require_manual_approval`
- `skip_recent_activation_hours`
- `default_funnel_pipeline_id`

## Database

**Migration (manual):** `supabase/migrations/20260726000010_funnel_activation.sql`

Creates:

- extended `organization_settings` columns
- `funnel_activation_runs` (+ RLS)
- `campaign_readiness` (+ RLS)

## UI

| Route | Role |
|---|---|
| `/crm/funnel-activation` | Dashboard + bulk (max 10) |
| `/crm/campaign-ready` | Queue + approve/reject |
| Company detail | Funnel Activation panel |
| Lead detail | Funnel & campaign readiness card |

## Email Engine integration points

`toCampaignRecipientPreview()` exposes:

leadId, companyId, contactId, preferredEmail/name, personalization fields,
scores, priority, owner, approval, suppression, readiness reasons.

Hooks listed in `email-engine-bridge.ts` and `src/lib/email/future-engine.ts`.

## Known limitations

- No email sending / sequences / tracking
- Mailbox deliverability unknown
- Opportunity buying signals remain deterministic
- Automatic mode does not silently process all companies without UI/API call
- Exclusions UI still limited; table is respected when populated
- Deal auto-create disabled by default (`recommend`)

## Recommended tests (no framework today)

1. Company eligibility + suppression override
2. Lead reuse by `company_id`
3. Task title dedupe
4. Stage ceiling (never `eerste-email`)
5. Campaign readiness without email → `needs_contact`
6. Idempotent rerun within skip window
