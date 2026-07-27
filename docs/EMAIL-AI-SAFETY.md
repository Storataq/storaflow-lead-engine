# Email AI Safety

## Content checks

- Deceptive urgency / fake Re: Fwd:
- Spam-like formatting
- Possible fabricated stats/testimonials
- Preview repeating subject
- Unknown personalization variables (block)

## Compliance

AI cannot bypass preference / unsubscribe / suppression rules from Phase 21I. Generated content still flows through existing template validation and eligibility when applied.

## Automatic actions

`EMAIL_AI_AUTO_ACTIONS_ENABLED` and org `automatic_actions_enabled` cannot enable autonomous send/activate in this phase. Code forces automatic actions off.
