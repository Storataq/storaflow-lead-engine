# Email Security (Phase 21L)

## Threat model summary

| Threat | Control |
|---|---|
| Cross-org access | Server-side org resolution + RLS |
| Webhook forgery | Svix signature required |
| Public token guessing | Signed/opaque tokens; generic failures |
| Open redirect | Click destinations must be http(s) |
| Internal endpoint abuse | Timing-safe shared secret header |
| Secret exposure | No NEXT_PUBLIC secrets; redacted diagnostics |
| AI auto-send | Hard-disabled |
| Suppression bypass | Dispatch-time eligibility recheck |
| Duplicate send | Idempotency keys + dispatch gates |
| Prompt injection | Untrusted context labeled; structured output validation |

## Residual risks

- In-memory rate limits are not multi-instance
- Open tokens currently lack expiry (HMAC still required)
- Service-role workers bypass RLS by design — must stay server-only
- CSP is foundational headers only (not a full CSP policy)

See [EMAIL-THREAT-MODEL.md](./EMAIL-THREAT-MODEL.md).
