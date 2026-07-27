# Email Communication Eligibility (Phase 21I)

Resolver: `resolveEffectiveCommunicationStatus`

Used by:

- Preference center display
- Campaign eligibility (optional `preferenceDecision` input)
- Dispatch-time recheck in the execution worker
- Post-unsubscribe / resubscribe recalculation

## Inputs

Active suppressions, preference row (categories, pause, frequency, DNC), category/campaign/sequence context, message purpose.

## Essential vs promotional

Transactional / essential system / legal purposes remain distinguishable. Unsubscribe blocks promotional/outreach according to scope; mandatory suppressions can still block essential sends when safety requires it (complaint / hard bounce / legal / DNC / invalid).
