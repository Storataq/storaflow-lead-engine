# Campaign Manager

Related: [AUTOMATED-EMAIL-ENGINE.md](./AUTOMATED-EMAIL-ENGINE.md),
[FUNNEL-ACTIVATION.md](./FUNNEL-ACTIVATION.md), [ARCHITECTURE.md](./architecture.md),
[ROADMAP.md](./roadmap.md).

## Status

**Phase 21C — Campaign Manager** (after 21A foundation + 21B templates).

- Campaigns can be created, edited, duplicated, archived, validated, and approved
- Recipient snapshots freeze audience for Ready/Approved campaigns
- **No email sending**
- **No sequence execution**
- **No scheduling / provider integration**

Phase flag: `EMAIL_ENGINE_PHASE = "campaign-manager"`

## Campaign lifecycle

```
Campaign Ready leads
  → Create campaign (Draft)
  → Define audience + template + sender
  → Validate (Needs Review / Ready)
  → Recipient snapshot
  → Approve (owner/admin) → Locked
  → Ready for Sequence (21D) / Scheduler (later)
```

Editable in 21C: `draft`, `needs_review`, `ready`, `approved`, `archived`.  
Statuses `scheduled` / `running` / `completed` exist in schema for later phases but are not auto-set.

## Audience builder

`src/lib/email/campaign/audience-builder.ts`

- Sources: Campaign Ready (default), selected leads/companies, CRM filters
  (priority, owner, source, geography, industry, tags, score ranges)
- Operators: equals, contains, in, between, empty, etc. (AND groups; OR prepared)
- Preview shows matching / valid / missing / invalid / suppressed / duplicate
  with explicit exclusion reasons

## Recipient snapshots

Stored in `email_recipients` with `is_snapshot=true` when Ready/Approved.

Preserves lead/company/contact, preferred email/name, scores, priority, source,
personalization JSON, eligibility, suppression, exclusion reason.

## Eligibility & deduplication

- Suppression always overrides qualification
- Deduplicate by normalized email; keep strongest named/high-confidence recipient
- Statuses: eligible, eligible_with_warning, missing_email, invalid_email,
  suppressed, duplicate, missing_personalization, wrong_language, not_qualified, …

## Template locking

On approval: store `template_version_id` + subject/HTML/text/variables snapshots.
Future template edits do not change approved campaigns.
Return to Draft invalidates approval and unlocks fields.

## Personalization validation

Uses Phase 21B Personalization Engine for recipient sample preview and
template variable/HTML checks during campaign validation.

## Sender profiles

Table `email_sender_profiles` — draft/pending/verified/invalid/disabled.
Domain verification status defaults to `unverified` (not claimed complete).
UI: `/email/settings`

## Validation & readiness score

`validateCampaign` returns issues (info/warning/blocking) and a 0–100 score with
classification: not_ready | needs_work | ready_with_warnings | ready | approved.

Blocking examples: missing template/sender/audience, compliance ack missing,
unsubscribe disabled, broken variables.

## Approval workflow

- Submit for review → `needs_review` + pending approval row
- Approve / reject / changes_required — **owner or admin only**
- Compliance notice: technical readiness only; org remains legally responsible

## Security

- Org resolved server-side via `getActiveOrganization`
- RLS on all new tables via `is_org_member`
- No client-trusted `organization_id`

## Database

**Migration (manual):** `supabase/migrations/20260726000013_campaign_manager.sql`

Apply after `000012`. Extends `email_campaigns` / `email_recipients`; adds
sender profiles, approvals, validations, activities.

## UI routes

| Route | Purpose |
|---|---|
| `/email/campaigns` | List + summary cards |
| `/email/campaigns/new` | Quick create |
| `/email/campaigns/new/wizard` | Guided wizard |
| `/email/campaigns/[id]` | Detail sections |
| `/email/campaigns/[id]/edit` | Edit (unlocked only) |
| `/email/settings` | Sender profiles |

## Sequence integration (21D)

Campaigns support optional `sequence_id`. On approval, `lockSequenceForCampaign()` sets
`sequence_version_id` and step snapshots. See [SEQUENCE-ENGINE.md](./SEQUENCE-ENGINE.md).

## Known limitations

- Audience builder UI is JSON-first (filters form polish later)
- OR groups prepared but default path is AND + Campaign Ready filters
- Provider domain verification not integrated
- No tests framework added (none configured in package.json)
- Tracking / stop-on-reply settings are placeholders only
