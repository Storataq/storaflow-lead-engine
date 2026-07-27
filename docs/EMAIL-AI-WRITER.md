# Email AI Writer

Writing assistant for subjects, preview text, bodies, rewrites, follow-ups, and sequence drafts.

## UI

- Template editor: `AIWritingPanel`
- Sequence editor: same panel (use `sequence_draft` / `follow_up_email`)
- History: `/email/ai/history`

## Generation types (writing)

`subject_line`, `preview_text`, `email_body`, `email_rewrite`, `follow_up_email`, `sequence_draft`, `tone_change`, `translation`, `template_improvement`, `breakup_email`, `meeting_follow_up`, `objection_response`, `personalization_suggestion`

## Approval

Statuses: generated → needs_review → approved / rejected → applied_to_draft

Applying to an **active** template is blocked. Draft templates only.

## Variables

Only registered personalization variables (`KNOWN_TEMPLATE_VARIABLES`) are allowed. Unknown `{{vars}}` are blocked by safety validation.

## Brand voice

Configured at `/settings/ai`. Generation uses the org active brand voice summary when present. AI must not invent brand rules beyond configuration.
