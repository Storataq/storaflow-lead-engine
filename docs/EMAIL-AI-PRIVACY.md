# Email AI Privacy

## Defaults

- Minimal CRM context on
- Reply content off
- Provider training off
- Store raw provider responses off (`EMAIL_AI_STORE_RAW_RESPONSES=false`)
- Store prompts off by default

## Allowlist

Only fields in `AI_ALLOWED_CONTEXT_FIELDS` may enter the model context. Sensitive patterns (health, politics, religion, race, finances, family, internal notes) are redacted.

## Logging

Structured logs record organization, generation type, model, and status. Do **not** log API keys, full reply bodies, full CRM dumps, or hidden system prompts.
