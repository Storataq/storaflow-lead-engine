# Email Sequence Engine (Phase 21D)

Sequence management layer for Storaflow — **no sending, no provider, no live scheduling**.

## Scope

Users can:

- Create and edit sequences (draft)
- Add ordered steps: email, wait, manual task, condition, end
- Assign templates per email step
- Configure delays, conditions, branches, stop rules
- Validate structure and readiness (0–100 score)
- Publish immutable sequence versions
- Preview timing and recipient journeys (mock scenarios)
- Link sequences to campaigns (version locked on approval)
- Duplicate and archive sequences

## Lifecycle

| Status | Meaning |
|--------|---------|
| `draft` | Editable working copy |
| `active` | Published; selectable for approved campaigns |
| `inactive` | Paused / not selectable |
| `archived` | Historical only |
| `deprecated` | View only; not for new campaigns |

Publishing creates an `email_sequence_versions` row and locks email-step template versions.

## Step types

- **email** — template + sender overrides (snapshots on publish)
- **wait** — delay units (minutes, hours, calendar/business days, placeholders for weekday/window)
- **manual_task** — CRM task placeholder (no auto task creation)
- **condition** — field/operator/value + yes/no branch targets
- **end** — explicit exit reason

## Validation & readiness

`validateSequence()` returns blocking/warning/info issues and a readiness score:

- `not_ready` · `needs_work` · `ready_with_warnings` · `ready` · `active`

Checks include structure, templates, branches, unreachable steps, delays, stop rules, and safety limits.

## Campaign integration

- Campaigns may select `sequence_id` (optional; template or sequence required)
- Validation includes sequence status, readiness, and language
- Approval calls `lockSequenceForCampaign()` — sets `sequence_version_id`, name/steps snapshots
- Changing sequence invalidates approval (returns to draft, clears locks)

## Database (manual migration)

**File:** `supabase/migrations/20260726000014_email_sequence_engine.sql`

Run after `000013_campaign_manager.sql`. Extends `email_sequences`, adds:

- `email_sequence_versions`
- `email_sequence_validations`
- `email_sequence_activities`

Extends `email_campaigns` with `sequence_version_id`, `sequence_name_snapshot`, `sequence_steps_snapshot`.

## Routes

| Route | Purpose |
|-------|---------|
| `/email/sequences` | List + dashboard stats |
| `/email/sequences/new` | Create draft |
| `/email/sequences/[id]` | Detail, validation, previews |
| `/email/sequences/[id]/edit` | Step builder |
| `/email/sequences/[id]/versions` | Version history + compare |

## Phase 21E integration points (not implemented)

Future concepts: enrollment, execution state, scheduler, executor, queue jobs.

Suggested interfaces (placeholders in `src/lib/email/future-engine.ts`):

- `SequenceEnrollment`
- `SequenceExecutionState`
- `SequenceScheduler`
- `SequenceExecutor`

## Known limitations

- Sequences are not executed
- Delays and conditions use preview/mock logic only
- No reply detection, tracking, or provider sends
- Holiday calendars and complex graph editors are not implemented
- Published versions cannot be edited in place

## Code map

| Area | Path |
|------|------|
| Constants | `src/lib/email/sequence/constants.ts` |
| Steps model | `src/lib/email/sequence/steps.ts` |
| Validation | `src/lib/email/sequence/validation.ts` |
| Timing preview | `src/lib/email/sequence/timing.ts` |
| Journey preview | `src/lib/email/sequence/journey.ts` |
| Server actions | `src/lib/email/sequence/actions.ts` |
| Queries | `src/lib/email/sequence/queries.ts` |
| UI | `src/components/email/sequences-manager.tsx`, `sequence-editor-form.tsx`, `sequence-flow-preview.tsx` |
