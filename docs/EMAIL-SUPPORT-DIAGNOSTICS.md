# Email Support Diagnostics

Restricted ops tools on `/email/operations` + health endpoints.

Safe support bundle fields (manual):

- App/env mode, feature flags, health summary, queue counts, circuit state, correlation IDs, migration expectation (`00022`), provider configured yes/no

Exclude: secrets, full email/reply bodies, raw tokens, auth cookies, service-role keys.
