# Email Suppression (Phase 21I)

Reuses `email_suppressions` (no second system). Additive columns add scope, permanence, expiry, evidence, precedence and soft-removal metadata. History is preserved in `email_suppression_history`.

## Precedence (strongest → weakest)

1. Legal restriction  
2. Complaint  
3. Spam trap  
4. Hard bounce  
5. Explicit do-not-contact  
6. Global unsubscribe  
7. Manual admin block  
8. Invalid email  
9. Repeated soft bounce  
10. Category unsubscribe  
11. Campaign unsubscribe  
12. Sequence unsubscribe  
13. Temporary pause  
14. Frequency preference  

Weaker states never override stronger active mandatory suppressions.

## Admin UI

- `/email/suppression` (alias `/email/suppressions`)
- Manual create (owner/admin)
- Remove only for non-mandatory reasons
